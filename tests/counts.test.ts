import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  bucketsFor, countByYear, genreSlots, matchesGenres, withUniqueTotals, yearRange, yearTotal,
  type Album, type Category, type DataFile,
} from "../src/data.ts";

const data: DataFile = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../public/data/albums.json"), "utf8"),
);
const albums = data.albums;
const years = yearRange(albums);
const slots = genreSlots(albums);
const multi = albums.filter((a) => a.genres.length > 1);

/** Ground truth: distinct review ids per year. */
function uniquePerYear(list: Album[]): Map<number, number> {
  const ids = new Map<number, Set<string>>();
  for (const a of list) {
    if (!ids.has(a.year)) ids.set(a.year, new Set());
    ids.get(a.year)!.add(a.id);
  }
  return new Map([...ids].map(([y, s]) => [y, s.size]));
}

/** What the chart tooltip's "Total" shows (same function the tooltip calls). */
const rowTotal = yearTotal;

test("data sanity: multi-genre reviews exist and ids are unique", () => {
  assert.ok(multi.length > 0, "need multi-genre reviews for this test to mean anything");
  assert.equal(new Set(albums.map((a) => a.id)).size, albums.length, "duplicate review ids in albums.json");
});

test("category view: each year's total counts every review once", () => {
  const cats: Category[] = ["album", "reissue"];
  const rows = countByYear(albums, years, cats, (a) => [a.category]);
  const truth = uniquePerYear(albums);
  for (const r of rows) assert.equal(rowTotal(r, cats), truth.get(r.year) ?? 0, `year ${r.year}`);
});

test("stat tiles and peak year count each BNM once", () => {
  const bnm = albums.filter((a) => a.category === "album");
  const perYear = countByYear(albums, years, ["album"], (a) => [a.category]);
  const truth = uniquePerYear(bnm);
  for (const r of perYear) assert.equal(r.album, truth.get(r.year) ?? 0, `year ${r.year}`);
  assert.equal(perYear.reduce((n, r) => n + r.album, 0), bnm.length);
});

test("selecting several genre chips keeps a multi-genre review once", () => {
  const a = multi[0];
  const selected = new Set(a.genres); // every genre it's tagged with
  const hits = albums.filter((x) => matchesGenres(x, selected));
  assert.equal(hits.filter((x) => x.id === a.id).length, 1);
  // ...and the per-year totals under that filter still match distinct reviews.
  const rows = countByYear(hits, years, ["album", "reissue"], (x) => [x.category]);
  const truth = uniquePerYear(hits);
  for (const r of rows) assert.equal(rowTotal(r, ["album", "reissue"]), truth.get(r.year) ?? 0, `year ${r.year}`);
});

test("genre view: a review lands in each genre bucket at most once", () => {
  for (const a of albums) {
    const b = bucketsFor(a, slots, new Set());
    assert.equal(new Set(b).size, b.length, `${a.artist} – ${a.title} double-counted in one genre`);
  }
});

test("genre view: the tooltip's year Total counts each BNM once", () => {
  const bnm = albums.filter((a) => a.category === "album");
  // Built exactly as App.tsx builds the genre view's rows.
  const rows = withUniqueTotals(countByYear(bnm, years, slots, (a) => bucketsFor(a, slots, new Set())), bnm);
  const truth = uniquePerYear(bnm);
  const off = rows
    .map((r) => ({ year: r.year, shown: rowTotal(r, slots), actual: truth.get(r.year) ?? 0 }))
    .filter((x) => x.shown !== x.actual);
  assert.deepEqual(off, [], `Total overcounts in ${off.length} years, e.g. ${JSON.stringify(off.slice(0, 3))}`);
});
