import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fetchPage, sleep } from "./pitchfork.ts";
import type { Album, Category, DataFile } from "./types.ts";

const OUT = resolve(import.meta.dirname, "../public/data/albums.json");
const DELAY_MS = 1000;
const MAX_PAGES = 200; // safety stop
const full = process.argv.includes("--full");

async function loadCache(): Promise<Album[]> {
  if (full) return [];
  try {
    const data: DataFile = JSON.parse(await readFile(OUT, "utf8"));
    return data.albums ?? [];
  } catch {
    return [];
  }
}

async function scrapeCategory(category: Category, known: Set<string>): Promise<Album[]> {
  const found: Album[] = [];
  let total: number | null = null;
  let reachedEnd = false;
  for (let page = 1; page <= MAX_PAGES; page++) {
    if (page > 1) await sleep(DELAY_MS);
    const { items, totalResults } = await fetchPage(category, page);
    total ??= totalResults;
    if (items.length === 0) {
      reachedEnd = true;
      break;
    }
    const fresh = items.filter((a) => !known.has(a.id));
    found.push(...fresh);
    console.log(`  ${category} page ${page}: ${items.length} items, ${fresh.length} new`);
    if (!full && fresh.length === 0) break; // caught up with the cache
    if (total !== null && (page - 1) * 30 + items.length >= total) {
      reachedEnd = true; // that was the last page; skip the 404 probe
      break;
    }
  }
  if (reachedEnd && total !== null) {
    const have = found.length + known.size;
    if (full && found.length !== total) {
      console.warn(`  ! ${category}: scraped ${found.length}, but listing reports ${total}`);
    } else if (!full && have < total) {
      console.warn(`  ! ${category}: have ${have}, listing reports ${total}; try --full`);
    }
  }
  return found;
}

async function main() {
  const cached = await loadCache();
  console.log(full ? "Full scrape" : `Incremental scrape (${cached.length} cached)`);

  const byId = new Map(cached.map((a) => [a.id, a]));
  for (const category of ["album", "reissue"] as const) {
    const known = new Set(cached.filter((a) => a.category === category).map((a) => a.id));
    const fresh = await scrapeCategory(category, known);
    for (const a of fresh) byId.set(a.id, a);
    console.log(`${category}: +${fresh.length} new`);
    await sleep(DELAY_MS);
  }

  const albums = [...byId.values()].sort((a, b) => b.pubDate.localeCompare(a.pubDate));
  const data: DataFile = { scrapedAt: new Date().toISOString(), albums };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(data, null, 1) + "\n");

  const counts = (c: Category) => albums.filter((a) => a.category === c).length;
  console.log(`Wrote ${albums.length} entries (${counts("album")} albums, ${counts("reissue")} reissues) to ${OUT}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
