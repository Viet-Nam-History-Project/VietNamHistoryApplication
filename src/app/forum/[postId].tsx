/**
 * ForumDetailScreen — Chi tiết bài viết + bình luận real-time (Thiết kế Sử đàn)
 * Route: /forum/[postId]
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppHeader, Screen } from '@/components/ui';
import { Fonts, HTML_SHADOWS, SuVietColors, SPACING } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/contexts/GamificationContext';
import { getRankTier } from '@/services/rankService';
import {
  getForumPost,
  toggleLike,
  subscribeToReplies,
  addReply,
  ForumPost,
  ForumReply,
} from '@/services/forumService';
import { ReportPostModal } from '@/components/forum/ReportPostModal';

// ── Helpers ──────────────────────────────────────────────────────────────

function timeAgo(timestamp: { toDate?: () => Date } | Date | null): string {
  if (!timestamp) return '';
  const date = typeof (timestamp as any).toDate === 'function'
    ? (timestamp as any).toDate()
    : timestamp instanceof Date
      ? timestamp
      : new Date();

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
}

// ── Avatar component ─────────────────────────────────────────────────────

function AvatarView({
  uri,
  name,
  size = 40,
}: {
  uri?: string;
  name: string;
  size?: number;
}) {
  const frameSize = size + 4;
  const imgSize = size;
  const radius = frameSize / 2;
  const imgRadius = imgSize / 2;

  return (
    <LinearGradient
      colors={[SuVietColors.dong, SuVietColors.son]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{
        width: frameSize, height: frameSize, borderRadius: radius,
        padding: 2, alignItems: 'center', justifyContent: 'center',
        shadowColor: SuVietColors.son, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: imgSize, height: imgSize, borderRadius: imgRadius, borderWidth: 2, borderColor: SuVietColors.card }}
        />
      ) : (
        <View
          style={{
            width: imgSize, height: imgSize, borderRadius: imgRadius,
            backgroundColor: SuVietColors.dong, alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: SuVietColors.card
          }}
        >
          <Text style={{ color: '#FFF', fontSize: imgSize * 0.4, fontFamily: Fonts.bold }}>
            {getInitials(name)}
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

// ── Component ────────────────────────────────────────────────────────────

export default function ForumDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useGamification();

  const [post, setPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [liking, setLiking] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);

  const inputRef = useRef<TextInput>(null);

  // Fetch post
  useEffect(() => {
    if (!postId) return;
    let active = true;

    (async () => {
      try {
        const data = await getForumPost(postId);
        if (active) {
          setPost(data);
        }
      } catch (err) {
        console.error('Failed to load post:', err);
        Alert.alert('Lỗi', 'Không thể tải bài viết.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [postId]);

  // Real-time replies
  useEffect(() => {
    if (!postId) return;
    const unsubscribe = subscribeToReplies(postId, setReplies);
    return () => unsubscribe();
  }, [postId]);

  // Like toggle
  const handleLike = useCallback(async () => {
    if (!user?.id || !post || liking) return;
    if (!postId) return;

    const wasLiked = post.likes.includes(user.id);
    setPost((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        likes: wasLiked
          ? prev.likes.filter((id) => id !== user.id)
          : [...prev.likes, user.id],
        likeCount: wasLiked
          ? Math.max(0, prev.likeCount - 1)
          : prev.likeCount + 1,
      };
    });

    setLiking(true);
    try {
      await toggleLike(postId, user.id);
    } catch (err) {
      console.error('Like toggle failed:', err);
      setPost((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          likes: wasLiked
            ? [...prev.likes, user.id]
            : prev.likes.filter((id) => id !== user.id),
          likeCount: wasLiked
            ? prev.likeCount + 1
            : Math.max(0, prev.likeCount - 1),
        };
      });
    } finally {
      setLiking(false);
    }
  }, [user?.id, post, liking, postId]);

  // Send reply
  const handleSendReply = useCallback(async () => {
    const text = replyText.trim();
    if (!text || !user?.id || !postId || sending) return;

    setSending(true);
    try {
      await addReply(postId, {
        content: text,
        authorId: user.id,
        authorName: user.name || user.displayName || user.username || 'Ẩn danh',
        authorPhoto: user.avatar || user.photo || '',
        authorRank: profile?.currentRank ?? 'Newcomer',
      });
      setReplyText('');
      setPost((prev) => prev ? { ...prev, replyCount: prev.replyCount + 1 } : prev);
    } catch (err) {
      console.error('Send reply failed:', err);
      Alert.alert('Lỗi', 'Không thể gửi bình luận.');
    } finally {
      setSending(false);
    }
  }, [replyText, user, postId, sending]);

  const isLiked = post && user?.id ? post.likes.includes(user.id) : false;

  // ── Render ─────────────────────────────────────────────────────────────

  const renderReply = ({ item }: { item: ForumReply }) => {
    const isMe = item.authorId === user?.id;
    const authorRank = isMe && profile ? profile.currentRank : item.authorRank;
    const authorName = isMe && user ? (user.name || user.displayName || user.username || 'Ẩn danh') : (item.authorName || 'Ẩn danh');
    const authorPhoto = isMe && user ? (user.avatar || user.photo || '') : item.authorPhoto;

    return (
      <View style={styles.replyRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push(`/user-profile/${item.authorId}` as any)}
        >
          <AvatarView uri={authorPhoto} name={authorName} size={34} />
        </TouchableOpacity>
        <View style={styles.replyBubble}>
          <View style={styles.replyHeader}>
            <TouchableOpacity
              style={styles.nameRow}
              activeOpacity={0.7}
              onPress={() => router.push(`/user-profile/${item.authorId}` as any)}
            >
              <Text style={styles.replyAuthor} numberOfLines={1}>{authorName}</Text>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{authorRank || 'Sĩ Tử'}</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.replyTime}>{timeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.replyContent}>{item.content}</Text>
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    if (!post) return null;

    const isMe = post.authorId === user?.id;
    const authorRank = isMe && profile ? profile.currentRank : post.authorRank;
    const authorName = isMe && user ? (user.name || user.displayName || user.username || 'Ẩn danh') : (post.authorName || 'Ẩn danh');
    const authorPhoto = isMe && user ? (user.avatar || user.photo || '') : post.authorPhoto;

    return (
      <View style={styles.headerContent}>
        {/* Post full content */}
        <View style={styles.postCard}>
          <View style={styles.postBgDecoration} />
          <TouchableOpacity 
            style={styles.authorRow}
            activeOpacity={0.7}
            onPress={() => router.push(`/user-profile/${post.authorId}` as any)}
          >
            <AvatarView uri={authorPhoto} name={authorName} size={44} />
            <View style={styles.authorInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.authorName}>{authorName}</Text>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{authorRank || 'Sĩ Tử'}</Text>
                </View>
              </View>
              <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Báo cáo bài viết"
              style={styles.moreBtn}
              onPress={() => setReportVisible(true)}
            >
              <Ionicons name="ellipsis-vertical" size={16} color={SuVietColors.muc2} />
            </TouchableOpacity>
          </TouchableOpacity>

          <Text style={styles.postTitle}>{post.title}</Text>
          <Text style={styles.postContentFull}>{post.content}</Text>

          {/* Like row */}
          <View style={styles.statsRow}>
            <View style={styles.statsLeft}>
              <TouchableOpacity style={styles.statBtn} onPress={handleLike} disabled={!user?.id}>
                <View style={[styles.statIconWrap, isLiked && styles.statIconWrapActive]}>
                  <Ionicons name="heart" size={16} color={isLiked ? SuVietColors.do : SuVietColors.muc2} />
                </View>
                <Text style={[styles.statTextHighlight, !isLiked && { color: SuVietColors.muc2 }]}>
                  {post.likeCount}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statBtn}>
                <View style={styles.statIconWrapNormal}>
                  <Ionicons name="chatbubble" size={15} color={SuVietColors.muc2} />
                </View>
                <Text style={styles.statTextNormal}>{post.replyCount}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Replies section header */}
        <View style={styles.repliesHeader}>
          <Text style={styles.repliesTitle}>
            Bình luận <Text style={{ color: SuVietColors.do }}>({post?.replyCount ?? replies.length})</Text>
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <Screen style={styles.screen}>
        <AppHeader title="Chi tiết bài viết" showThemeToggle={false} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={SuVietColors.son} />
        </View>
      </Screen>
    );
  }

  if (!post) {
    return (
      <Screen style={styles.screen}>
        <AppHeader title="Chi tiết bài viết" showThemeToggle={false} />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={SuVietColors.muc2} />
          <Text style={styles.errorText}>Bài viết không tồn tại hoặc đã bị xóa.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <LinearGradient
        colors={[SuVietColors.son, SuVietColors.son2]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.headerBar}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#f6e9cf" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết bài viết</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={replies}
          keyExtractor={(item) => item.id}
          renderItem={renderReply}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.noReplies}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={'rgba(42,32,26,0.2)'} />
              <Text style={styles.noRepliesText}>Chưa có bình luận nào.</Text>
            </View>
          }
        />

        {/* Reply input bar */}
        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.inputField}
            placeholder="Viết bình luận..."
            placeholderTextColor={SuVietColors.muc2}
            value={replyText}
            onChangeText={setReplyText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={handleSendReply}
            disabled={!replyText.trim() || sending}
            style={[
              styles.sendBtn,
              replyText.trim() ? styles.sendBtnActive : styles.sendBtnDisabled
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={18} color={replyText.trim() ? "#FFF" : SuVietColors.muc2} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <ReportPostModal
        visible={reportVisible}
        post={post}
        reporter={user}
        onClose={() => setReportVisible(false)}
      />
    </Screen>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { backgroundColor: SuVietColors.giay },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING[6] },
  errorText: { fontFamily: Fonts.regular, fontSize: 16, color: SuVietColors.muc2, textAlign: 'center', marginTop: 16 },

  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    shadowColor: SuVietColors.son, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4, zIndex: 10,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Fonts.serifBold, fontSize: 18, color: '#f6e9cf' },

  listContent: { padding: 16, paddingBottom: 24 },
  headerContent: { gap: 16 },

  // Post Card
  postCard: {
    backgroundColor: SuVietColors.card,
    borderRadius: 22, padding: 20,
    borderWidth: 1, borderColor: SuVietColors.line,
    shadowColor: 'rgba(101,19,16,1)', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 4,
    position: 'relative', overflow: 'hidden',
  },
  postBgDecoration: {
    position: 'absolute', top: 0, right: 0,
    width: 80, height: 80, backgroundColor: SuVietColors.son,
    opacity: 0.04, borderBottomLeftRadius: 80,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  authorInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorName: { fontFamily: Fonts.bold, fontSize: 15, color: SuVietColors.muc },
  rankBadge: {
    backgroundColor: 'rgba(168,130,58,0.1)',
    borderWidth: 1, borderColor: 'rgba(168,130,58,0.2)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12,
  },
  rankText: { fontFamily: Fonts.bold, fontSize: 9, color: SuVietColors.dong, textTransform: 'uppercase', letterSpacing: 0.5 },
  postTime: { fontFamily: Fonts.regular, fontSize: 12, color: SuVietColors.muc2, marginTop: 2 },
  moreBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(101,19,16,0.04)',
    alignItems: 'center', justifyContent: 'center',
  },

  postTitle: { fontFamily: Fonts.serifBold, fontSize: 20, color: SuVietColors.muc, lineHeight: 28, marginBottom: 12 },
  postContentFull: { fontFamily: Fonts.regular, fontSize: 14.5, color: SuVietColors.muc, lineHeight: 24, marginBottom: 16 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 16, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: SuVietColors.line,
  },
  statsLeft: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  statBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statIconWrap: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(101,19,16,0.04)',
    alignItems: 'center', justifyContent: 'center',
  },
  statIconWrapActive: { backgroundColor: '#f7e6e4' },
  statIconWrapNormal: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(101,19,16,0.04)',
    alignItems: 'center', justifyContent: 'center',
  },
  statTextHighlight: { fontFamily: Fonts.semibold, fontSize: 14, color: SuVietColors.do },
  statTextNormal: { fontFamily: Fonts.semibold, fontSize: 14, color: SuVietColors.muc2 },

  // Replies
  repliesHeader: { marginTop: 8, paddingHorizontal: 4 },
  repliesTitle: { fontFamily: Fonts.serifBold, fontSize: 18, color: SuVietColors.muc },
  
  noReplies: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  noRepliesText: { fontFamily: Fonts.regular, fontSize: 14, color: SuVietColors.muc2 },

  replyRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  replyBubble: {
    flex: 1, backgroundColor: SuVietColors.card,
    borderWidth: 1, borderColor: SuVietColors.line,
    borderRadius: 18, borderTopLeftRadius: 4, padding: 14,
  },
  replyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  replyAuthor: { fontFamily: Fonts.bold, fontSize: 14, color: SuVietColors.muc },
  replyTime: { fontFamily: Fonts.regular, fontSize: 11, color: SuVietColors.muc2 },
  replyContent: { fontFamily: Fonts.regular, fontSize: 14, color: SuVietColors.muc, lineHeight: 20 },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: SuVietColors.card,
    borderTopWidth: 1, borderTopColor: SuVietColors.line,
  },
  inputField: {
    flex: 1,
    backgroundColor: SuVietColors.giay,
    borderWidth: 1, borderColor: SuVietColors.line,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    paddingTop: 12, // For iOS multiline
    fontFamily: Fonts.regular, fontSize: 14, color: SuVietColors.muc,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnActive: { backgroundColor: SuVietColors.son },
  sendBtnDisabled: { backgroundColor: 'rgba(101,19,16,0.08)' },
});
