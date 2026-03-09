import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";

import { useAppEntryRoute } from "@/src/features/session";

export default function IndexPage() {
  const { loading, href } = useAppEntryRoute();

  if (loading || !href) {
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

  return <Redirect href={href} />;
}
