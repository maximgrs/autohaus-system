import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Variant = "primary" | "secondary";

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

const TOKENS = {
  radius: 14,

  // gradient (top-left -> bottom-right)
  primaryGradStart: "#145437",
  primaryGradEnd: "#2F763E",
  primaryText: "#FFFFFF",

  secondaryBg: "#FFFFFF",
  secondaryText: "#145437",

  // stronger 3D shadow
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 2 },
  elevation: 14,
};

export default function AppButton({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  fullWidth = true,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.outer,
        isPrimary ? styles.outerPrimary : styles.outerSecondary,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      <View style={[styles.inner, isPrimary ? null : styles.innerSecondary]}>
        {isPrimary && (
          <LinearGradient
            pointerEvents="none"
            colors={[TOKENS.primaryGradStart, TOKENS.primaryGradEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        {loading ? (
          <ActivityIndicator
            color={isPrimary ? TOKENS.primaryText : TOKENS.secondaryText}
          />
        ) : (
          <Text
            style={[
              styles.text,
              isPrimary ? styles.primaryText : styles.secondaryText,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginTop: 30,
    borderRadius: TOKENS.radius,

    shadowColor: TOKENS.shadowColor,
    shadowOpacity: TOKENS.shadowOpacity,
    shadowRadius: TOKENS.shadowRadius,
    shadowOffset: TOKENS.shadowOffset,
    elevation: TOKENS.elevation,
  },

  outerPrimary: { backgroundColor: TOKENS.primaryGradEnd },
  outerSecondary: { backgroundColor: TOKENS.secondaryBg },

  fullWidth: { alignSelf: "stretch" },

  inner: {
    height: 45,
    borderRadius: TOKENS.radius,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  innerSecondary: {
    backgroundColor: TOKENS.secondaryBg,
  },

  text: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  primaryText: { color: TOKENS.primaryText },
  secondaryText: { color: TOKENS.secondaryText },

  pressed: {
    transform: [{ translateY: 1 }],
    shadowOpacity: TOKENS.shadowOpacity * 0.75,
    elevation: Math.max(1, TOKENS.elevation - 2),
  },

  disabled: { opacity: 0.55 },
});
