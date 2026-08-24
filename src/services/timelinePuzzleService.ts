/**
 * Service cho Timeline Puzzle game.
 * Firestore: games/timelinepuzzle/eras/{eraId}
 *
 * Ho tro ca schema React Native moi (title/description/coverMediaRef)
 * va schema Java/export JSON (name/shortDesc/thumbnailUrl).
 */

import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { Era, TimelineEvent } from '@/models/Era';
import { cachedLoad, getStaticJson } from '@/services/contentCache';

const normalizeEvents = (rawEvents: unknown): TimelineEvent[] => {
  if (!Array.isArray(rawEvents)) return [];

  return rawEvents.map((e: Record<string, unknown>) => ({
    name: String(e.name ?? ''),
    year: Number(e.year ?? 0),
    desc: e.desc ? String(e.desc) : undefined,
    order: Number(e.order ?? 0),
    zone: e.zone ? String(e.zone) : undefined,
  }));
};

const normalizeEra = (id: string, data: Record<string, unknown>): Era => {
  const title = String(data.title ?? data.name ?? '');
  const description = data.description ?? data.shortDesc;
  const coverMediaRef = data.coverMediaRef ?? data.thumbnailUrl;

  return {
    eraId: String(data.eraId ?? id),
    title,
    name: data.name ? String(data.name) : title,
    coverMediaRef: coverMediaRef ? String(coverMediaRef) : undefined,
    thumbnailUrl: data.thumbnailUrl ? String(data.thumbnailUrl) : undefined,
    description: description ? String(description) : undefined,
    shortDesc: data.shortDesc ? String(data.shortDesc) : undefined,
    sortOrder: data.sortOrder != null ? Number(data.sortOrder) : undefined,
    events: normalizeEvents(data.events),
  };
};

export const getTimelineEras = async (): Promise<Era[]> => {
  try {
    return cachedLoad('timeline-eras', async () => {
      const staticData = await getStaticJson<Record<string, unknown>[]>('games/timeline-eras.json');
      if (staticData?.length) return staticData.map((data) => normalizeEra(String(data.id ?? data.slug ?? ''), data));
      const snap = await getDocs(collection(db, 'games', 'timelinepuzzle', 'eras'));
      return snap.docs.map((d) => normalizeEra(d.id, d.data() as Record<string, unknown>));
    }, { ttlMs: 6 * 60 * 60 * 1000 }).then((eras) => eras.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.title.localeCompare(b.title)));
  } catch (e) {
    console.error('Loi getTimelineEras:', e);
    throw e;
  }
};

export const getEraById = async (eraId: string): Promise<Era | null> => {
  try {
    const cached = (await getTimelineEras()).find((era) => era.eraId === eraId);
    if (cached) return cached;
    const snap = await getDoc(doc(db, 'games', 'timelinepuzzle', 'eras', eraId));
    if (!snap.exists()) return null;
    return normalizeEra(snap.id, snap.data() as Record<string, unknown>);
  } catch (e) {
    console.error('Loi getEraById:', e);
    throw e;
  }
};
