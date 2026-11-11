import { useEffect, useState } from "react";

// Reference categorical palette (dataviz skill), validated for adjacent pairs in both modes.
const LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
const DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];

export interface Theme {
  series: string[];
  surface: string;
  grid: string;
  axis: string;
  muted: string;
  textSecondary: string;
}

const themes: Record<"light" | "dark", Theme> = {
  light: { series: LIGHT, surface: "#fcfcfb", grid: "#e1e0d9", axis: "#c3c2b7", muted: "#898781", textSecondary: "#52514e" },
  dark: { series: DARK, surface: "#1a1a19", grid: "#2c2c2a", axis: "#383835", muted: "#898781", textSecondary: "#c3c2b7" },
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
