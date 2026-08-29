import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Match, ScanResult, Tier } from "@swaps/engine";
import { COPY, useTheme, VERDICT } from "../theme";

const TIER_LABEL: Record<Tier, string> = {
  AVOID: "AVOID",
  CAUTION: "CAUTION",
  LOW_CONCERN_NOT_PERFECT: "NOT PERFECT",
  LOW_CONCERN: "LOW CONCERN",
};

const TIER_COLOR: Record<Tier, keyof typeof VERDICT> = {
  AVOID: "red",
  CAUTION: "yellow",
  LOW_CONCERN_NOT_PERFECT: "yellow",
  LOW_CONCERN: "green",
};

interface Props {
  result: ScanResult;
  /** Placeholder while the swap catalog is not wired up. */
  category: string | null;
  onAskCategory: () => void;
  onScanAgain: () => void;
}

export function ResultScreen({ result, category, onAskCategory, onScanAgain }: Props) {
  const t = useTheme();
  const copy = COPY[result.verdict];

  return (
    <ScrollView
      style={{ backgroundColor: t.ground }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
    >
      <View style={[s.verdict, { backgroundColor: t.verdictBg[result.verdict] }]}>
        <View style={[s.dot, { backgroundColor: VERDICT[result.verdict] }]} />
        <View style={{ flex: 1 }}>
          <Text style={[s.verdictTitle, { color: t.verdictInk[result.verdict] }]}>{copy.title}</Text>
          <Text style={[s.verdictBody, { color: t.ink2 }]}>{copy.body}</Text>
        </View>
      </View>

      {result.hits.length > 0 && (
        <View style={[s.card, { backgroundColor: t.card, borderColor: t.rule }]}>
          <Text style={[s.eyebrow, { color: t.ink3 }]}>
            ON HER LIST — {result.hits.length}
          </Text>
          {result.hits.map((h, i) => (
            <HitRow key={`${h.ingredient.id}-${i}`} match={h} first={i === 0} />
          ))}
        </View>
      )}

      {result.maybes.length > 0 && (
        <View style={[s.card, { backgroundColor: t.card, borderColor: t.rule }]}>
          <Text style={[s.eyebrow, { color: t.ink3 }]}>POSSIBLE MATCHES — CHECK THE LABEL</Text>
          <Text style={[s.body, { color: t.ink2, marginBottom: 4 }]}>
            Close to something on her list, but not an exact read. These don't count toward the
            verdict above.
          </Text>
          {result.maybes.map((m, i) => (
            <HitRow key={`maybe-${m.ingredient.id}-${i}`} match={m} first={false} muted />
          ))}
        </View>
      )}

      {result.verdict !== "green" && (
        <View style={[s.card, { backgroundColor: t.card, borderColor: t.rule, borderStyle: "dashed" }]}>
          <Text style={[s.eyebrow, { color: t.ink3 }]}>HER SWAP</Text>
          {category ? (
            <Text style={[s.body, { color: t.ink3 }]}>
              No pick for {category} yet — the catalog isn't connected.
            </Text>
          ) : (
            <Pressable accessibilityRole="button" onPress={onAskCategory}>
              <Text style={[s.link, { color: t.accent }]}>What kind of product is this?</Text>
            </Pressable>
          )}
          <Text style={[s.fine, { color: t.ink3 }]}>
            Swap links earn commission. The verdict above never reads the catalog.
          </Text>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        style={[s.primary, { backgroundColor: t.ink }]}
        onPress={onScanAgain}
      >
        <Text style={[s.primaryText, { color: t.ground }]}>Scan another</Text>
      </Pressable>
    </ScrollView>
  );
}

function HitRow({ match, first, muted }: { match: Match; first: boolean; muted?: boolean }) {
  const t = useTheme();
  const { ingredient } = match;
  const tone = TIER_COLOR[ingredient.tier];
  const showFoundAs = match.foundAs.toLowerCase() !== ingredient.name.toLowerCase();

  return (
    <View style={[s.hit, !first && { borderTopWidth: 1, borderTopColor: t.rule }]}>
      <View style={[s.bead, { backgroundColor: VERDICT[tone] }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[s.hitName, { color: t.ink }]}>
          {ingredient.name}
          <Text style={[s.tier, { color: t.verdictInk[tone] }]}>  {TIER_LABEL[ingredient.tier]}</Text>
          {match.mayContain && <Text style={[s.tier, { color: t.ink3 }]}>  MAY CONTAIN</Text>}
        </Text>

        {ingredient.healthConcerns.length > 0 && (
          <Text style={[s.body, { color: t.ink2 }]}>{ingredient.healthConcerns.join(" · ")}</Text>
        )}

        {showFoundAs && (
          <Text style={[s.fine, { color: t.ink3 }]}>found as “{match.foundAs}”</Text>
        )}

        {!muted && ingredient.herTake ? (
          <View style={[s.take, { backgroundColor: t.cardAlt }]}>
            <Text style={[s.takeText, { color: t.ink2 }]}>{ingredient.herTake}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  verdict: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 18 },
  dot: { width: 26, height: 26, borderRadius: 13 },
  verdictTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.2 },
  verdictBody: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  eyebrow: { fontSize: 11, letterSpacing: 1.1, fontWeight: "600" },
  hit: { flexDirection: "row", gap: 10, paddingVertical: 10 },
  bead: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  hitName: { fontSize: 15, fontWeight: "600" },
  tier: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8 },
  body: { fontSize: 13, lineHeight: 19 },
  fine: { fontSize: 12 },
  take: { borderRadius: 8, padding: 9, marginTop: 4 },
  takeText: { fontSize: 13, lineHeight: 19, fontStyle: "italic" },
  link: { fontSize: 15, paddingVertical: 8 },
  primary: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  primaryText: { fontSize: 16, fontWeight: "600" },
});
