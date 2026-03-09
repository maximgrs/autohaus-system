import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { useAppEntryRoute } from "@/src/features/session";

export default function TabsLayout() {
  const { loading, href } = useAppEntryRoute();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  if (!href) {
    return null;
  }

  if (href !== "/(tabs)/home") {
    return <Redirect href={href} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#145437",
        tabBarInactiveTintColor: "rgba(0,0,0,0.45)",
        tabBarStyle: {
          height: 86,
          paddingTop: 8,
          paddingBottom: 18,
          backgroundColor: "#fff",
          borderTopColor: "rgba(0,0,0,0.06)",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bestand"
        options={{
          title: "Bestand",
          tabBarIcon: ({ color, size }) => (
            <Feather name="archive" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="neu"
        options={{
          title: "Neu",
          tabBarIcon: ({ color, size }) => (
            <Feather name="plus-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="aufgaben"
        options={{
          title: "Aufgaben",
          tabBarIcon: ({ color, size }) => (
            <Feather name="check-square" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mehr"
        options={{
          title: "Mehr",
          tabBarIcon: ({ color, size }) => (
            <Feather name="menu" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
