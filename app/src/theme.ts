import { useColorScheme } from "react-native";

/**
 * The verdict colours are the palette. Everything else stays neutral so a
 * green, yellow or red reads instantly across a shop aisle — and each one
 * always ships with a text label beside it, never colour alone.
 */
export const VERDICT = {
  green: "#0CA30C",
  yellow: "#FAB219",
  red: "#D03B3B",
} as const;

const light = {
  ground: "#ECEAF0",
  card: "#FFFFFF",
  cardAlt: "#F5F4F8",
  ink: "#17151C",
  ink2: "#5D5769",
  ink3: "#8B8598",
  rule: "#DDD9E3",
  accent: "#4A3F7A",
  verdictInk: { green: "#0A7D0A", yellow: "#8A6100", red: "#B8332F" },
  verdictBg: { green: "#E6F5E6", yellow: "#FDF1D9", red: "#FAE9E9" },
  // The dashboard wears her Linktree's colours: sky ground, deep blue ink.
  home: { ground: "#C9EDF8", ink: "#1D3FAF", ink2: "#4568C2" },
};

const dark: typeof light = {
  ground: "#100E14",
  card: "#1A181F",
  cardAlt: "#221F29",
  ink: "#EEEBF2",
  ink2: "#A49DAE",
  ink3: "#756E80",
  rule: "#2C2833",
  accent: "#B3A4E8",
  verdictInk: { green: "#3FC93F", yellow: "#FAB219", red: "#E86B6B" },
  verdictBg: { green: "#142A14", yellow: "#322611", red: "#2E1717" },
  home: { ground: "#0E1B2E", ink: "#9CC4F5", ink2: "#6D8FC4" },
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}

export const COPY = {
  green: { title: "Nothing on her list", body: "None of the ingredients Rayna tracks turned up. That is not the same as safe — her list keeps growing." },
  yellow: { title: "Worth a second look", body: "Nothing she avoids outright, but there are ingredients she has reservations about." },
  red: { title: "She'd skip this one", body: "Contains at least one ingredient on her avoid list." },
} as const;
