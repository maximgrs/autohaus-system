import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

type FeatherName = keyof typeof Feather.glyphMap;

type Props = {
  label: string; // z.B. "Bestand"
  value: string | number; // z.B. 300
  unit: string; // "Fahrzeuge" | "Aufgaben"
  icon: FeatherName;
  tone?: "primary" | "neutral";
};

const T = {
  radius: 16,
  padV: 25,

  gradPrimary: ["#125035", "#2F773E"] as const,
  gradNeutral: ["#F0F0F0", "#EDEDED"] as const,

  valuePrimary: "#FFFFFF",
  valueNeutral: "#0F172A",

  labelPrimary: "rgba(255,255,255,0.95)",
  labelNeutral: "#0F172A",

  accent: "#74C266",

  shadowColor: "#000",
  shadowOpacity: 0.4,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
};

export default function HomeStatCard({
  label,
  value,
  unit,
  icon,
  tone = "neutral",
}: Props) {
  const isPrimary = tone === "primary";
  const colors = isPrimary ? T.gradPrimary : T.gradNeutral;

  return (
    <View style={styles.shadowWrap}>
      <LinearGradient
        colors={[...colors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.card, isPrimary && styles.cardPrimary]}
      >
        {/* Top row (centered) */}
        <View style={styles.topRow}>
          <View style={styles.topRowInner}>
            <Feather
              name={icon}
              size={18}
              color={isPrimary ? "#FFFFFF" : "#0F172A"}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.topLabel,
                { color: isPrimary ? T.labelPrimary : T.labelNeutral },
              ]}
            >
              {label}
            </Text>
          </View>
        </View>

        {/* Value (centered) */}
        <Text
          style={[
            styles.value,
            { color: isPrimary ? T.valuePrimary : T.valueNeutral },
          ]}
        >
          {value}
        </Text>

        {/* Unit (centered, always green) */}
        <Text style={styles.unit}>{unit}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    flex: 1,
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
    paddingVertical: T.padV,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    minHeight: 110,
    gap: 10,
  },

  cardPrimary: {
    borderColor: "rgba(0,0,0,0.0)",
  },

  topRow: {
    alignItems: "center",
  },
  topRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topLabel: {
    fontSize: 15,
    fontWeight: "500",
  },

  value: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  unit: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
    color: T.accent,
  },
});
