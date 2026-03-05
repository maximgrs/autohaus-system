import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";

import Screen from "@/src/components/ui/Screen";
import { useAppEntryRoute } from "@/src/features/session/useAppEntryRoute";

export default function Entry() {
  const { loading, href } = useAppEntryRoute();

  if (loading || !href) {
    return (
      <Screen variant="scroll" bottomSpace={120}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Lade…</Text>
        </View>
      </Screen>
    );
  }

  return <Redirect href={"./tabs/home"} />;
}

const styles = StyleSheet.create({
  center: { paddingHorizontal: 20, paddingTop: 24, gap: 12 },
  muted: { fontSize: 13, fontWeight: "700", color: "rgba(0,0,0,0.55)" },
});
