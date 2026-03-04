import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import StatusBadge from "./StatusBadge";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  title: string;
  badgeLabel: string;
  badgeTone: "pending" | "done";
  subtitle: string;
  meta?: string;
  onPress?: () => void;
};

const TOKENS = {
  grad: ["#F0F0F0", "#EDEDED"] as const,
  text: "#0F172A",
  muted: "rgba(15,23,42,0.65)",
  radius: 15,

  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
};

function DashboardCardBase({
  title,
  badgeLabel,
  badgeTone,
  subtitle,
  meta,
  onPress,
}: Props) {
  const clickable = !!onPress;

  return (
    <View style={styles.shadowWrap}>
      <Pressable
        onPress={onPress}
        disabled={!clickable}
        style={({ pressed }) => [
          styles.pressable,
          clickable && pressed && styles.pressed,
        ]}
      >
        <LinearGradient
          colors={TOKENS.grad}
          start={{ x: 0.4, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={styles.card}
        >
          <View style={styles.topRow}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <StatusBadge label={badgeLabel} tone={badgeTone} />
          </View>

          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>

          {!!meta ? (
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

export default memo(DashboardCardBase);

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: TOKENS.radius,
    backgroundColor: "#fff",
    shadowColor: TOKENS.shadowColor,
    shadowOpacity: TOKENS.shadowOpacity,
    shadowRadius: TOKENS.shadowRadius,
    shadowOffset: TOKENS.shadowOffset,
    elevation: TOKENS.elevation,
  },

  pressable: { borderRadius: TOKENS.radius },
  pressed: { opacity: 0.9 },
  card: {
    borderRadius: TOKENS.radius,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 6,
    overflow: "hidden", // wichtig: Gradient sauber clippen
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: TOKENS.text,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: TOKENS.muted,
  },
  meta: {
    fontSize: 11,
    fontWeight: "500",
    color: TOKENS.muted,
  },
});
