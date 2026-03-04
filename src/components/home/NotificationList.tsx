import React from "react";
import { StyleSheet, Text, View } from "react-native";
import NotificationItem from "./NotificationItem";

export type Notification = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: any;
  tone?: "neutral" | "success" | "warning";
  rightText?: string;
};

type Props = {
  title?: string;
  items: Notification[];
};

export default function NotificationList({
  title = "Mitteilungen",
  items,
}: Props) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.list}>
        {items.map((n) => (
          <NotificationItem
            key={n.id}
            title={n.title}
            subtitle={n.subtitle}
            icon={n.icon}
            tone={n.tone}
            rightText={n.rightText}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 10,
  },
  list: {
    gap: 10,
  },
});
