import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

type Tone = "pending" | "done";

type Props = {
  label: string;
  tone: Tone;
};

const TOKENS = {
  pendingBg: "rgba(231, 213, 107, 0.45)",
  pendingText: "#6B5B00",

  doneBg: "rgba(116, 194, 102, 0.45)",
  doneText: "#1F7A3A",

  radius: 999,
};

function StatusBadgeBase({ label, tone }: Props) {
  const bg = tone === "pending" ? TOKENS.pendingBg : TOKENS.doneBg;
  const color = tone === "pending" ? TOKENS.pendingText : TOKENS.doneText;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

export default memo(StatusBadgeBase);

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: TOKENS.radius,
  },
  text: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
