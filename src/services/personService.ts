/**
 * Service nhân vật lịch sử
 * Firestore paths:
 *   periods_person                           — list of person periods
 *   periods_person/{slug}/persons            — list of persons
 *   periods_person/{slug}/persons/{slug}     — person detail
 *   periods_person/{slug}/persons/{slug}/events/{slug} — person events
 */

import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { PersonPeriodItem, PersonListItem, PersonDetail, PersonEvent } from '@/models/Person';
import { cachedLoad, getStaticJson } from '@/services/contentCache';

function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;

  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
  }

  return undefined;
}

/** Lấy danh sách thời kỳ nhân vật (tab Person) */
export const getPersonPeriods = async (): Promise<PersonPeriodItem[]> => {
  try {
    return cachedLoad('person-periods', async () => {
      const staticData = await getStaticJson<PersonPeriodItem[]>('persons/periods.json');
      if (staticData) return staticData.filter((item) => item.status === 'published');
      const q = query(collection(db, 'periods_person'), orderBy('sortOrder', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.filter((d) => d.data().status === 'published').map((d) => {
        const data = d.data();
        return { id: d.id, slug: d.id, ...data, startDate: toIso(data.startDate), endDate: toIso(data.endDate) } as PersonPeriodItem;
      });
    }, { ttlMs: 6 * 60 * 60 * 1000 });
  } catch (e) {
    console.error('❌ Lỗi getPersonPeriods:', e);
    throw e;
  }
};

/** Lấy danh sách nhân vật trong một thời kỳ */
export const getPersonsByPeriod = async (periodSlug: string): Promise<PersonListItem[]> => {
  try {
    return cachedLoad(`persons:${periodSlug}`, async () => {
      const staticData = await getStaticJson<PersonListItem[]>(`persons/${periodSlug}/index.json`);
      if (staticData) return staticData.filter((item) => item.status === 'published');
      const periodSnap = await getDoc(doc(db, 'periods_person', periodSlug));
      if (!periodSnap.exists() || periodSnap.data().status !== 'published') return [];
      const q = query(collection(db, 'periods_person', periodSlug, 'persons'), orderBy('sortOrder', 'asc'));
      const snap = await getDocs(q);
      return snap.docs
        .filter((d) => d.data().status === 'published')
        .map((d) => ({ ...d.data(), id: d.id, slug: d.id } as PersonListItem));
    }, { ttlMs: 6 * 60 * 60 * 1000 });
  } catch (e) {
    console.error('❌ Lỗi getPersonsByPeriod:', e);
    throw e;
  }
};

/** Lấy chi tiết một nhân vật */
export const getPersonDetail = async (
  periodSlug: string,
  personSlug: string,
): Promise<PersonDetail | null> => {
  try {
    const staticData = await getStaticJson<PersonDetail>(`persons/${periodSlug}/${personSlug}.json`);
    if (staticData) return staticData.status === 'published' ? staticData : null;
    const [periodSnap, snap] = await Promise.all([
      getDoc(doc(db, 'periods_person', periodSlug)),
      getDoc(doc(db, 'periods_person', periodSlug, 'persons', personSlug)),
    ]);
    if (!periodSnap.exists() || periodSnap.data().status !== 'published' || !snap.exists() || snap.data().status !== 'published') return null;
    return { ...snap.data(), id: snap.id, slug: snap.id } as PersonDetail;
  } catch (e) {
    console.error('❌ Lỗi getPersonDetail:', e);
    throw e;
  }
};

/** Lấy danh sách sự kiện của nhân vật */
export const getPersonEvents = async (
  periodSlug: string,
  personSlug: string,
): Promise<PersonEvent[]> => {
  try {
    return cachedLoad(`person-events:${periodSlug}:${personSlug}`, async () => {
      const staticData = await getStaticJson<PersonEvent[]>(`persons/${periodSlug}/${personSlug}/events.json`);
      if (staticData) return staticData.filter((item) => item.status === 'published');
      const [periodSnap, personSnap] = await Promise.all([
        getDoc(doc(db, 'periods_person', periodSlug)),
        getDoc(doc(db, 'periods_person', periodSlug, 'persons', personSlug)),
      ]);
      if (!periodSnap.exists() || periodSnap.data().status !== 'published' || !personSnap.exists() || personSnap.data().status !== 'published') return [];

      const snap = await getDocs(collection(db, 'periods_person', periodSlug, 'persons', personSlug, 'events'));
      return snap.docs
        .filter((d) => d.data().status === 'published')
        .map((d) => ({ ...d.data(), id: d.id, slug: d.id } as PersonEvent));
    }, { ttlMs: 6 * 60 * 60 * 1000 });
  } catch (e) {
    console.error('❌ Lỗi getPersonEvents:', e);
    throw e;
  }
};

/** Lấy chi tiết một sự kiện của nhân vật */
export const getPersonEventDetail = async (
  periodSlug: string,
  personSlug: string,
  eventSlug: string,
): Promise<PersonEvent | null> => {
  try {
    const events = await getPersonEvents(periodSlug, personSlug);
    const cached = events.find((event) => event.id === eventSlug || event.slug === eventSlug);
    if (cached) return cached;
    const [periodSnap, personSnap, snap] = await Promise.all([
      getDoc(doc(db, 'periods_person', periodSlug)),
      getDoc(doc(db, 'periods_person', periodSlug, 'persons', personSlug)),
      getDoc(doc(db, 'periods_person', periodSlug, 'persons', personSlug, 'events', eventSlug)),
    ]);
    if (
      !periodSnap.exists() || periodSnap.data().status !== 'published'
      || !personSnap.exists() || personSnap.data().status !== 'published'
      || !snap.exists() || snap.data().status !== 'published'
    ) return null;
    return { ...snap.data(), id: snap.id, slug: snap.id } as PersonEvent;
  } catch (e) {
    console.error('❌ Lỗi getPersonEventDetail:', e);
    throw e;
  }
};
