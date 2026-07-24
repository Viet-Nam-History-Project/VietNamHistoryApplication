/**
 * Service Khám phá
 * Firestore: explore/{slug}
 */

import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { cachedLoad, getStaticJson } from '@/services/contentCache';

export interface ExploreItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverMediaRef: string;
  sortOrder: number;
}

export const getExploreItems = async (forceRefresh = false): Promise<ExploreItem[]> => {
  try {
    return cachedLoad('explore', async () => {
      const staticData = await getStaticJson<ExploreItem[]>('explore.json');
      if (staticData) return staticData;
      const q = query(collection(db, 'explore'), orderBy('sortOrder', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ ...d.data(), id: d.id, slug: d.id } as ExploreItem));
    }, { ttlMs: 6 * 60 * 60 * 1000, forceRefresh });
  } catch (e) {
    console.error('❌ Lỗi getExploreItems:', e);
    throw e;
  }
};
