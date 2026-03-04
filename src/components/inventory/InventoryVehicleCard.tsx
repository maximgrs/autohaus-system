import React, { memo } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  imageUrl?: string | null;
  title: string;
  vin?: string | null;
  priceLabel?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const T = {
  radius: 14,
  grad: ["#e3e3e3", "#dedede"] as const,

  modelSize: 13,
  vinSize: 10,
  priceSize: 13,

  vinColor: "rgba(0,0,0,0.45)",

  shadowColor: "#000",
  shadowOpacity: 0.11,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 10 },
  elevation: 5,

  imageH: 115,
  textPad: 12,

  // --- neu: garantierte Höhe für gleichmäßige Cards
  // 2 Zeilen Title + VIN + Price + gaps
  textMinH: 72,
};

function InventoryVehicleCardBase({
  imageUrl,
  title,
  vin,
  priceLabel,
  onPress,
  style,
}: Props) {
  return (
    <View style={[styles.shadowWrap, style]}>
      <Pressable
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          pressed && onPress ? { opacity: 0.92 } : null,
        ]}
      >
        <View style={styles.card}>
          <LinearGradient
            colors={[...T.grad]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Text style={styles.placeholderText}>Kein Bild</Text>
            </View>
          )}

          <View style={styles.textBlock}>
            <Text numberOfLines={2} style={styles.model}>
              {title}
            </Text>

            {!!vin && (
              <Text numberOfLines={1} style={styles.vin}>
                VIN: {vin}
              </Text>
            )}

            {!!priceLabel && (
              <Text numberOfLines={1} style={styles.price}>
                {priceLabel}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export default memo(InventoryVehicleCardBase);

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: T.radius,
    backgroundColor: "transparent",
    shadowColor: T.shadowColor,
    shadowOpacity: T.shadowOpacity,
    shadowRadius: T.shadowRadius,
    shadowOffset: T.shadowOffset,
    elevation: T.elevation,
  },

  pressable: {
    borderRadius: T.radius,
  },

  card: {
    borderRadius: T.radius,
    overflow: "hidden",
    minHeight: 210,
  },

  image: {
    width: "100%",
    height: T.imageH,
    borderRadius: T.radius,
  },

  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d1d1d1",
  },

  placeholderText: {
    color: "rgba(0,0,0,0.45)",
    fontWeight: "600",
  },

  // neu: minHeight damit Cards nicht "springen"
  textBlock: {
    padding: T.textPad,
    gap: 4,
    minHeight: T.textMinH,
    justifyContent: "flex-start",
  },

  model: {
    fontSize: T.modelSize,
    fontWeight: "800",
    color: "#000",
  },

  vin: {
    fontSize: T.vinSize,
    fontWeight: "500",
    color: T.vinColor,
  },

  price: {
    fontSize: T.priceSize,
    fontWeight: "800",
    color: "#000",
  },
});
