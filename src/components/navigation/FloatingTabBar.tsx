import React, { memo, useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type FeatherName = keyof typeof Feather.glyphMap;

const UI = {
  hPadding: 35, // Abstand links/rechts vom Screen
  bottomGap: 20, // Abstand zum SafeArea bottom
  height: 76,
  radius: 999,
  itemRadius: 16,
  iconSize: 22,
  liftFocused: -3,
  labelGap: 6,

  gradient: ["#F0F0F0", "#EDEDED"] as const,

  active: "#1F7A3A",
  inactive: "rgba(0,0,0,0.55)",

  shadow: {
    color: "#000",
    opacity: 0.25,
    radius: 4,
    offsetY: 4,
    elevation: 6,
  },
};

const ICONS: Record<string, FeatherName> = {
  home: "home",
  bestand: "database",
  neu: "plus-square",
  aufgaben: "check-square",
  mehr: "more-horizontal",
};

// ✅ feste Reihenfolge (wie du willst)
const ORDER = ["home", "bestand", "neu", "aufgaben", "mehr"] as const;

function normalizeRouteName(name: string) {
  // "neu/index" -> "neu"
  return name.endsWith("/index") ? name.replace("/index", "") : name;
}

function getLabel(options: any, fallback: string) {
  if (typeof options.tabBarLabel === "string") return options.tabBarLabel;
  if (typeof options.title === "string") return options.title;
  return normalizeRouteName(fallback);
}

function getIcon(routeName: string): FeatherName {
  const key = normalizeRouteName(routeName);
  return ICONS[key] ?? "circle";
}

function orderIndex(routeName: string) {
  const key = normalizeRouteName(routeName);
  const idx = ORDER.indexOf(key as any);
  return idx === -1 ? 999 : idx;
}

function FloatingTabBarBase({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, UI.bottomGap);

  const focusedKey = state.routes[state.index]?.key;

  // ✅ erzwinge gewünschte Reihenfolge unabhängig von state.routes Reihenfolge
  const routes = useMemo(() => {
    const copy = [...state.routes];

    // optional: nur die Tabs rendern, die wir kennen (falls Expo Router extra routes reinmischt)
    const filtered = copy.filter((r) => {
      const key = normalizeRouteName(r.name);
      return key in ICONS;
    });

    filtered.sort((a, b) => orderIndex(a.name) - orderIndex(b.name));
    return filtered;
  }, [state.routes]);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View
        pointerEvents="box-none"
        style={[styles.container, { paddingBottom: bottomPadding }]}
      >
        <View style={styles.shadowWrap}>
          <LinearGradient
            colors={[...UI.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pill}
          >
            {routes.map((route) => {
              const isFocused = focusedKey === route.key;
              const options = descriptors[route.key]?.options ?? {};
              const label = getLabel(options, route.name);
              const iconName = getIcon(route.name);

              const onPress = () => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name as never);
                }
              };

              const onLongPress = () => {
                navigation.emit({ type: "tabLongPress", target: route.key });
              };

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.item,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[styles.content, isFocused && styles.contentFocused]}
                  >
                    <Feather
                      name={iconName}
                      size={UI.iconSize}
                      color={isFocused ? UI.active : UI.inactive}
                    />

                    {isFocused ? (
                      <Text numberOfLines={1} style={styles.label}>
                        {label}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </LinearGradient>
        </View>
      </View>
    </View>
  );
}

export const FloatingTabBar = memo(FloatingTabBarBase);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 10,
    paddingHorizontal: UI.hPadding,
    alignItems: "center",
    justifyContent: "flex-end",
  },

  shadowWrap: {
    width: "100%",
    borderRadius: UI.radius,
    backgroundColor: Platform.OS === "android" ? "#fff" : "transparent",
    shadowColor: UI.shadow.color,
    shadowOpacity: UI.shadow.opacity,
    shadowRadius: UI.shadow.radius,
    shadowOffset: { width: 0, height: UI.shadow.offsetY },
    elevation: UI.shadow.elevation,
  },

  pill: {
    width: "100%",
    height: UI.height,
    borderRadius: UI.radius,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 8,
    overflow: "hidden",
  },

  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: UI.itemRadius,
  },

  pressed: {
    opacity: 0.85,
  },

  content: {
    alignItems: "center",
    justifyContent: "center",
    gap: UI.labelGap,
  },

  contentFocused: {
    transform: [{ translateY: UI.liftFocused }],
  },

  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    color: UI.active,
  },
});
