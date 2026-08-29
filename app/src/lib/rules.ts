import * as FileSystem from "expo-file-system";
import type { RuleSet } from "@swaps/engine";
import bundled from "../../assets/ingredients.json";

/**
 * Rule loading, in priority order:
 *
 *   1. the copy cached on this device from the last successful fetch
 *   2. the copy bundled into the binary, so a fresh install works offline
 *
 * and in the background, a fetch that refreshes the cache for next launch.
 * The app never blocks a scan on the network — a verdict has to be instant
 * while someone is standing in a shop.
 */

const REMOTE_URL =
  process.env.EXPO_PUBLIC_RULES_URL ?? "https://wellwithrayna.github.io/swaps/ingredients.json";

const CACHE = `${FileSystem.documentDirectory}ingredients.json`;

export const bundledRules = bundled as RuleSet;

export async function loadRules(): Promise<RuleSet> {
  try {
    const info = await FileSystem.getInfoAsync(CACHE);
    if (info.exists) {
      const cached = JSON.parse(await FileSystem.readAsStringAsync(CACHE)) as RuleSet;
      if (isNewer(cached, bundledRules)) return cached;
    }
  } catch {
    // A corrupt cache is not worth a crash. Fall through to the bundle.
  }
  return bundledRules;
}

export async function refreshRules(): Promise<RuleSet | null> {
  try {
    const res = await fetch(REMOTE_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return null;

    const next = (await res.json()) as RuleSet;
    if (!Array.isArray(next.ingredients) || next.ingredients.length === 0) return null;

    await FileSystem.writeAsStringAsync(CACHE, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

function isNewer(a: RuleSet, b: RuleSet): boolean {
  return Date.parse(a.generatedAt || "") > Date.parse(b.generatedAt || "0");
}
