import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Matcher, type RuleSet, type ScanResult } from "@swaps/engine";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ScanScreen } from "./src/screens/ScanScreen";
import { ResultScreen } from "./src/screens/ResultScreen";
import { loadRules, refreshRules } from "./src/lib/rules";
import { useTheme } from "./src/theme";

export default function App() {
  const t = useTheme();
  const [rules, setRules] = useState<RuleSet | null>(null);
  const [screen, setScreen] = useState<"home" | "scan">("home");
  const [startTyping, setStartTyping] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    // Show something immediately from cache or bundle, then quietly refresh.
    loadRules().then((r) => { if (alive) setRules(r); });
    refreshRules().then((r) => { if (alive && r) setRules(r); });

    return () => { alive = false; };
  }, []);

  const matcher = useMemo(() => (rules ? new Matcher(rules) : null), [rules]);

  // The dashboard paints the safe area sky; every other screen stays neutral.
  const onHome = !result && screen === "home";

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: onHome ? t.home.ground : t.ground }}
        edges={["top", "bottom"]}
      >
        {!matcher ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={t.accent} />
          </View>
        ) : result ? (
          <ResultScreen
            result={result}
            category={category}
            onAskCategory={() => setCategory("this")}
            onScanAgain={() => {
              setResult(null);
              setCategory(null);
              setStartTyping(false);
              setScreen("scan");
            }}
          />
        ) : screen === "scan" ? (
          <ScanScreen
            startTyping={startTyping}
            onBack={() => setScreen("home")}
            onLabel={(text) => setResult(matcher.scan(text))}
          />
        ) : (
          <HomeScreen
            onScan={() => { setStartTyping(false); setScreen("scan"); }}
            onType={() => { setStartTyping(true); setScreen("scan"); }}
            ingredientCount={rules?.ingredients.length ?? 0}
            placeholder={rules?.placeholder ?? false}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
