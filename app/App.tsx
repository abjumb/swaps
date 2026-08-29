import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Matcher, type RuleSet, type ScanResult } from "@swaps/engine";
import { ScanScreen } from "./src/screens/ScanScreen";
import { ResultScreen } from "./src/screens/ResultScreen";
import { loadRules, refreshRules } from "./src/lib/rules";
import { useTheme } from "./src/theme";

export default function App() {
  const t = useTheme();
  const [rules, setRules] = useState<RuleSet | null>(null);
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

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <SafeAreaView style={{ flex: 1, backgroundColor: t.ground }} edges={["top", "bottom"]}>
        {!matcher ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={t.accent} />
          </View>
        ) : result ? (
          <ResultScreen
            result={result}
            category={category}
            onAskCategory={() => setCategory("this")}
            onScanAgain={() => { setResult(null); setCategory(null); }}
          />
        ) : (
          <ScanScreen onLabel={(text) => setResult(matcher.scan(text))} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
