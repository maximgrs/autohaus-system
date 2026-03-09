import React from "react";
import { Stack, router } from "expo-router";
import { Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import AppProviders from "@/src/providers/AppProviders";
import TasksRealtimeBridge from "@/src/features/tasks/realtime/TasksRealtimeBridge";

export default function RootLayout() {
  return (
    <AppProviders>
      <TasksRealtimeBridge />

      <Stack
        screenOptions={{
          headerShown: true,
          headerTintColor: "#000",
          headerTitleStyle: { fontWeight: "700", fontSize: 17 },
          headerBackButtonDisplayMode: "minimal",
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "#fff" },
          headerLeft: ({ tintColor, canGoBack }) =>
            canGoBack ? (
              <Pressable
                onPress={() => router.back()}
                hitSlop={10}
                style={{
                  marginLeft: 0,
                  paddingVertical: 10,
                  paddingRight: 10,
                }}
              >
                <Feather name="chevron-left" size={26} color={tintColor} />
              </Pressable>
            ) : null,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="vehicle/new"
          options={{ title: "Neues Fahrzeug" }}
        />
        <Stack.Screen
          name="vehicle/[id]"
          options={{ title: "Fahrzeug Details" }}
        />
        <Stack.Screen
          name="task/listing/[listingId]"
          options={{ title: "Aufgaben Details" }}
        />
        <Stack.Screen
          name="task/detailer/[id]"
          options={{ title: "Aufgaben Details" }}
        />
      </Stack>
    </AppProviders>
  );
}
