import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

type Props = {
  imageUrl?: string | null;
  model: string;
  vin: string;
};

const TOKENS = {
  height: 170,
  radiusTop: 15,

  bg: "#FFFFFF",
  text: "#000",

  shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  elevation: 7,
};

export default function ContractVehicleHeroCard({
  imageUrl,
  model,
  vin,
}: Props) {
  return (
    <View style={styles.shadowWrap}>
      <View style={styles.card}>
        <View style={styles.imageWrap}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imageFallback} />
          )}
        </View>

        <View style={styles.meta}>
          <Text style={styles.model} numberOfLines={1}>
            {model}
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
    borderTopLeftRadius: TOKENS.radiusTop,
    borderTopRightRadius: TOKENS.radiusTop,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,

    backgroundColor: TOKENS.bg,
    shadowColor: TOKENS.shadowColor,
    shadowOpacity: TOKENS.shadowOpacity,
    shadowRadius: TOKENS.shadowRadius,
    shadowOffset: TOKENS.shadowOffset,
    elevation: TOKENS.elevation,
  },

  card: {
    height: TOKENS.height,
    overflow: "hidden",

    borderTopLeftRadius: TOKENS.radiusTop,
    borderTopRightRadius: TOKENS.radiusTop,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,

    backgroundColor: TOKENS.bg,
  },

  imageWrap: { flex: 1 },

  image: { width: "100%", height: "100%" },

  imageFallback: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },

  meta: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: TOKENS.bg,
    gap: 3,
  },

  model: {
    fontSize: 15,
    fontWeight: "800",
    color: TOKENS.text,
  },

  vin: {
    fontSize: 13,
    fontWeight: "500",
    color: TOKENS.text,
    opacity: 0.9,
  },
});
