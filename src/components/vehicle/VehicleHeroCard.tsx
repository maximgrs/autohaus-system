import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  vin: string;
};

const T = {
  radius: 16,
  grad: ["#e9e9e9", "#e1e1e1"] as const,

  text: "#0F172A",
  muted: "rgba(15,23,42,0.60)",

  shadowColor: "#000",
  shadowOpacity: 0,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  elevation: 5,
};

export default function VehicleHeroCard({ title, vin }: Props) {
  return (
    <View style={styles.shadowWrap}>
      <View style={styles.card}>
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.vin} numberOfLines={1}>
            vin: {vin}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: T.radius,
    backgroundColor: "#fff",
    shadowColor: T.shadowColor,
    shadowOpacity: T.shadowOpacity,
    shadowRadius: T.shadowRadius,
    shadowOffset: T.shadowOffset,
    elevation: T.elevation,
  },

  card: {
    borderRadius: T.radius,
    overflow: "hidden",
    backgroundColor: "#F2F2F2",
  },

  image: { width: "100%", height: "100%", resizeMode: "cover" },

  meta: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },

  title: {
    fontSize: 14,
    fontWeight: "800",
    color: T.text,
  },

  vin: {
    fontSize: 11,
    fontWeight: "600",
    color: T.muted,
  },
});
