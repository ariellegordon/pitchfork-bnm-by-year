import { useEffect, useState } from "react";

// Genre view: reference categorical palette (dataviz skill), validated for adjacent pairs
// in both modes against the white / #1a1a1a surfaces below.
const GENRE_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
const GENRE_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];

// Category view: Pitchfork's accent red for Best New Albums, blue for reissues.
// (Pitchfork black fails the categorical chroma/lightness checks, so it can't carry a series.)
const CATEGORY_LIGHT = ["#ff3530", "#2a78d6"];
const CATEGORY_DARK = ["#ff3530", "#3987e5"];

export interface Theme {
  series: string[];
  category: string[];
  surface: string;
  grid: string;
  axis: string;
  muted: string;
}

// Neutrals follow Pitchfork's tokens: story border #eee, border #ccc, pubdate #757575,
// navigation surface #1a1a1a / elevated #2b2b2b, navigation link #b3b3b3.
const themes: Record<"light" | "dark", Theme> = {
  light: { series: GENRE_LIGHT, category: CATEGORY_LIGHT, surface: "#ffffff", grid: "#eeeeee", axis: "#cccccc", muted: "#757575" },
  dark: { series: GENRE_DARK, category: CATEGORY_DARK, surface: "#1a1a1a", grid: "#2b2b2b", axis: "#4a4a4a", muted: "#b3b3b3" },
};

/** SVG presentation attributes can't use CSS variables reliably, so pick concrete hexes in JS. */
export function useTheme(): Theme {
  const query = "(prefers-color-scheme: dark)";
  const [dark, setDark] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return themes[dark ? "dark" : "light"];
}
