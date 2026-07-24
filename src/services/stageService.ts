/**
 * Service quản lý Giai đoạn (Stage)
 * Lấy dữ liệu từ subcollection Firestore:
 *   periods/{periodSlug}/stages
 *   periods/{periodSlug}/stages/{stageSlug}/events
 */

import {
  collection,
  orderBy,
  query,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { Stage } from '@/models/Stage';
import { Event } from '@/models/Event';
import { cachedLoad, getStaticJson } from '@/services/contentCache';

/**
 * Lấy danh sách giai đoạn của một thời kỳ (subcollection)
 * @param periodSlug - slug / document ID của period
 */
export const getStagesByPeriod = async (periodSlug: string): Promise<Stage[]> => {
  try {
    if (!periodSlug) throw new Error('periodSlug không được để trống');
    return cachedLoad(`stages:${periodSlug}`, async () => {
      const staticData = await getStaticJson<Stage[]>(`periods/${periodSlug}/stages.json`);
      if (staticData) return staticData;
      const q = query(collection(db, 'periods', periodSlug, 'stages'), orderBy('sortOrder', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ ...d.data(), id: d.id, periodSlug } as Stage));
    }, { ttlMs: 6 * 60 * 60 * 1000 });
  } catch (error) {
    console.error('❌ Lỗi lấy danh sách giai đoạn:', error);
    throw error;
  }
};

/**
 * Lấy chi tiết một giai đoạn
 * @param periodSlug - slug của period
 * @param stageSlug  - slug của stage
 */
export const getStageById = async (
  periodSlug: string,
  stageSlug: string,
): Promise<Stage | null> => {
  try {
    const stages = await getStagesByPeriod(periodSlug);
    const cached = stages.find((stage) => stage.id === stageSlug);
    if (cached) return cached;
    const docRef = doc(db, 'periods', periodSlug, 'stages', stageSlug);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      console.warn(`⚠️ Stage ${stageSlug} không tồn tại`);
      return null;
    }

    return { ...snap.data(), id: snap.id, periodSlug } as Stage;
  } catch (error) {
    console.error('❌ Lỗi lấy giai đoạn:', error);
    throw error;
  }
};

/**
 * Lấy danh sách sự kiện của một giai đoạn (subcollection)
 * @param periodSlug - slug của period
 * @param stageSlug  - slug của stage
 */
export const getEventsByStage = async (
  periodSlug: string,
  stageSlug: string,
): Promise<Event[]> => {
  try {
    return cachedLoad(`events:${periodSlug}:${stageSlug}`, async () => {
      const staticData = await getStaticJson<Event[]>(`periods/${periodSlug}/stages/${stageSlug}/events.json`);
      if (staticData) return staticData;
      const q = query(collection(db, 'periods', periodSlug, 'stages', stageSlug, 'events'), orderBy('sortOrder', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ ...d.data(), id: d.id, periodSlug, stageSlug } as Event));
    }, { ttlMs: 6 * 60 * 60 * 1000 });
  } catch (error) {
    console.error('❌ Lỗi lấy sự kiện:', error);
    throw error;
  }
};
