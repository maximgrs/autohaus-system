import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  imageUrls: string[];
  arrivedLabel?: string;
};

const T = {
  radius: 16,
  bg: "#F2F2F2",

  textMuted: "rgba(0,0,0,1)",

  badgeGrad: ["#145437", "#2F763E"] as const,
  badgeText: "#fff",

  // kleiner als vorher (0.60)
  ratio: 0.56,
};

export default function VehicleImageCarousel({
  imageUrls,
  arrivedLabel,
}: Props) {
  const { width: windowW } = useWindowDimensions();
  const listRef = useRef<FlatList<string>>(null);

  const [index, setIndex] = useState(0);
  const [containerW, setContainerW] = useState<number>(0);

  const count = imageUrls?.length ?? 0;
  const hasImages = count > 0;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setContainerW((prev) => (prev === w ? prev : w));
  }, []);

  // Fallback (falls Layout noch nicht gemessen): window - 40
  const w = useMemo(() => {
    return containerW > 0 ? containerW : windowW - 40;
  }, [containerW, windowW]);

  const h = useMemo(() => Math.round(w * T.ratio), [w]);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!hasImages) return;

      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / w);
      setIndex(Math.max(0, Math.min(next, Math.max(0, count - 1))));
    },
    [count, hasImages, w],
  );

  React.useEffect(() => {
    setIndex(0);
  }, [count]);

  const badgeText = hasImages
    ? `${Math.min(index + 1, count)}/${count}`
    : "0/0";

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      <View style={[styles.carousel, { height: h }]}>
        {hasImages ? (
          <FlatList
            ref={listRef}
            data={imageUrls}
            keyExtractor={(u, i) => `${u}-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            contentInsetAdjustmentBehavior="never"
            renderItem={({ item }) => (
              <View style={{ width: w, height: h }}>
                <Image
                  source={{ uri: item }}
                  resizeMode="cover"
                  style={styles.imageFill}
                />
              </View>
            )}
          />
        ) : (
          <View style={[styles.placeholder, { height: h }]}>
            <Text style={styles.placeholderText}>Kein Bild verfügbar</Text>
          </View>
        )}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.arrived} numberOfLines={1}>
          {arrivedLabel ?? ""}
        </Text>

        <LinearGradient
          colors={[...T.badgeGrad]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.badge}
        >
          <Text style={styles.badgeText}>{badgeText}</Text>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 5 },

  carousel: {
    borderRadius: T.radius,
    overflow: "hidden",
    backgroundColor: T.bg,
  },

  imageFill: {
    width: "100%",
    height: "100%",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  arrived: {
    flex: 1,
    color: T.textMuted,
    fontWeight: "400",
    fontSize: 10,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: {
    color: T.badgeText,
    fontWeight: "600",
    fontSize: 10,
  },

  placeholder: {
    backgroundColor: T.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderText: {
    color: T.textMuted,
    fontWeight: "600",
  },
});
