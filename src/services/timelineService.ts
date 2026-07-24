/**
 * Service quản lý Dòng thời gian (Timeline)
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

async function getAllTimelines(): Promise<any[]> {
  return cachedLoad('timelines:all', async () => {
    const staticData = await getStaticJson<any[]>('timelines.json');
    if (staticData) return staticData;
    const snapshot = await getDocs(query(collection(db, 'timelines'), orderBy('year', 'asc')));
    return snapshot.docs.map((document) => ({ ...document.data(), id: document.id }));
  }, { ttlMs: 6 * 60 * 60 * 1000 });
}

/**
 * Lấy danh sách tất cả timeline
 * @returns Danh sách Timeline
 */
export const getTimelines = async () => {
  try {
    return getAllTimelines();
  } catch (error) {
    console.error('❌ Lỗi lấy danh sách timeline:', error);
    throw error;
  }
};

/**
 * Lấy timeline theo ID
 * @param timelineId - ID timeline
 * @returns Timeline object hoặc null
 */
export const getTimelineById = async (timelineId: string) => {
  try {
    if (!timelineId) {
      throw new Error('ID timeline không được để trống');
    }

    const cached = (await getAllTimelines()).find((timeline) => timeline.id === timelineId);
    if (cached) return cached;
    const docSnap = await getDoc(doc(db, 'timelines', timelineId));

    if (docSnap.exists()) {
      return {
        ...docSnap.data(),
        id: docSnap.id,
      };
    }
    return null;
  } catch (error) {
    console.error('❌ Lỗi lấy timeline theo ID:', error);
    throw error;
  }
};

/**
 * Lấy timeline theo giai đoạn lịch sử
 * @param periodId - ID thời kỳ
 * @returns Danh sách timeline trong thời kỳ đó
 */
export const getTimelinesByPeriod = async (periodId: string) => {
  try {
    if (!periodId) {
      throw new Error('ID thời kỳ không được để trống');
    }

    return (await getAllTimelines()).filter((timeline) => timeline.periodId === periodId);
  } catch (error) {
    console.error('❌ Lỗi lấy timeline theo giai đoạn:', error);
    throw error;
  }
};

/**
 * Lấy timeline theo năm
 * @param year - Năm cần tìm
 * @returns Danh sách timeline trong năm đó
 */
export const getTimelinesByYear = async (year: number) => {
  try {
    if (!year) {
      throw new Error('Năm không được để trống');
    }

    return (await getAllTimelines()).filter((timeline) => Number(timeline.year) === year);
  } catch (error) {
    console.error('❌ Lỗi lấy timeline theo năm:', error);
    throw error;
  }
};

/**
 * Tìm kiếm timeline theo từ khóa
 * @param keyword - Từ khóa tìm kiếm
 * @returns Danh sách timeline phù hợp
 */
export const searchTimelines = async (keyword: string) => {
  try {
    if (!keyword.trim()) {
      return [];
    }

    const timelines: any[] = [];
    (await getAllTimelines()).forEach((data) => {
      if (
        data.title?.toLowerCase().includes(keyword.toLowerCase()) ||
        data.description?.toLowerCase().includes(keyword.toLowerCase())
      ) {
        timelines.push(data);
      }
    });

    return timelines;
  } catch (error) {
    console.error('❌ Lỗi tìm kiếm timeline:', error);
    throw error;
  }
};
