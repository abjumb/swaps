import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme, VERDICT } from "../theme";

interface Props {
  onScan: () => void;
  onType: () => void;
  /** For the footer: how many ingredients are on her list right now. */
  ingredientCount: number;
  /** True while the bundled/synced rules are stand-ins, not her judgment. */
  placeholder: boolean;
}

/**
 * The landing screen, styled after Rayna's Linktree: sky ground, white
 * rounded rows with deep blue ink, confetti scattered behind. The camera is
 * one tap away instead of being the front door.
 */
export function HomeScreen({ onScan, onType, ingredientCount, placeholder }: Props) {
  const t = useTheme();
  const [showLegend, setShowLegend] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: t.home.ground }}>
      <Confetti />

      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.badge, { backgroundColor: t.card }]}>
          <Text style={s.badgeEmoji}>🧴</Text>
        </View>
        <Text style={[s.title, { color: t.home.ink }]}>Swaps</Text>
        <Text style={[s.bio, { color: t.home.ink2 }]}>
          Non-Toxic Products | Rayna's List | Her Words
        </Text>

        <Row emoji="📷" label="Scan a Label" onPress={onScan} />
        <Row emoji="⌨️" label="Type the List" onPress={onType} />
        <Row
          emoji="🚦"
          label="How Verdicts Work"
          onPress={() => setShowLegend((v) => !v)}
        />

        {showLegend && (
          <View style={[s.card, s.legend, { backgroundColor: t.card }]}>
            <Legend color={VERDICT.green} ink={t.verdictInk.green} text="Green — nothing on her list" />
            <Legend color={VERDICT.yellow} ink={t.verdictInk.yellow} text="Yellow — worth a second look" />
            <Legend color={VERDICT.red} ink={t.verdictInk.red} text="Red — she'd skip it" />
          </View>
        )}

        <View style={[s.card, s.soon, { borderColor: t.home.ink2 }]}>
          <Text style={s.rowEmoji}>🛍️</Text>
          <Text style={[s.rowLabel, { color: t.home.ink2 }]}>Her Swaps — Coming Soon</Text>
        </View>

        <Text style={[s.footer, { color: t.home.ink2 }]}>
          {ingredientCount} ingredients on her list{placeholder ? " · preview data" : ""}
        </Text>
      </ScrollView>
    </View>
  );
}

function Row({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        { backgroundColor: t.card, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <Text style={s.rowEmoji}>{emoji}</Text>
      <Text style={[s.rowLabel, { color: t.home.ink }]}>{label}</Text>
    </Pressable>
  );
}

function Legend({ color, ink, text }: { color: string; ink: string; text: string }) {
  return (
    <View style={s.legendRow}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text style={[s.legendText, { color: ink }]}>{text}</Text>
    </View>
  );
}

/** Static confetti, scattered like her Linktree. Decorative only. */
const PIECES: {
  top: `${number}%`; left: `${number}%`; color?: string; rotate: string; emoji?: string; size?: number;
}[] = [
  { top: "2%", left: "4%", emoji: "🌈", rotate: "-12deg", size: 44 },
  { top: "3%", left: "84%", emoji: "⭐️", rotate: "18deg", size: 30 },
  { top: "13%", left: "10%", color: "#F2545B", rotate: "24deg" },
  { top: "9%", left: "38%", color: "#38C2C9", rotate: "-30deg" },
  { top: "16%", left: "68%", color: "#F7D44C", rotate: "60deg" },
  { top: "7%", left: "58%", color: "#F573C0", rotate: "-15deg" },
  { top: "22%", left: "88%", color: "#5FCB77", rotate: "40deg" },
  { top: "30%", left: "3%", color: "#3D7BF5", rotate: "-50deg" },
  { top: "47%", left: "93%", color: "#F79D3C", rotate: "12deg" },
  { top: "58%", left: "2%", color: "#8A5CF6", rotate: "75deg" },
  { top: "72%", left: "90%", emoji: "✨", rotate: "0deg", size: 26 },
  { top: "80%", left: "6%", color: "#F2545B", rotate: "-20deg" },
  { top: "88%", left: "82%", emoji: "🌈", rotate: "14deg", size: 34 },
  { top: "90%", left: "30%", color: "#38C2C9", rotate: "30deg" },
  { top: "84%", left: "55%", color: "#F7D44C", rotate: "-45deg" },
];

function Confetti() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {PIECES.map((p, i) =>
        p.emoji ? (
          <Text
            key={i}
            style={{
              position: "absolute", top: p.top, left: p.left,
              fontSize: p.size, transform: [{ rotate: p.rotate }],
            }}
          >
            {p.emoji}
          </Text>
        ) : (
          <View
            key={i}
            style={{
              position: "absolute", top: p.top, left: p.left,
              width: 16, height: 6, borderRadius: 3,
              backgroundColor: p.color, transform: [{ rotate: p.rotate }],
            }}
          />
        ),
      )}
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: 20, paddingTop: 28, paddingBottom: 40, alignItems: "stretch", gap: 14 },
  badge: {
    alignSelf: "center", width: 84, height: 84, borderRadius: 42,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#1D3FAF", shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  badgeEmoji: { fontSize: 40 },
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5, textAlign: "center" },
  bio: { fontSize: 14, fontWeight: "600", textAlign: "center", marginBottom: 10 },
  card: {
    borderRadius: 14, paddingVertical: 18, paddingHorizontal: 18,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#1D3FAF", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  rowEmoji: { position: "absolute", left: 16, fontSize: 22 },
  rowLabel: { fontSize: 17, fontWeight: "700" },
  legend: { gap: 10, alignItems: "stretch" },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 14, fontWeight: "600" },
  soon: {
    backgroundColor: "transparent", borderWidth: 1.5, borderStyle: "dashed",
    shadowOpacity: 0, elevation: 0,
  },
  footer: { textAlign: "center", fontSize: 13, marginTop: 8 },
});
