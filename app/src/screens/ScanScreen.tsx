import { useRef, useState } from "react";
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { readLabel, trimToIngredients } from "../lib/ocr";
import { useTheme } from "../theme";

interface Props {
  onLabel: (rawText: string) => void;
}

export function ScanScreen({ onLabel }: Props) {
  const t = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const camera = useRef<CameraView>(null);

  async function capture() {
    if (!camera.current || busy) return;
    setBusy(true);
    setError(null);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 1, skipProcessing: false });
      if (!photo?.uri) throw new Error("no image");

      const text = trimToIngredients(await readLabel(photo.uri));
      if (text.replace(/[^a-z]/gi, "").length < 20) {
        setError("Couldn't read that. Try filling the frame with the ingredient list.");
        return;
      }
      onLabel(text);
    } catch {
      setError("Couldn't read that one. Try again, or type the list instead.");
    } finally {
      setBusy(false);
    }
  }

  if (typing) {
    return (
      <View style={[s.pad, { backgroundColor: t.ground, flex: 1, gap: 12 }]}>
        <Text style={[s.h1, { color: t.ink }]}>Type or paste the list</Text>
        <TextInput
          multiline
          autoFocus
          value={draft}
          onChangeText={setDraft}
          placeholder="Water, Sodium Laureth Sulfate, Fragrance…"
          placeholderTextColor={t.ink3}
          style={[s.input, { backgroundColor: t.card, color: t.ink, borderColor: t.rule }]}
        />
        <Pressable
          accessibilityRole="button"
          style={[s.primary, { backgroundColor: t.ink }]}
          onPress={() => draft.trim() && onLabel(draft)}
        >
          <Text style={[s.primaryText, { color: t.ground }]}>Check it</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setTyping(false)}>
          <Text style={[s.link, { color: t.accent }]}>Use the camera instead</Text>
        </Pressable>
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <View style={[s.pad, s.center, { backgroundColor: t.ground, flex: 1, gap: 14 }]}>
        <Text style={[s.h1, { color: t.ink, textAlign: "center" }]}>Point it at the back label</Text>
        <Text style={[s.body, { color: t.ink2, textAlign: "center" }]}>
          Swaps reads the ingredient list on your device. Nothing is uploaded and nothing is stored.
        </Text>
        <Pressable
          accessibilityRole="button"
          style={[s.primary, { backgroundColor: t.ink }]}
          onPress={requestPermission}
        >
          <Text style={[s.primaryText, { color: t.ground }]}>Allow camera</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setTyping(true)}>
          <Text style={[s.link, { color: t.accent }]}>Type the list instead</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView ref={camera} style={{ flex: 1 }} facing="back" />

      <View style={s.reticle} pointerEvents="none">
        <View style={[s.frame, { borderColor: "rgba(255,255,255,0.85)" }]} />
      </View>

      <View style={[s.controls, { backgroundColor: t.ground }]}>
        {error ? <Text style={[s.error, { color: t.verdictInk.red }]}>{error}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Read this label"
          disabled={busy}
          style={[s.primary, { backgroundColor: t.ink, opacity: busy ? 0.6 : 1 }]}
          onPress={capture}
        >
          {busy
            ? <ActivityIndicator color={t.ground} />
            : <Text style={[s.primaryText, { color: t.ground }]}>Read this label</Text>}
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setTyping(true)}>
          <Text style={[s.link, { color: t.accent }]}>Type the list instead</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  pad: { padding: 20 },
  center: { justifyContent: "center" },
  h1: { fontSize: 24, fontWeight: "700", letterSpacing: -0.3 },
  body: { fontSize: 15, lineHeight: 22 },
  input: { minHeight: 160, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, textAlignVertical: "top" },
  primary: { borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  primaryText: { fontSize: 16, fontWeight: "600" },
  link: { textAlign: "center", fontSize: 15, paddingVertical: 6 },
  error: { fontSize: 14, textAlign: "center" },
  reticle: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  frame: { width: "82%", height: "42%", borderWidth: 2, borderRadius: 14, borderStyle: "dashed" },
  controls: { padding: 20, paddingBottom: 34, gap: 10 },
});
