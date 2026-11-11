import { useEffect, useMemo, useState } from "react";
import {
  allGenres, bucketsFor, countByYear, genreSlots, loadData, matchesGenres, yearRange,
  type Category, type DataFile,
} from "./data.ts";
import { useTheme } from "./palette.ts";
import { YearChart, type Series } from "./components/YearChart.tsx";
import { GenreFilter } from "./components/GenreFilter.tsx";

type View = "category" | "genre";
type Scope = Category | "both";

const CATEGORY_LABEL: Record<Category, string> = { album: "Best New Albums", reissue: "Best New Reissues" };

function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: [T, string][]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} role="radio" aria-checked={value === v} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

export default function App() {
  const theme = useTheme();
  const [data, setData] = useState<DataFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("category");
  const [scope, setScope] = useState<Scope>("album");
  const [showCat, setShowCat] = useState<Record<Category, boolean>>({ album: true, reissue: true });
  const [genres, setGenres] = useState<Set<string>>(new Set());

  useEffect(() => { loadData().then(setData, (e) => setError(String(e.message ?? e))); }, []);

  const albums = data?.albums ?? [];
  const years = useMemo(() => yearRange(albums), [albums]);
  const slots = useMemo(() => genreSlots(albums), [albums]);
  const chipGenres = useMemo(() => allGenres(albums), [albums]);
  const filtered = useMemo(() => albums.filter((a) => matchesGenres(a, genres)), [albums, genres]);

  const { rows, series } = useMemo(() => {
    if (view === "category") {
      const cats = (["album", "reissue"] as Category[]).filter((c) => showCat[c]);
      const series: Series[] = cats.map((c) => ({
        key: c, label: CATEGORY_LABEL[c], color: theme.series[c === "album" ? 0 : 1],
      }));
      return { series, rows: countByYear(filtered, years, cats, (a) => [a.category]) };
    }
    const inScope = filtered.filter((a) => scope === "both" || a.category === scope);
    const series: Series[] = slots.map((g, i) => ({ key: g, label: g, color: theme.series[i] }));
    const rows = countByYear(inScope, years, slots, (a) => bucketsFor(a, slots, genres));
    // Hide genres with no counts at all under the current filter (colors stay fixed per genre).
    const used = series.filter((s) => rows.some((r) => r[s.key] > 0));
    return { series: used, rows };
  }, [view, scope, showCat, filtered, years, slots, genres, theme]);

  const totals = useMemo(() => {
    const t = { album: 0, reissue: 0 };
    for (const a of filtered) t[a.category]++;
    const perYear = countByYear(filtered, years, ["album"], (a) => [a.category]);
    let peak: { year: number; count: number } | null = null;
    for (const r of perYear) if (r.album > 0 && (!peak || r.album > peak.count)) peak = { year: r.year, count: r.album };
    return { ...t, peak };
  }, [filtered, years]);

  if (error) return <main className="page"><p className="error">{error}</p></main>;
  if (!data) return <main className="page"><p className="muted">Loading…</p></main>;

  const visibleRows = [...rows].reverse();

  return (
    <main className="page">
      <header>
        <h1>Pitchfork Best New Music by year</h1>
        <p className="muted">
          Counted by the year Pitchfork published the review. Data scraped{" "}
          {new Date(data.scrapedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}.
        </p>
      </header>

      <section className="filters" aria-label="Filters">
        <GenreFilter genres={chipGenres} selected={genres} onChange={setGenres} />
      </section>

      <section className="tiles">
        <Tile label="Best New Albums" value={totals.album.toLocaleString()} />
        <Tile label="Best New Reissues" value={totals.reissue.toLocaleString()} />
        <Tile
          label="Peak year for albums"
          value={totals.peak ? String(totals.peak.year) : "—"}
          sub={totals.peak ? `${totals.peak.count} albums` : undefined}
        />
      </section>

      <section className="card">
        <div className="card-head">
          <h2>{view === "category" ? "Picks per year" : "Picks per year by genre"}</h2>
          <div className="controls">
            <Segmented label="View" value={view} onChange={setView}
              options={[["category", "By category"], ["genre", "By genre"]]} />
            {view === "genre" && (
              <Segmented label="Category" value={scope} onChange={setScope}
                options={[["album", "Albums"], ["reissue", "Reissues"], ["both", "Both"]]} />
            )}
          </div>
        </div>

        <div className="legend">
          {view === "category"
            ? (["album", "reissue"] as Category[]).map((c, i) => (
                <label key={c} className="legend-item toggle">
                  <input type="checkbox" checked={showCat[c]}
                    onChange={(e) => setShowCat({ ...showCat, [c]: e.target.checked })} />
                  <span className="swatch" style={{ background: theme.series[i] }} />
                  {CATEGORY_LABEL[c]}
                </label>
              ))
            : series.map((s) => (
                <span key={s.key} className="legend-item">
                  <span className="swatch" style={{ background: s.color }} />{s.label}
                </span>
              ))}
        </div>

        {series.length ? <YearChart rows={rows} series={series} stacked={view === "genre"} theme={theme} />
          : <p className="muted empty">Nothing to show for this selection.</p>}

        {view === "genre" && (
          <p className="note">
            A review tagged with several genres counts once in each, so stacked totals can be higher than the number of
            reviews. “Other” groups the less common genres and reviews with no genre label.
          </p>
        )}

        <details className="table-view">
          <summary>Show as table</summary>
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th scope="col">Year</th>{series.map((s) => <th scope="col" key={s.key}>{s.label}</th>)}</tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => (
                  <tr key={r.year}>
                    <th scope="row">{r.year}</th>
                    {series.map((s) => <td key={s.key}>{r[s.key]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <footer className="muted">Source: pitchfork.com/reviews/best/albums and /reviews/best/reissues.</footer>
    </main>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {sub && <div className="tile-sub">{sub}</div>}
    </div>
  );
}

