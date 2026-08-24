/**
 * Service quản lý Sự kiện (Event)
 * Lấy dữ liệu từ Firestore
 */

import {
  collection,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { Event } from '@/models/Event';
import { cachedLoad, getStaticJson } from '@/services/contentCache';

async function getAllEvents(): Promise<Event[]> {
  return cachedLoad('events:all', async () => {
    const staticData = await getStaticJson<Event[]>('events.json');
    if (staticData?.length) return staticData;
    const snapshot = await getDocs(collection(db, 'events'));
    return snapshot.docs.map((document) => ({ ...document.data(), id: document.id } as Event));
  }, { ttlMs: 6 * 60 * 60 * 1000 });
}

/**
 * Lấy danh sách sự kiện theo giai đoạn
 * @param stageId - ID giai đoạn
 * @returns Danh sách Event
 */
export const getEventsByStage = async (stageId: string): Promise<Event[]> => {
  try {
    if (!stageId) {
      throw new Error('ID giai đoạn không được để trống');
    }

    return (await getAllEvents()).filter((event) => {
      const legacy = event as Event & { stageId?: string };
      return legacy.stageId === stageId || event.stageSlug === stageId;
    });
  } catch (error) {
    console.error('❌ Lỗi lấy danh sách sự kiện theo giai đoạn:', error);
    throw error;
  }
};

/**
 * Lấy sự kiện theo ID
 * @param id - Document ID
 * @returns Event object hoặc null nếu không tìm thấy
 */
export const getEventById = async (id: string): Promise<Event | null> => {
  try {
    if (!id) {
      throw new Error('ID không được để trống');
    }

    const cached = (await getAllEvents()).find((event) => event.id === id);
    if (cached) return cached;
    const docSnapshot = await getDoc(doc(db, 'events', id));

    if (!docSnapshot.exists()) {
      console.warn(`⚠️ Không tìm thấy sự kiện với ID: ${id}`);
      return null;
    }

    return {
      ...docSnapshot.data(),
      id: docSnapshot.id,
    } as Event;
  } catch (error) {
    console.error('❌ Lỗi lấy sự kiện theo ID:', error);
    throw error;
  }
};

/**
 * Lấy danh sách sự kiện theo thời kỳ
 * @param periodId - ID thời kỳ
 * @returns Danh sách Event
 */
export const getEventsByPeriod = async (periodId: string): Promise<Event[]> => {
  try {
    if (!periodId) {
      throw new Error('ID thời kỳ không được để trống');
    }

    return (await getAllEvents()).filter((event) => {
      const legacy = event as Event & { periodId?: string };
      return legacy.periodId === periodId || event.periodSlug === periodId;
    });
  } catch (error) {
    console.error('❌ Lỗi lấy danh sách sự kiện theo thời kỳ:', error);
    throw error;
  }
};
