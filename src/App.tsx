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

function Pills<T extends string>({ value, options, onChange, label }: {
  value: T; options: [T, string][]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="pills" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} className="pill" role="radio" aria-checked={value === v} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

function Masthead() {
  return (
    <header className="masthead">
      <div className="masthead-bar">
        <span className="wordmark">ForkCount</span>
        <span className="masthead-meta">Unofficial · data from pitchfork.com</span>
      </div>
      <nav className="subnav" aria-label="Source pages">
        <a href="https://pitchfork.com/reviews/best/albums/" target="_blank" rel="noreferrer">Best New Albums</a>
        <a href="https://pitchfork.com/reviews/best/reissues/" target="_blank" rel="noreferrer">Best New Reissues</a>
      </nav>
    </header>
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
        key: c, label: CATEGORY_LABEL[c], color: theme.category[c === "album" ? 0 : 1],
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

  if (error || !data) {
    return (
      <div className="site">
        <Masthead />
        <main className="page"><p className={error ? "error" : "dek"}>{error ?? "Loading…"}</p></main>
      </div>
    );
  }

  const visibleRows = [...rows].reverse();

  return (
    <div className="site">
      <Masthead />

      <main className="page">
        <header className="page-head">
          <h1 className="page-hed">Best New Music by Year</h1>
          <p className="dek">
            Every Best New Album and Best New Reissue.
          </p>
          <p className="pubdate">
            Updated {new Date(data.scrapedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </header>

        <section className="filters" aria-label="Filter by genre">
          <GenreFilter genres={chipGenres} selected={genres} onChange={setGenres} />
        </section>

        <section className="stats">
          <Stat label="Best New Albums" value={totals.album.toLocaleString()} />
          <Stat label="Best New Reissues" value={totals.reissue.toLocaleString()} />
          <Stat
            label="Peak year for BNMs"
            value={totals.peak ? String(totals.peak.year) : "—"}
            sub={totals.peak ? `${totals.peak.count} albums` : undefined}
          />
        </section>

        <section className="chart-section">
          <div className="section-head">
            <div className="controls">
              <Pills label="View" value={view} onChange={setView}
                options={[["category", "By category"], ["genre", "By genre"]]} />
              {view === "genre" && (
                <Pills label="Category" value={scope} onChange={setScope}
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
                    <span className="swatch" style={{ background: theme.category[i] }} />
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
            : <p className="dek empty">Nothing to show for this selection.</p>}

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
      </main>

      <footer className="site-footer">
        <p>
          An unofficial fan project, not affiliated with Pitchfork. Data from{" "}
          <a href="https://pitchfork.com/reviews/best/albums/" target="_blank" rel="noreferrer">pitchfork.com</a>.
        </p>
      </footer>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <div className="rubric">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="pubdate">{sub}</div>}
    </div>
  );
}
