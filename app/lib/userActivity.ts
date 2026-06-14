"use client";
// 검색 이력 + 작성 문서 이력 (localStorage). 저장한 공고는 useFavorites 사용.
// (서버 영속은 추후 Supabase 연동; 지금은 클라이언트 기록)
const SEARCH_KEY = "activity.searches.v1";
const DOC_KEY = "activity.docs.v1";
const MAX = 20;
const EVT = "activity:changed";

export interface SearchEntry { q: string; at: number; type: "match" | "grant" }
export interface DocEntry { title: string; at: number; filledCount?: number }

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try { const v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function write<T>(key: string, v: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(v.slice(0, MAX)));
  window.dispatchEvent(new Event(EVT));
}

export function recordSearch(q: string, type: "match" | "grant") {
  const t = (q || "").trim();
  if (!t) return;
  const list = read<SearchEntry>(SEARCH_KEY).filter((s) => s.q !== t);
  list.unshift({ q: t, at: Date.now(), type });
  write(SEARCH_KEY, list);
}
export function recordDoc(title: string, filledCount?: number) {
  const t = (title || "신청서").trim();
  const list = read<DocEntry>(DOC_KEY).filter((d) => d.title !== t);
  list.unshift({ title: t, at: Date.now(), filledCount });
  write(DOC_KEY, list);
}
export function getSearches(): SearchEntry[] { return read<SearchEntry>(SEARCH_KEY); }
export function getDocs(): DocEntry[] { return read<DocEntry>(DOC_KEY); }
export const ACTIVITY_EVENT = EVT;
