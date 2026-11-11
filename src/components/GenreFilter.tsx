interface Props {
  genres: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

export function GenreFilter({ genres, selected, onChange }: Props) {
  const toggle = (g: string) => {
    const next = new Set(selected);
    if (next.has(g)) next.delete(g);
    else next.add(g);
    onChange(next);
  };
  return (
    <div className="chips" role="group" aria-label="Filter by genre">
      <button className="chip" aria-pressed={selected.size === 0} onClick={() => onChange(new Set())}>
        All genres
      </button>
      {genres.map((g) => (
        <button key={g} className="chip" aria-pressed={selected.has(g)} onClick={() => toggle(g)}>
          {g}
        </button>
      ))}
    </div>
  );
}
