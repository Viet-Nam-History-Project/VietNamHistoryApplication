/**
 * Models cho Nhân vật lịch sử
 * Firestore collections:
 *   periods_person/{slug}                          — PersonPeriodItem
 *   periods_person/{slug}/persons/{slug}            — PersonDetail
 *   periods_person/{slug}/persons/{slug}/events/{slug} — PersonEvent
 */

/** Item trong danh sách thời kỳ nhân vật (tab Person) */
export interface PersonPeriodItem {
  id: string;        // = document ID = slug
  slug: string;
  title: string;
  startDate?: string; // ISO string
  endDate?: string;   // ISO string
  coverMediaRef?: string;
  sortOrder?: number;
  status?: 'draft' | 'published' | 'archived' | string;
}

/** Item trong danh sách nhân vật của 1 thời kỳ */
export interface PersonListItem {
  id: string;        // = document ID = slug
  slug: string;
  name: string;
  title: string;     // chức vụ / danh hiệu
  birthDate?: string;
  deathDate?: string;
  birth_year?: string;
  death_year?: string;
  coverMediaRef?: string;
  horizontalImage?: string;
  sortOrder?: number;
  status?: 'draft' | 'published' | 'archived' | string;
}

/** Video model */
export interface PersonVideo {
  link: string;
  content?: string;
}

/** Chi tiết nhân vật */
export interface PersonDetail {
  id: string;
  slug: string;
  name: string;
  title: string;
  overview?: string;
  hometown?: string;
  birth_year?: string;
  death_year?: string;
  horizontalImage?: string;   // ảnh banner
  coverMediaRef?: string;     // ảnh thumbnail
  achievements?: string[];    // danh sách thành tựu
  lifetime?: string[];        // tóm tắt cuộc đời
  video?: PersonVideo;
  status?: 'draft' | 'published' | 'archived' | string;
}

/** Sự kiện của nhân vật */
export interface PersonEvent {
  id: string;
  slug: string;
  title: string;
  overview?: string;
  role?: string;
  description?: string;
  coverMediaRef?: string;
  eventRef?: string; // path dạng "periods/{p}/stages/{s}/events/{e}"
  status?: 'draft' | 'published' | 'archived' | string;
}
