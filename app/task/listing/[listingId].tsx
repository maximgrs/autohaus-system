import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import Screen from "@/src/components/ui/Screen";
import AccordionCard from "@/src/components/ui/AccordionCard";
import AppButton from "@/src/components/ui/AppButton";
import TextField from "@/src/components/ui/TextField";
import ImagePickerField from "@/src/components/ui/ImagePickerField";
import { supabase } from "@/src/lib/supabase";
import {
  fetchTaskDetail,
  type TaskDetail,
} from "@/src/features/tasks/taskDetail.service";
import { syncVehicleCarxSnapshotSelected } from "@/src/features/vehicles/carxSnapshot.service";

const UI = {
  title: "#000",
  text: "#000000",
  muted: "rgba(0,0,0,0.55)",
  surface: "#F2F2F2",
  badgeBg: "#d9d9d9",
  badgeText: "#000",
};

function storageUrl(bucket: string, pathOrUrl: string): string {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://"))
    return pathOrUrl;
  const { data } = supabase.storage.from(bucket).getPublicUrl(pathOrUrl);
  return data.publicUrl;
}

function formatMoney(v: number | null) {
  if (v == null) return "-";
  try {
    return new Intl.NumberFormat("de-AT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `${Math.round(v)} €`;
  }
}

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function KvRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel} numberOfLines={1}>
        {label}
      </Text>

      <View style={styles.kvBadge}>
        <Text style={styles.kvBadgeText} numberOfLines={1}>
          {String(value)}
        </Text>
      </View>
    </View>
  );
}

export default function ListingTaskDetailScreen() {
  const params = useLocalSearchParams<{ listingId?: string | string[] }>();
  const taskId = useMemo(
    () =>
      (Array.isArray(params.listingId)
        ? params.listingId[0]
        : params.listingId) ?? "",
    [params.listingId],
  );

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TaskDetail | null>(null);
  const [carxId, setCarxId] = useState("");

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await fetchTaskDetail(taskId);
      setData(res);
      setCarxId(res.vehicle?.carx_vehicle_id ?? "");
    } catch (e: any) {
      console.log("fetchTaskDetail error", e?.message ?? e);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const vehicle = data?.vehicle ?? null;
  const taskType = String(data?.task?.type ?? "");

  const isPhotos = taskType === "listing_photos";

  const title = useMemo(() => {
    if (!vehicle) return "Fahrzeug";
    return vehicle.draft_model?.trim() ? vehicle.draft_model : vehicle.vin;
  }, [vehicle]);

  const vin = vehicle?.vin ?? "-";
  const arrived = formatDate(vehicle?.created_at ?? null);

  const vehiclePhotoUrls = useMemo(() => {
    const arr = vehicle?.internal_image_urls ?? [];
    return arr.map((p) => storageUrl("vehicle-photos", p)).filter(Boolean);
  }, [vehicle]);

  const docUrls = useMemo(() => {
    const arr = vehicle?.registration_doc_urls ?? [];
    return arr.map((p) => storageUrl("vehicle-docs", p)).filter(Boolean);
  }, [vehicle]);

  const allImages = [...vehiclePhotoUrls, ...docUrls];

  const markCreateDone = useCallback(async () => {
    if (!vehicle?.id) return;

    const cid = carxId.trim();
    if (!cid) {
      Alert.alert("Fehlt etwas", "Bitte CarX Fahrzeug-ID eingeben.");
      return;
    }

    try {
      setLoading(true);

      // 1) snapshot + vehicle update (carx_vehicle_id, carx_data, carx_synced_at, status, optional vin)
      await syncVehicleCarxSnapshotSelected({
        vehicleId: vehicle.id,
        carxVehicleId: cid,
      });

      // 2) task done
      const { error: tErr } = await supabase
        .from("tasks")
        .update({ status: "done", done_at: new Date().toISOString() })
        .eq("id", taskId);

      if (tErr) throw tErr;

      Alert.alert("Erledigt", "Inserat wurde als online markiert.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Fehler", e?.message ?? "Etwas ist schief gelaufen.");
    } finally {
      setLoading(false);
    }
  }, [carxId, taskId, vehicle?.id]);

  const markPhotosDone = useCallback(async () => {
    if (!vehicle?.id) return;

    if (!vehicle.carx_vehicle_id) {
      Alert.alert(
        "Fehlt etwas",
        "Keine CarX ID gefunden. Inserat muss zuerst online sein.",
      );
      return;
    }

    try {
      setLoading(true);

      await supabase
        .from("vehicles")
        .update({ carx_synced_at: new Date().toISOString() })
        .eq("id", vehicle.id);

      const { error: tErr } = await supabase
        .from("tasks")
        .update({ status: "done", done_at: new Date().toISOString() })
        .eq("id", taskId);

      if (tErr) throw tErr;

      Alert.alert("Erledigt", "Fotos wurden als hochgeladen markiert.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Fehler", e?.message ?? "Etwas ist schief gelaufen.");
    } finally {
      setLoading(false);
    }
  }, [taskId, vehicle?.carx_vehicle_id, vehicle?.id]);

  // ---------- Minimal screen for listing_photos ----------
  if (isPhotos) {
    return (
      <Screen variant="scroll" bottomSpace={160}>
        <View style={styles.container}>
          {loading && !data ? (
            <View style={styles.loading}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>Lade Aufgabe…</Text>
            </View>
          ) : null}

          <View style={styles.top}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>

            <View style={styles.badgeRow}>
              <View style={styles.chip}>
                <Text style={styles.chipLabel}>vin:</Text>
                <Text style={styles.chipValue} numberOfLines={1}>
                  {vin}
                </Text>
              </View>

              <View style={styles.chip}>
                <Text style={styles.chipLabel}>eingetroffen:</Text>
                <Text style={styles.chipValue} numberOfLines={1}>
                  {arrived}
                </Text>
              </View>
            </View>

            <Text style={styles.hint}>
              Bitte die Fotos nach der Aufbereitung auf CarX hochladen und
              danach bestätigen.
            </Text>
          </View>

          <AppButton
            title={loading ? "Speichern..." : "Fotos hochgeladen"}
            onPress={markPhotosDone}
            disabled={loading || !vehicle?.id}
            style={{ marginTop: 0 }}
          />
        </View>
      </Screen>
    );
  }

  // ---------- Full screen for listing_create ----------
  return (
    <Screen variant="scroll" bottomSpace={160}>
      <View style={styles.container}>
        {loading && !data ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Lade Inserat…</Text>
          </View>
        ) : null}

        <View style={styles.top}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>

          <View style={styles.badgeRow}>
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>vin:</Text>
              <Text style={styles.chipValue} numberOfLines={1}>
                {vin}
              </Text>
            </View>

            <View style={styles.chip}>
              <Text style={styles.chipLabel}>eingetroffen:</Text>
              <Text style={styles.chipValue} numberOfLines={1}>
                {arrived}
              </Text>
            </View>
          </View>

          <Text style={styles.hint}>
            Bitte Inserat in CarX anlegen und anschließend hier als online
            markieren.
          </Text>
        </View>

        <AccordionCard title="Anhänge" defaultOpen>
          <ImagePickerField
            value={allImages}
            readOnly
            tileSize={96}
            emptyTitle="Noch keine Anhänge"
            emptySubtitle="Der Chef hat noch keine Fotos/Dokumente hochgeladen."
          />
        </AccordionCard>

        <AccordionCard title="Fahrzeugdaten" defaultOpen>
          <View style={styles.dataCard}>
            <KvRow label="Modell" value={vehicle?.draft_model?.trim() || "-"} />
            <KvRow label="VIN" value={vin} />
            <KvRow label="Baujahr" value={vehicle?.draft_year ?? "-"} />
            <KvRow label="Schlüsselanzahl" value={vehicle?.key_count ?? 0} />
            <KvRow label="Reifenanzahl" value={vehicle?.tire_count ?? 4} />
            <KvRow label="Felgen" value={vehicle?.has_rims ? "ja" : "nein"} />
            <KvRow
              label="Einkaufspreis"
              value={formatMoney(vehicle?.purchase_price ?? null)}
            />
            <KvRow
              label="Verkaufspreis"
              value={formatMoney(vehicle?.target_selling_price ?? null)}
            />
          </View>

          <View style={styles.notesWrap}>
            <Text style={styles.notesTitle}>Sonstige Beschreibung:</Text>
            <Text style={styles.notesText}>
              {vehicle?.draft_notes?.trim() || "—"}
            </Text>
          </View>
        </AccordionCard>

        <AccordionCard title="CarX Status" defaultOpen>
          <Text style={styles.carxHint}>
            Trage die CarX Fahrzeug-ID ein, sobald das Inserat online ist.
          </Text>
          <TextField
            label="CarX Fahrzeug-ID"
            value={carxId}
            onChangeText={setCarxId}
            placeholder="z.B. 310963"
            keyboardType="numeric"
          />
        </AccordionCard>

        <AppButton
          title={loading ? "Speichern..." : "Inserat online gestellt"}
          onPress={markCreateDone}
          disabled={loading || !vehicle?.id}
          style={{ marginTop: 0 }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 20 },

  loading: { paddingVertical: 16, alignItems: "center", gap: 10 },
  loadingText: { color: UI.muted, fontWeight: "700" },

  top: { gap: 15 },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: UI.title,
    letterSpacing: 0.2,
  },

  badgeRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: UI.badgeBg,
  },

  chipLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: UI.badgeText,
    opacity: 0.85,
  },
  chipValue: { fontSize: 9, fontWeight: "700", color: UI.badgeText },

  hint: {
    color: UI.muted,
    fontWeight: "600",
    fontSize: 12,
    lineHeight: 16,
  },

  dataCard: {
    backgroundColor: UI.surface,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },

  kvRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  kvLabel: {
    flex: 1,
    color: "#000",
    fontWeight: "700",
    fontSize: 12,
  },

  kvBadge: {
    backgroundColor: UI.badgeBg,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 5,
    maxWidth: "55%",
  },

  kvBadgeText: {
    color: UI.badgeText,
    fontWeight: "600",
    fontSize: 10,
  },

  notesWrap: {
    marginTop: 8,
    backgroundColor: UI.surface,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },

  notesTitle: { fontSize: 12, fontWeight: "800", color: UI.text },

  notesText: {
    color: "rgba(0,0,0,0.70)",
    fontWeight: "600",
    fontSize: 12,
    lineHeight: 17,
  },

  carxHint: {
    color: UI.muted,
    fontWeight: "600",
    fontSize: 12,
    lineHeight: 16,
  },
});
