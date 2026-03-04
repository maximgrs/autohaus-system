import React from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  ViewProps,
  ScrollViewProps,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";

type ScreenVariant = "view" | "scroll" | "list";

type ScreenProps = {
  children: React.ReactNode;
  variant?: ScreenVariant;
  paddingHorizontal?: number;
  bottomSpace?: number;
  style?: ViewProps["style"];
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
  scrollViewProps?: Omit<ScrollViewProps, "contentContainerStyle" | "children">;
};

export default function Screen({
  children,
  variant = "view",
  paddingHorizontal = 20,
  bottomSpace = 0,
  style,
  contentContainerStyle,
  scrollViewProps,
}: ScreenProps) {
  const headerHeight = useHeaderHeight();
  const hasHeader = headerHeight > 0;

  const edges: Edge[] = hasHeader
    ? ["left", "right"]
    : ["top", "left", "right"];

  // LIST: SafeArea wrapper only (padding comes from FlatList)
  if (variant === "list") {
    return (
      <SafeAreaView edges={edges} style={styles.safe}>
        <View style={[styles.container, style]}>{children}</View>
      </SafeAreaView>
    );
  }

  // SCROLL: Screen owns ScrollView + padding in contentContainer
  if (variant === "scroll") {
    return (
      <SafeAreaView edges={edges} style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
          {...scrollViewProps}
          contentContainerStyle={[
            { paddingHorizontal, paddingBottom: bottomSpace },
            contentContainerStyle,
          ]}
        >
          <View style={style}>{children}</View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // VIEW: normal non-scroll, Screen applies padding
  return (
    <SafeAreaView edges={edges} style={styles.safe}>
      <View
        style={[
          styles.container,
          { paddingHorizontal, paddingBottom: bottomSpace },
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1 },
});
