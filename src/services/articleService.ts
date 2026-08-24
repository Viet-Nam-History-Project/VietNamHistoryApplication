/**
 * Service quản lý Bài viết (Article)
 * Lấy dữ liệu từ Firestore
 */

import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { cachedLoad, getStaticJson } from '@/services/contentCache';

/**
 * Lấy danh sách tất cả bài viết
 * @returns Danh sách Article
 */
export const getArticles = async (forceRefresh = false) => {
  try {
    return cachedLoad<any[]>('articles', async () => {
      const staticData = await getStaticJson<any[]>('articles.json');
      if (staticData?.length) return staticData;
      const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((document) => ({ ...document.data(), id: document.id }));
    }, { ttlMs: 6 * 60 * 60 * 1000, forceRefresh });
  } catch (error) {
    console.error('❌ Lỗi lấy danh sách bài viết:', error);
    throw error;
  }
};

/**
 * Lấy bài viết theo ID
 * @param articleId - ID bài viết
 * @returns Article object hoặc null
 */
export const getArticleById = async (articleId: string) => {
  try {
    if (!articleId) {
      throw new Error('ID bài viết không được để trống');
    }
    const cached = (await getArticles()).find((article) => article.id === articleId);
    if (cached) return cached;

    const docRef = doc(db, 'articles', articleId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        ...docSnap.data(),
        id: docSnap.id,
      };
    }
    return null;
  } catch (error) {
    console.error('❌ Lỗi lấy bài viết theo ID:', error);
    throw error;
  }
};

/**
 * Tìm kiếm bài viết theo từ khóa
 * @param keyword - Từ khóa tìm kiếm
 * @returns Danh sách bài viết phù hợp
 */
export const searchArticles = async (keyword: string) => {
  try {
    if (!keyword.trim()) {
      return [];
    }

    const normalized = keyword.toLocaleLowerCase('vi-VN');
    return (await getArticles()).filter((article) =>
      String(article.title ?? '').toLocaleLowerCase('vi-VN').includes(normalized)
      || String(article.description ?? article.summary ?? '').toLocaleLowerCase('vi-VN').includes(normalized));
  } catch (error) {
    console.error('❌ Lỗi tìm kiếm bài viết:', error);
    throw error;
  }
};
