import React, { useCallback, useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

export type SpecItem = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
};

type Props = {
  items: SpecItem[];
};

const T = {
  gap: 10,
  radius: 14,
  chipBg: "#FFFFFF",
  chipBorder: "rgba(0,0,0,0.06)",

  iconBg: "rgba(46,125,50,0.10)",
  iconColor: "#2E7D32",

  label: "rgba(0,0,0,0.7)",
  text: "#000",

  // responsive thresholds
  // 165 war zu hoch wegen Container-Paddings -> iPhone Pro landete fälschlich bei 1 Spalte.
  minColWidth: 140,
};

export default function SpecGrid({ items }: Props) {
  const [gridW, setGridW] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setGridW((prev) => (prev === w ? prev : w));
  }, []);

  const layout = useMemo(() => {
    if (!gridW) return { columns: 2 as 1 | 2, colW: 0 };

    const twoColW = Math.floor((gridW - T.gap) / 2);
    const columns: 1 | 2 = twoColW < T.minColWidth ? 1 : 2;
    const colW = columns === 1 ? gridW : twoColW;

    return { columns, colW };
  }, [gridW]);

  const lastIndex = items.length - 1;

  return (
    <View style={styles.grid} onLayout={onLayout}>
      {items.map((it, idx) => {
        const isOddLastFullWidth =
          layout.columns === 2 &&
          items.length % 2 === 1 &&
          idx === lastIndex &&
          gridW > 0;

        const widthStyle =
          gridW > 0
            ? { width: isOddLastFullWidth ? gridW : layout.colW }
            : undefined;

        return (
          <View key={`${it.label}-${idx}`} style={[styles.chip, widthStyle]}>
            <View style={styles.iconWrap}>
              <Feather name={it.icon} size={16} color={T.iconColor} />
            </View>

            <View style={styles.textWrap}>
              <Text style={styles.label} numberOfLines={1}>
                {it.label}
              </Text>
              <Text style={styles.value} numberOfLines={2}>
                {it.value}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: T.gap,
    rowGap: T.gap,
  },

  chip: {
    backgroundColor: T.chipBg,
    borderRadius: T.radius,
    padding: 12,
    borderWidth: 1,
    borderColor: T.chipBorder,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: T.iconBg,
    alignItems: "center",
    justifyContent: "center",
  },

  textWrap: {
    flex: 1,
    gap: 2,
  },

  label: {
    fontSize: 10,
    fontWeight: "500",
    color: T.label,
  },

  value: {
    fontSize: 11,
    fontWeight: "700",
    color: T.text,
  },
});
