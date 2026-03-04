import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import Screen from "@/src/components/ui/Screen";
import AccordionCard from "@/src/components/ui/AccordionCard";
import ImagePickerField from "@/src/components/ui/ImagePickerField";
import TextField from "@/src/components/ui/TextField";
import TextArea from "@/src/components/ui/TextArea";
import SwitchField from "@/src/components/ui/SwitchField";
import AppButton from "@/src/components/ui/AppButton";
import { supabase } from "@/src/lib/supabase";
import { uploadImagesToBucket } from "@/src/features/vehicles/storage.upload";

export default function NewVehicle() {
  const [vehiclePhotos, setVehiclePhotos] = useState<string[]>([]);
  const [docPhotos, setDocPhotos] = useState<string[]>([]);
  const [hasRims, setHasRims] = useState(false);

  const [model, setModel] = useState("");
  const [vin, setVin] = useState("");
  const [year, setYear] = useState("");
  const [keyCount, setKeyCount] = useState("");
  const [tireCount, setTireCount] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!vin.trim()) {
      Alert.alert("Fehlt etwas", "Bitte VIN eingeben.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        vin: vin.trim(),
        status: "draft",
        draft_model: model.trim() || null,
        draft_year: year.trim() ? Number(year) : null,
        key_count: keyCount.trim() ? Number(keyCount) : 0,
        tire_count: tireCount.trim() ? Number(tireCount) : 4,
        has_rims: hasRims,
        purchase_price: purchasePrice.trim()
          ? Number(purchasePrice.replace(",", "."))
          : null,
        target_selling_price: sellingPrice.trim()
          ? Number(sellingPrice.replace(",", "."))
          : null,
        draft_notes: notes.trim() || null,
        internal_image_urls: [],
        registration_doc_urls: [],
      };

      // 1) Insert
      const { data: created, error: insertError } = await supabase
        .from("vehicles")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) throw insertError;

      const vehicleId = created.id;

      // 2) Upload
      const [photoPaths, docPaths] = await Promise.all([
        vehiclePhotos.length
          ? uploadImagesToBucket({
              bucket: "vehicle-photos",
              vehicleId,
              uris: vehiclePhotos,
            })
          : Promise.resolve([]),
        docPhotos.length
          ? uploadImagesToBucket({
              bucket: "vehicle-docs",
              vehicleId,
              uris: docPhotos,
            })
          : Promise.resolve([]),
      ]);

      // 3) Update
      const { error: updateError } = await supabase
        .from("vehicles")
        .update({
          internal_image_urls: photoPaths,
          registration_doc_urls: docPaths,
        })
        .eq("id", vehicleId);

      if (updateError) throw updateError;

      Alert.alert("Upload erfolgreich", "Fahrzeug wurde gespeichert.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (e: any) {
      Alert.alert("Fehler", e?.message ?? "Etwas ist schief gelaufen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen variant="scroll" bottomSpace={140}>
      <View style={{ gap: 15 }}>
        <AccordionCard title="Fahrzeug Fotos" defaultOpen>
          <ImagePickerField value={vehiclePhotos} onChange={setVehiclePhotos} />
        </AccordionCard>

        <AccordionCard title="Zulassung / Typenschein">
          <ImagePickerField value={docPhotos} onChange={setDocPhotos} max={6} />
        </AccordionCard>

        <AccordionCard title="Fahrzeugdaten">
          <TextField
            label="Modell"
            value={model}
            onChangeText={setModel}
            placeholder="z.B. BMW 320d"
          />
          <TextField
            label="VIN"
            value={vin}
            onChangeText={setVin}
            placeholder="z.B. WBA..."
            autoCapitalize="characters"
          />
          <TextField
            label="Baujahr"
            value={year}
            onChangeText={setYear}
            placeholder="z.B. 2019"
            keyboardType="numeric"
          />

          {/* Schlüssel + Reifen nebeneinander */}
          <View style={styles.row}>
            <View style={styles.col}>
              <TextField
                label="Schlüssel"
                value={keyCount}
                onChangeText={setKeyCount}
                placeholder="z.B. 2"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.gap} />

            <View style={styles.col}>
              <TextField
                label="Reifen"
                value={tireCount}
                onChangeText={setTireCount}
                placeholder="z.B. 4"
                keyboardType="numeric"
              />
            </View>
          </View>

          <SwitchField
            label="Felgen"
            valueLabel={hasRims ? "Mit Felgen" : "Ohne Felgen"}
            value={hasRims}
            onChange={setHasRims}
          />
          <View style={styles.row}>
            <View style={styles.col}>
              <TextField
                label="Einkaufspreis"
                value={purchasePrice}
                onChangeText={setPurchasePrice}
                placeholder="z.B. 12000"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.gap} />

            <View style={styles.col}>
              <TextField
                label="Verkaufspreis"
                value={sellingPrice}
                onChangeText={setSellingPrice}
                placeholder="z.B. 14990"
                keyboardType="numeric"
              />
            </View>
          </View>

          <TextArea
            label="Beschreibung"
            value={notes}
            onChangeText={setNotes}
            placeholder="Zustand, Service, Mängel, Besonderheiten..."
          />
        </AccordionCard>

        <AppButton
          title={loading ? "Speichern..." : "Fahrzeug hinzufügen"}
          onPress={handleSubmit}
          disabled={loading}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  col: {
    flex: 1,
  },
  gap: {
    width: 12, // Abstand zwischen den Feldern
  },
});
