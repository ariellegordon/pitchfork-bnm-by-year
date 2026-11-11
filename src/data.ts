import type { Album, Category, DataFile } from "../scraper/types.ts";

export type { Album, Category, DataFile };

export async function loadData(): Promise<DataFile> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/albums.json`);
  if (!res.ok) throw new Error(`Could not load data/albums.json (HTTP ${res.status}). Run "npm run scrape" first.`);
  return res.json();
}

export const OTHER = "Other";
const NO_GENRE = "Unlabeled";

/** Fixed genre slots (most common first) so each genre keeps its color under any filter.
 *  Past 7 named genres, the tail folds into "Other" (8 categorical slots max). */
export function genreSlots(albums: Album[]): string[] {
  const counts = new Map<string, number>();
  for (const a of albums) for (const g of a.genres) counts.set(g, (counts.get(g) ?? 0) + 1);
  const named = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
  return named.length <= 8 ? named.concat(albums.some((a) => !a.genres.length) ? [OTHER] : []) : [...named.slice(0, 7), OTHER];
}

/** All filter-chip genres, including a chip for reviews with no genre label. */
export function allGenres(albums: Album[]): string[] {
  const counts = new Map<string, number>();
  for (const a of albums) for (const g of a.genres.length ? a.genres : [NO_GENRE]) counts.set(g, (counts.get(g) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
}

export function matchesGenres(a: Album, selected: Set<string>): boolean {
  if (selected.size === 0) return true;
  const gs = a.genres.length ? a.genres : [NO_GENRE];
  return gs.some((g) => selected.has(g));
}

/** Genre bucket(s) an album counts toward in the stacked view. */
export function bucketsFor(a: Album, slots: string[], selected: Set<string>): string[] {
  const gs = a.genres.length ? a.genres : [NO_GENRE];
  const kept = selected.size ? gs.filter((g) => selected.has(g)) : gs;
  return [...new Set(kept.map((g) => (slots.includes(g) && g !== OTHER ? g : OTHER)))];
}

export function yearRange(albums: Album[]): number[] {
  if (!albums.length) return [];
  let lo = Infinity, hi = -Infinity;
  for (const a of albums) { lo = Math.min(lo, a.year); hi = Math.max(hi, a.year); }
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

export type Row = { year: number } & Record<string, number>;

/** Counts per year for the given series keys; missing years are 0. */
export function countByYear(albums: Album[], years: number[], keys: string[], keyOf: (a: Album) => string[]): Row[] {
  const rows = new Map<number, Row>(years.map((y) => [y, Object.fromEntries([["year", y], ...keys.map((k) => [k, 0])]) as Row]));
  for (const a of albums) {
    const row = rows.get(a.year);
    if (!row) continue;
    for (const k of keyOf(a)) if (k in row) row[k] += 1;
  }
  return [...rows.values()];
}
