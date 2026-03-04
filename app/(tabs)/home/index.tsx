import Screen from "@/src/components/ui/Screen";
import HomeHeader from "@/src/components/home/HomeHeader";
import HomeStatCard from "@/src/components/home/HomeStatCard";
import { View } from "react-native";
import HomeAddVehicleCard from "@/src/components/home/HomeAddVehicleCard";
import { router } from "expo-router";
import NotificationList, {
  Notification,
} from "@/src/components/home/NotificationList";
import { useEffect } from "react";
import { supabase } from "@/src/lib/supabase";

const items: Notification[] = [
  {
    id: "1",
    title: "Neues Fahrzeug wartet auf Inserat",
    subtitle: "VIN: WVWZZZ... · Bitte in CarX anlegen",
    tone: "warning",
    icon: "alert-circle",
    rightText: "Heute",
  },
  {
    id: "2",
    title: "Aufbereiter abgeschlossen",
    subtitle: "Jeep Compass · Intake-Doku verfügbar",
    tone: "success",
    icon: "check-circle",
    rightText: "Gestern",
  },
];

export default function HomeScreen() {
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id")
        .limit(1);
      console.log("Home vehicles test:", { data, error });
    })();
  }, []);

  return (
    <Screen variant="scroll" bottomSpace={160}>
      <View style={{ gap: 30 }}>
        <HomeHeader
          title="T & A Autoshop"
          subtitle="Gebrauchtwagen Fahrzeuge"
          rightSlot={
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 999,
                backgroundColor: "#EBEBEB",
              }}
            />
          }
        />

        <View style={{ flexDirection: "row", gap: 15 }}>
          <HomeStatCard
            tone="primary"
            label="Bestand"
            value={300}
            unit="Fahrzeuge"
            icon="database"
          />
          <HomeStatCard
            label="Aufgaben"
            value={10}
            unit="Offen"
            icon="check-square"
          />
          <HomeStatCard
            label="Verkauft"
            value={21}
            unit="Fahrzeuge"
            icon="shopping-bag"
          />
        </View>

        <HomeAddVehicleCard onPress={() => router.push("/vehicle/new")} />
        <NotificationList items={items.slice(0, 5)} />
      </View>
    </Screen>
  );
}
