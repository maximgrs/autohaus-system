import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

type Props = {
  title?: string;
  subtitle?: string;
  onPress: () => void;
};

const T = {
  radius: 18,
  grad: ["#135236", "#2F763E"] as const,
  shadowColor: "#000",
  shadowOpacity: 0.4,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
};

export default function HomeAddVehicleCard({
  title = "Fahrzeug hinzufügen",
  subtitle = "Neues Fahrzeug anlegen und an Inserate übergeben",
  onPress,
}: Props) {
  return (
    <View style={styles.shadowWrap}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <LinearGradient
          colors={[...T.grad]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.left}>
            <View style={styles.textBlock}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            </View>
          </View>

          <View style={styles.right}>
            <View style={styles.chev}>
              <Feather name="chevron-right" size={18} color="#fff" />
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: T.radius,
    shadowColor: T.shadowColor,
    shadowOpacity: T.shadowOpacity,
    shadowRadius: T.shadowRadius,
    shadowOffset: T.shadowOffset,
    elevation: T.elevation,
    backgroundColor: "#fff",
  },
  pressed: { opacity: 0.9 },

  card: {
    borderRadius: T.radius,
    paddingHorizontal: 16,
    paddingVertical: 25,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  left: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },

  textBlock: {
    flex: 1,
    gap: 4,
  },

  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },

  subtitle: {
    color: "#74C266",
    fontSize: 10,
    fontWeight: "500",
    maxWidth: "80%",
    lineHeight: 16,
  },

  right: { marginLeft: 10 },

  chev: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
});
