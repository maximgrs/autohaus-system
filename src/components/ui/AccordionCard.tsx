import React, { useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type Props = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;

  actionLabel?: string; // z.B. "alles anzeigen"
  onActionPress?: () => void;
};

const TOKENS = {
  radius: 15,
  bg: "#F2F2F2",
  text: "#000",
  green: "#2E7D32",
  btnTextColor: "#fff",

  badgeGrad: ["#145437", "#2F763E"] as const,

  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};

export default function AccordionCard({
  title,
  defaultOpen = false,
  children,
  actionLabel,
  onActionPress,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const chevron = useMemo(() => (open ? "chevron-up" : "chevron-down"), [open]);

  const onToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  const showAction = !!actionLabel && !!onActionPress;

  return (
    <View style={styles.shadowWrap}>
      <View style={styles.card}>
        <View style={styles.inner}>
          <Pressable onPress={onToggle} style={styles.header} hitSlop={8}>
            <View style={styles.left}>
              <View style={styles.leftBar} />
              <Text style={styles.title}>{title}</Text>
            </View>

            <View style={styles.right}>
              {showAction ? (
                <Pressable
                  onPress={onActionPress}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    pressed ? { transform: [{ scale: 0.96 }] } : null,
                  ]}
                >
                  <LinearGradient
                    colors={[...TOKENS.badgeGrad]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientBtn}
                  >
                    <Text style={styles.actionText}>{actionLabel}</Text>
                  </LinearGradient>
                </Pressable>
              ) : null}

              <Feather name={chevron} size={18} color={TOKENS.text} />
            </View>
          </Pressable>

          {open ? <View style={styles.body}>{children}</View> : null}
        </View>
      </View>
    </View>
  );
}

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

  card: {
    borderRadius: TOKENS.radius,
    overflow: "hidden",
    backgroundColor: TOKENS.bg,
  },

  inner: {
    padding: 20,
    gap: 16,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },

  leftBar: {
    width: 3,
    height: 20,
    borderRadius: 999,
    backgroundColor: TOKENS.green,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: TOKENS.text,
    flexShrink: 1,
  },

  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  actionBtn: {
    borderRadius: 999,
    overflow: "hidden",
  },

  gradientBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  actionText: {
    color: TOKENS.btnTextColor,
    fontWeight: "700",
    fontSize: 10,
  },

  body: {
    gap: 12,
  },
});
