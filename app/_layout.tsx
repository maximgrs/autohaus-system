import { Stack, router } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: true,
          headerTintColor: "#000",
          headerTitleStyle: { fontWeight: "700", fontSize: 17 },
          headerBackButtonDisplayMode: "minimal", // pfeil ohne text
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "#fff" }, // globaler Screen background

          // damit der Abstand passt
          headerLeft: ({ tintColor, canGoBack }) =>
            canGoBack ? (
              <Pressable
                onPress={() => router.back()}
                hitSlop={10}
                style={{ marginLeft: 0, paddingVertical: 10, paddingRight: 10 }}
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
        <Stack.Screen
          name="sale/contract/[saleId]/step1"
          options={{ title: "Kaufvertrag" }}
        />
        <Stack.Screen
          name="sale/contract/[saleId]/step2"
          options={{ title: "Kaufvertrag" }}
        />
        <Stack.Screen
          name="sale/contract/[saleId]/step3"
          options={{ title: "Kaufvertrag" }}
        />
        <Stack.Screen
          name="sale/prep/[saleId]"
          options={{ title: "Vorbereitung" }}
        />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
