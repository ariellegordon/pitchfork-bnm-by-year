import type { Album, Category } from "./types.ts";

const BASE = "https://pitchfork.com";
const LISTING_PATH: Record<Category, string> = {
  album: "/reviews/best/albums/",
  reissue: "/reviews/best/reissues/",
};
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface PageResult {
  items: Album[];
  totalResults: number | null;
}

/** Returns null on 404 (past the last listing page). */
async function fetchHtml(url: string, attempts = 3): Promise<string | null> {
  for (let i = 1; ; i++) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.ok) return res.text();
    if (res.status === 404) return null;
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || i >= attempts) {
      throw new Error(`GET ${url} failed: HTTP ${res.status}`);
    }
    await sleep(2000 * 2 ** (i - 1));
  }
}

function extractState(html: string, url: string): any {
  const m = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{.*?\});\s*<\/script>/s);
  if (!m) throw new Error(`No window.__PRELOADED_STATE__ found on ${url}`);
  return JSON.parse(m[1]);
}

const stripMarkup = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/\*/g, "") // markdown italics markers
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "’")
    .trim();

function artistName(subHed: any): string {
  if (!subHed) return "";
  if (Array.isArray(subHed)) return subHed.map(artistName).filter(Boolean).join(" / ");
  if (typeof subHed === "string") return stripMarkup(subHed);
  return stripMarkup(String(subHed.name ?? ""));
}

function toAlbum(item: any, category: Category): Album {
  const pubDate: string = item.pubDate;
  return {
    id: String(item.id ?? item.copilotID ?? item.url),
    category,
    artist: artistName(item.subHed) || "Various Artists", // compilations have no subHed
    title: stripMarkup(item.source?.hed ?? item.dangerousHed ?? ""),
    url: new URL(item.url, BASE).toString(),
    pubDate,
    year: new Date(pubDate).getUTCFullYear(),
    genres: Array.isArray(item.rubric)
      ? item.rubric.map((r: any) => String(r?.name ?? "")).filter(Boolean)
      : [],
    score: typeof item.ratingValue?.score === "number" ? item.ratingValue.score : null,
  };
}

/** Fetch one listing page. Returns no items when the page is past the end. */
export async function fetchPage(category: Category, page: number): Promise<PageResult> {
  const url = `${BASE}${LISTING_PATH[category]}?page=${page}`;
  const html = await fetchHtml(url);
  if (html === null) return { items: [], totalResults: null }; // past last page
  const state = extractState(html, url);
  const transformed = state?.transformed;
  if (!transformed) throw new Error(`State shape changed: missing "transformed" on ${url}`);
  const container = transformed.bundle?.containers?.[0];
  if (!container) return { items: [], totalResults: null }; // past last page
  const raw: any[] = Array.isArray(container.items) ? container.items : [];
  for (const it of raw) {
    if (!it?.pubDate || !it?.url) {
      throw new Error(`State shape changed: item without pubDate/url on ${url}`);
    }
  }
  return {
    items: raw.map((it) => toAlbum(it, category)),
    totalResults: typeof container.totalResults === "number" ? container.totalResults : null,
  };
}
