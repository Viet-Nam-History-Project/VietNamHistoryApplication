/**
 * Forum Service — Tất cả Firestore operations cho tính năng Diễn đàn
 *
 * Bao gồm:
 * - Lấy danh sách bài viết (phân trang)
 * - Lấy chi tiết bài viết
 * - Toggle like (transaction)
 * - Real-time replies (onSnapshot)
 * - Thêm bình luận (batch write)
 * - Tạo bài viết mới
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  runTransaction,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  increment,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/services/firebase';

// ── Types ────────────────────────────────────────────────────────────────

/** Dữ liệu 1 bài viết trên Firestore */
export interface ForumPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  authorRank: string;
  likeCount: number;
  likes: string[];
  replyCount: number;
  createdAt: Timestamp;
  postId: null;
}

/** Dữ liệu 1 bình luận (reply) trên Firestore */
export interface ForumReply {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  authorRank: string;
  createdAt: Timestamp;
}

/** Dữ liệu gửi lên khi tạo bài viết mới */
export interface CreatePostInput {
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  authorRank: string;
}

/** Dữ liệu gửi lên khi thêm bình luận */
export interface AddReplyInput {
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  authorRank: string;
}

export const FORUM_REPORT_REASONS = [
  { code: 'spam', label: 'Spam hoặc quảng cáo' },
  { code: 'harassment', label: 'Quấy rối hoặc xúc phạm' },
  { code: 'hate_speech', label: 'Ngôn từ thù ghét' },
  { code: 'historical_misinformation', label: 'Thông tin lịch sử sai lệch' },
  { code: 'inappropriate_content', label: 'Nội dung không phù hợp' },
  { code: 'impersonation', label: 'Mạo danh người khác' },
  { code: 'other', label: 'Vi phạm khác' },
] as const;

export type ForumReportReasonCode = typeof FORUM_REPORT_REASONS[number]['code'];

export interface CreateForumReportInput {
  post: ForumPost;
  reporterId: string;
  reporterName: string;
  reporterEmail?: string;
  reasonCode: ForumReportReasonCode;
  description: string;
}

/** Kết quả phân trang bài viết */
export interface ForumPostsResult {
  posts: ForumPost[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Parse 1 Firestore document thành ForumPost.
 */
function parsePost(doc: QueryDocumentSnapshot<DocumentData>): ForumPost {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title ?? '',
    content: data.content ?? '',
    authorId: data.authorId ?? '',
    authorName: data.authorName ?? '',
    authorPhoto: data.authorPhoto ?? '',
    authorRank: typeof data.authorRank === 'string' ? data.authorRank : 'Newcomer',
    likeCount: typeof data.likeCount === 'number' ? data.likeCount : 0,
    likes: Array.isArray(data.likes) ? data.likes : [],
    replyCount: typeof data.replyCount === 'number' ? data.replyCount : 0,
    createdAt: data.createdAt ?? Timestamp.now(),
    postId: null,
  };
}

// ── API ──────────────────────────────────────────────────────────────────

/**
 * Lấy danh sách bài viết từ collection `forum`, phân trang.
 *
 * @param limitCount - Số bài tối đa mỗi trang (mặc định 20)
 * @param startAfterDoc - Document cuối cùng của trang trước (dùng cho pagination)
 * @returns Object chứa mảng posts, document cuối cùng, và flag hasMore
 */
export async function getForumPosts(
  limitCount = 20,
  startAfterDoc?: QueryDocumentSnapshot<DocumentData> | null,
  sortBy: 'newest' | 'popular' | 'oldest' = 'newest'
): Promise<ForumPostsResult> {
  const forumRef = collection(db, 'forum');

  let orderField = 'createdAt';
  let orderDirection: 'asc' | 'desc' = 'desc';

  if (sortBy === 'oldest') {
    orderField = 'createdAt';
    orderDirection = 'asc';
  } else if (sortBy === 'popular') {
    orderField = 'likeCount';
    orderDirection = 'desc';
  }

  // Rules chỉ cho phép đọc bài công khai. Điều kiện này phải nằm trong query
  // (không chỉ lọc ở client), nếu không Firestore sẽ từ chối toàn bộ query vì
  // nó có thể trả về cả bài đã bị moderator ẩn.
  const constraints = [where('isHidden', '==', false), orderBy(orderField, orderDirection)];
  const q = startAfterDoc
    ? query(forumRef, ...constraints, startAfter(startAfterDoc), limit(limitCount + 1))
    : query(forumRef, ...constraints, limit(limitCount + 1));

  const snap = await getDocs(q);
  const allDocs = snap.docs;
  const hasMore = allDocs.length > limitCount;
  const docs = hasMore ? allDocs.slice(0, limitCount) : allDocs;
  const visibleDocs = docs.filter((item) => item.data().isHidden !== true);
  const posts = visibleDocs.map(parsePost);
  const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

  return { posts, lastDoc, hasMore };
}

/**
 * Lấy chi tiết 1 bài viết theo ID.
 *
 * @param postId - ID document trong collection `forum`
 * @returns ForumPost hoặc null nếu không tồn tại
 */
export async function getForumPost(postId: string): Promise<ForumPost | null> {
  const snap = await getDoc(doc(db, 'forum', postId));
  if (!snap.exists()) return null;

  const data = snap.data();
  if (data.isHidden === true) return null;
  return {
    id: snap.id,
    title: data.title ?? '',
    content: data.content ?? '',
    authorId: data.authorId ?? '',
    authorName: data.authorName ?? '',
    authorPhoto: data.authorPhoto ?? '',
    authorRank: typeof data.authorRank === 'string' ? data.authorRank : 'Newcomer',
    likeCount: typeof data.likeCount === 'number' ? data.likeCount : 0,
    likes: Array.isArray(data.likes) ? data.likes : [],
    replyCount: typeof data.replyCount === 'number' ? data.replyCount : 0,
    createdAt: data.createdAt ?? Timestamp.now(),
    postId: null,
  };
}

/**
 * Toggle like cho 1 bài viết (dùng Firestore transaction).
 *
 * Nếu userId đã có trong likes[] → bỏ like (remove + giảm likeCount).
 * Nếu userId chưa có → thêm like (add + tăng likeCount).
 *
 * @param postId - ID bài viết
 * @param userId - ID người dùng hiện tại
 * @returns `true` nếu đã like, `false` nếu đã bỏ like
 */
export async function toggleLike(postId: string, userId: string): Promise<boolean> {
  const postRef = doc(db, 'forum', postId);

  return runTransaction(db, async (transaction) => {
    const postSnap = await transaction.get(postRef);
    if (!postSnap.exists()) {
      throw new Error('Bài viết không tồn tại');
    }

    const data = postSnap.data();
    const likes: string[] = Array.isArray(data.likes) ? data.likes : [];
    const alreadyLiked = likes.includes(userId);

    if (alreadyLiked) {
      // Bỏ like
      transaction.update(postRef, {
        likes: likes.filter((id) => id !== userId),
        likeCount: Math.max(0, (data.likeCount ?? 1) - 1),
      });
      return false;
    } else {
      // Thêm like
      transaction.update(postRef, {
        likes: [...likes, userId],
        likeCount: (data.likeCount ?? 0) + 1,
      });
      return true;
    }
  });
}

/**
 * Đăng ký lắng nghe real-time replies cho 1 bài viết (onSnapshot).
 *
 * Replies được sắp xếp theo `createdAt` tăng dần.
 *
 * @param postId - ID bài viết
 * @param callback - Hàm callback nhận mảng ForumReply mỗi khi có thay đổi
 * @returns Hàm unsubscribe để huỷ lắng nghe
 */
export function subscribeToReplies(
  postId: string,
  callback: (replies: ForumReply[]) => void,
  limitCount = 50,
): Unsubscribe {
  const repliesRef = collection(db, 'forum', postId, 'replies');
  const q = query(repliesRef, orderBy('createdAt', 'desc'), limit(Math.min(100, Math.max(10, limitCount))));

  return onSnapshot(q, (snap) => {
    const replies: ForumReply[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        content: data.content ?? '',
        authorId: data.authorId ?? '',
        authorName: data.authorName ?? '',
        authorPhoto: data.authorPhoto ?? '',
        authorRank: typeof data.authorRank === 'string' ? data.authorRank : 'Newcomer',
        createdAt: data.createdAt ?? Timestamp.now(),
      };
    });
    callback(replies.reverse());
  });
}

/**
 * Thêm 1 bình luận vào bài viết (batch write).
 *
 * Batch gồm 2 thao tác:
 * 1. Thêm document vào subcollection `forum/{postId}/replies`
 * 2. Tăng `replyCount` của bài viết lên 1
 *
 * @param postId - ID bài viết
 * @param input - Dữ liệu bình luận
 */
export async function addReply(postId: string, input: AddReplyInput): Promise<void> {
  const batch = writeBatch(db);

  const replyRef = doc(collection(db, 'forum', postId, 'replies'));
  batch.set(replyRef, {
    content: input.content,
    authorId: input.authorId,
    authorName: input.authorName,
    authorPhoto: input.authorPhoto,
    authorRank: input.authorRank,
    createdAt: serverTimestamp(),
  });

  const postRef = doc(db, 'forum', postId);
  batch.update(postRef, {
    replyCount: increment(1),
  });

  await batch.commit();
}

/**
 * Tạo bài viết mới trong collection `forum`.
 *
 * Tự động set: likeCount=0, likes=[], replyCount=0, postId=null,
 * createdAt=serverTimestamp().
 *
 * @param input - Dữ liệu bài viết (title, content, author info)
 * @returns ID của document vừa tạo
 */
export async function createPost(input: CreatePostInput): Promise<string> {
  const docRef = await addDoc(collection(db, 'forum'), {
    title: input.title,
    content: input.content,
    authorId: input.authorId,
    authorName: input.authorName,
    authorPhoto: input.authorPhoto,
    authorRank: input.authorRank,
    likeCount: 0,
    likes: [],
    replyCount: 0,
    isHidden: false,
    postId: null,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Gửi báo cáo vi phạm cho một bài viết.
 * Báo cáo nằm dưới bài viết để admin có thể truy vết và xử lý đúng nội dung.
 */
export async function createForumReport(input: CreateForumReportInput): Promise<string> {
  const reason = FORUM_REPORT_REASONS.find((item) => item.code === input.reasonCode);
  if (!reason) throw new Error('Lý do báo cáo không hợp lệ');

  const reportRef = await addDoc(collection(db, 'forum_reports'), {
    targetType: 'post',
    postId: input.post.id,
    postPath: `forum/${input.post.id}`,
    postTitle: input.post.title,
    postContentSnapshot: input.post.content,
    reportedUserId: input.post.authorId,
    reportedUserName: input.post.authorName,
    reporterId: input.reporterId,
    reporterName: input.reporterName,
    reporterEmail: input.reporterEmail ?? '',
    reasonCode: input.reasonCode,
    reasonLabel: reason.label,
    description: input.description.trim(),
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return reportRef.id;
}
