import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode; // z.B. Avatar/Profilbutton
};

export default function HomeHeader({ title, subtitle, rightSlot }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {!!rightSlot && <View style={styles.right}>{rightSlot}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flex: 1, gap: 3 },
  right: { marginLeft: 12 },
  title: { fontSize: 30, fontWeight: "800", color: "#145236" },
  subtitle: { fontSize: 13, fontWeight: "500", color: "rgba(15,23,42,0.55)" },
});
