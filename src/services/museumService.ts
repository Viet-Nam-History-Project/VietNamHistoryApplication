/**
 * Service quản lý Bảo tàng (Museum)
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
 * Lấy danh sách tất cả bảo tàng
 * @returns Danh sách Museum
 */
export const getMuseums = async (forceRefresh = false) => {
  try {
    return cachedLoad<any[]>('museums', async () => {
      const staticData = await getStaticJson<any[]>('museums.json');
      if (staticData?.length) return staticData;
      const q = query(collection(db, 'museums'), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((document) => ({ ...document.data(), id: document.id }));
    }, { ttlMs: 6 * 60 * 60 * 1000, forceRefresh });
  } catch (error) {
    console.error('❌ Lỗi lấy danh sách bảo tàng:', error);
    throw error;
  }
};

/**
 * Lấy bảo tàng theo ID
 * @param museumId - ID bảo tàng
 * @returns Museum object hoặc null
 */
export const getMuseumById = async (museumId: string) => {
  try {
    if (!museumId) {
      throw new Error('ID bảo tàng không được để trống');
    }
    const cached = (await getMuseums()).find((museum) => museum.id === museumId);
    if (cached) return cached;

    const docRef = doc(db, 'museums', museumId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        ...docSnap.data(),
        id: docSnap.id,
      };
    }
    return null;
  } catch (error) {
    console.error('❌ Lỗi lấy bảo tàng theo ID:', error);
    throw error;
  }
};

/**
 * Lấy danh sách bảo tàng theo khu vực
 * @param region - Khu vực
 * @returns Danh sách bảo tàng ở khu vực đó
 */
export const getMuseumsByRegion = async (region: string) => {
  try {
    if (!region) {
      throw new Error('Khu vực không được để trống');
    }

    return (await getMuseums()).filter((museum) => museum.region === region);
  } catch (error) {
    console.error('❌ Lỗi lấy bảo tàng theo khu vực:', error);
    throw error;
  }
};

/**
 * Tìm kiếm bảo tàng theo từ khóa
 * @param keyword - Từ khóa tìm kiếm
 * @returns Danh sách bảo tàng phù hợp
 */
export const searchMuseums = async (keyword: string) => {
  try {
    if (!keyword.trim()) {
      return [];
    }

    const normalized = keyword.toLocaleLowerCase('vi-VN');
    return (await getMuseums()).filter((museum) =>
      String(museum.name ?? '').toLocaleLowerCase('vi-VN').includes(normalized)
      || String(museum.description ?? '').toLocaleLowerCase('vi-VN').includes(normalized));
  } catch (error) {
    console.error('❌ Lỗi tìm kiếm bảo tàng:', error);
    throw error;
  }
};
