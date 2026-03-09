import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export type ChipOption<T extends string> = {
  key: T;
  label: string;
};

type Props<T extends string> = {
  options: ChipOption<T>[];
  value: T;
  onChange: (next: T) => void;
};

const TOKENS = {
  greenFrom: "#145437",
  greenTo: "#2F763E",
  grayFrom: "#F0F0F0",
  grayTo: "#EDEDED",
  text: "#000000",
  textActive: "#FFFFFF",
  radius: 999,
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

function FilterChipsBase<T extends string>({
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const active = opt.key === value;
        const grad = active
          ? ([TOKENS.greenFrom, TOKENS.greenTo] as const)
          : ([TOKENS.grayFrom, TOKENS.grayTo] as const);

        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={({ pressed }) => [
              styles.chipShadow,
              pressed ? { opacity: 0.88 } : null,
            ]}
            hitSlop={10}
          >
            <LinearGradient colors={grad} style={styles.chip}>
              <Text
                style={[
                  styles.label,
                  active ? styles.labelActive : styles.labelInactive,
                ]}
              >
                {opt.label}
              </Text>
            </LinearGradient>
          </Pressable>
        );
      })}
    </View>
  );
}

const FilterChips = memo(FilterChipsBase) as typeof FilterChipsBase;
export default FilterChips;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
  },
  chipShadow: {
    borderRadius: TOKENS.radius,
    shadowColor: TOKENS.shadowColor,
    shadowOpacity: TOKENS.shadowOpacity,
    shadowRadius: TOKENS.shadowRadius,
    shadowOffset: TOKENS.shadowOffset,
    elevation: TOKENS.elevation,
  },
  chip: {
    borderRadius: TOKENS.radius,
    paddingHorizontal: 20,
    paddingVertical: 15,
    overflow: "hidden",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  labelInactive: {
    color: TOKENS.text,
  },
  labelActive: {
    color: TOKENS.textActive,
  },
});
