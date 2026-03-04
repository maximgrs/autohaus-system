import React from "react";
import { Tabs, Redirect } from "expo-router";

import { FloatingTabBar } from "@/src/components/navigation/FloatingTabBar";
import { useAppEntryRoute } from "@/src/features/session/useAppEntryRoute";

export default function TabsLayout() {
  const { loading, href } = useAppEntryRoute();

  if (loading || !href) return null;

  if (!href.startsWith("/(tabs)")) {
    return <Redirect href={href} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: "#fff" },
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="bestand" options={{ title: "Bestand" }} />
      <Tabs.Screen name="neu" options={{ title: "Neu" }} />
      <Tabs.Screen name="aufgaben" options={{ title: "Aufgaben" }} />
      <Tabs.Screen name="mehr" options={{ title: "Mehr" }} />
    </Tabs>
  );
}

// import { Tabs } from "expo-router";
// import { FloatingTabBar } from "@/src/components/navigation/FloatingTabBar";

// export default function TabsLayout() {
//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: false,
//         tabBarHideOnKeyboard: true,
//         //globaler Tabs-Screen-Background
//         sceneStyle: { backgroundColor: "#fff" },
//       }}
//       tabBar={(props) => <FloatingTabBar {...props} />}
//     >
//       <Tabs.Screen name="home/index" options={{ title: "Home" }} />
//       <Tabs.Screen name="bestand/index" options={{ title: "Bestand" }} />
//       <Tabs.Screen name="neu/index" options={{ title: "Neu" }} />
//       <Tabs.Screen name="aufgaben/index" options={{ title: "Aufgaben" }} />
//       <Tabs.Screen name="mehr/dev-user" options={{ title: "Mehr" }} />
//     </Tabs>
//   );
// }
