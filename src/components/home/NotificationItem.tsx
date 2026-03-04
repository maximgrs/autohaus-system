import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type FeatherName = keyof typeof Feather.glyphMap;

type Props = {
  title: string;
  subtitle?: string;
  icon?: FeatherName;
  tone?: "neutral" | "success" | "warning";
  rightText?: string; // z.B. "Heute"
};

const T = {
  radius: 16,
  gradNeutral: ["#F0F0F0", "#EDEDED"] as const,

  shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,

  text: "#0F172A",
  muted: "rgba(15,23,42,0.55)",
  accent: "#74C266",
  warning: "#C98A1A",
};

export default function NotificationItem({
  title,
  subtitle,
  icon = "bell",
  tone = "neutral",
  rightText,
}: Props) {
  const dotColor =
    tone === "success"
      ? T.accent
      : tone === "warning"
        ? T.warning
        : "rgba(0,0,0,0.25)";

  return (
    <View style={styles.shadowWrap}>
      <LinearGradient
        colors={[...T.gradNeutral]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={[styles.dot, { backgroundColor: dotColor }]} />

        <View style={styles.iconWrap}>
          <Feather name={icon} size={18} color={T.text} />
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          )}
        </View>

        {!!rightText && (
          <Text style={styles.rightText} numberOfLines={1}>
            {rightText}
          </Text>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: T.radius,
    shadowColor: T.shadowColor,
    shadowOpacity: T.shadowOpacity,
    shadowRadius: T.shadowRadius,
    shadowOffset: T.shadowOffset,
    elevation: T.elevation,
    backgroundColor: "#fff",
  },

  card: {
    borderRadius: T.radius,
    paddingHorizontal: 14,
    paddingVertical: 14,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },

  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },

  textBlock: {
    flex: 1,
    gap: 4,
  },

  title: {
    fontSize: 14,
    fontWeight: "800",
    color: T.text,
  },

  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: T.muted,
    lineHeight: 16,
  },

  rightText: {
    fontSize: 12,
    fontWeight: "700",
    color: T.muted,
    marginLeft: 6,
  },
});
