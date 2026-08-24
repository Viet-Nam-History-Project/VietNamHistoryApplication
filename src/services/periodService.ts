/**
 * Service quản lý Thời kỳ (Period)
 * Collection Firestore: "periods"
 * Document ID = slug (e.g. "buoi-dau-dung-nuoc-va-giu-nuoc")
 *
 * Firestore fields thực tế:
 *   title, summary, description, coverMediaRef,
 *   startDate (ISO string), endDate (ISO string),
 *   sortOrder, status, slug
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
import { Period } from '@/models/Period';
import { cachedLoad, getStaticJson } from '@/services/contentCache';

/**
 * Lấy danh sách tất cả thời kỳ, sắp xếp theo sortOrder
 */
export const getPeriods = async (forceRefresh = false): Promise<Period[]> => {
  try {
    return cachedLoad('periods', async () => {
      const staticData = await getStaticJson<Period[]>('periods.json');
      if (staticData?.length) return staticData;
      const q = query(collection(db, 'periods'), orderBy('sortOrder', 'asc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((d) => ({ ...d.data(), id: d.id, slug: d.id } as Period));
    }, { ttlMs: 6 * 60 * 60 * 1000, forceRefresh });
  } catch (error) {
    console.error('❌ Lỗi lấy danh sách thời kỳ:', error);
    throw error;
  }
};

/**
 * Lấy thời kỳ theo slug (slug = document ID)
 */
export const getPeriodBySlug = async (slug: string): Promise<Period | null> => {
  return getPeriodById(slug);
};

/**
 * Lấy thời kỳ theo ID (= slug, dùng getDoc trực tiếp)
 */
export const getPeriodById = async (id: string): Promise<Period | null> => {
  try {
    if (!id) throw new Error('ID không được để trống');
    const periods = await getPeriods();
    const cached = periods.find((period) => period.id === id || period.slug === id);
    if (cached) return cached;

    const docRef = doc(db, 'periods', id);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      console.warn(`⚠️ Không tìm thấy thời kỳ với ID: ${id}`);
      return null;
    }

    return {
      ...snap.data(),
      id: snap.id,
      slug: snap.id,
    } as Period;
  } catch (error) {
    console.error('❌ Lỗi lấy thời kỳ theo ID:', error);
    throw error;
  }
};
