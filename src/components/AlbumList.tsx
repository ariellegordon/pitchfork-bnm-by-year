import type { Album } from "../data.ts";

interface Props {
  albums: Album[]; // already filtered to the current selection
  years: [number, number][]; // [year, review count], only years with matches, newest first
  year: number | "all";
  onYearChange: (y: number | "all") => void;
  showCategory: boolean;
  open: boolean;
  onToggle: (open: boolean) => void;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function AlbumList({ albums, years, year, onYearChange, showCategory, open, onToggle }: Props) {
  const shown = (year === "all" ? albums : albums.filter((a) => a.year === year))
    .slice()
    .sort((a, b) => b.pubDate.localeCompare(a.pubDate));

  return (
    <details className="album-list" open={open}
      onToggle={(e) => { const o = (e.currentTarget as HTMLDetailsElement).open; if (o !== open) onToggle(o); }}>
      <summary>
        Reviews · {year === "all" ? "All years" : year}
        <span className="summary-count">{shown.length.toLocaleString()}</span>
      </summary>
      <div className="album-list-head">
        <label className="year-select">
          <span className="rubric">Year</span>
          <select
            value={String(year)}
            onChange={(e) => onYearChange(e.target.value === "all" ? "all" : Number(e.target.value))}
          >
            <option value="all">All years ({albums.length.toLocaleString()})</option>
            {years.map(([y, n]) => <option key={y} value={y}>{y} ({n})</option>)}
          </select>
        </label>
        <span className="pubdate">
          {shown.length.toLocaleString()} {shown.length === 1 ? "review" : "reviews"} · click a bar to pick a year
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="dek empty">No reviews for this selection.</p>
      ) : (
        <div className="table-scroll">
          <table className="albums">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Artist</th>
                <th scope="col">Album</th>
                <th scope="col">Reviewer</th>
                <th scope="col" className="score">Score</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => (
                <tr key={a.id}>
                  <td className="date">{year === "all" ? `${fmtDate(a.pubDate)}, ${a.year}` : fmtDate(a.pubDate)}</td>
                  <th scope="row" className="artist">{a.artist}</th>
                  <td className="title">
                    <a href={a.url} target="_blank" rel="noreferrer">{a.title}</a>
                    {showCategory && a.category === "reissue" && <span className="tag">Reissue</span>}
                  </td>
                  <td className="reviewer">{a.reviewers?.length ? a.reviewers.join(", ") : "—"}</td>
                  <td className="score">{a.score ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}
