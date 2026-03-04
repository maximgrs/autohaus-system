import { Feather } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";

import Screen from "@/src/components/ui/Screen";
import AccordionCard from "@/src/components/ui/AccordionCard";
import AppButton from "@/src/components/ui/AppButton";
import TextField from "@/src/components/ui/TextField";
import TextArea from "@/src/components/ui/TextArea";
import DatePickerField from "@/src/components/ui/DatePickerField";
import ImagePickerField from "@/src/components/ui/ImagePickerField";

import { supabase } from "@/src/lib/supabase";
import { useDevEmployee } from "@/src/features/session/devSession";
import { uploadImagesToBucket } from "@/src/features/vehicles/storage.upload";

const PREP_PHOTOS_BUCKET = "sale_prep_photos";

type TaskStatus =
  | "open"
  | "in_progress"
  | "done"
  | "blocked"
  | "overdue"
  | string;

type SaleRow = {
  id: string;
  status: string;
  contract_url: string | null;
  vehicle_id: string;
  dealer_employee_id: string | null;
};

type VehicleRow = {
  id: string;
  vin: string | null;
  status: string;
  carx_data: any;
};

type TaskRow = {
  id: string;
  vehicle_id: string;
  type: string;
  status: TaskStatus;
  assigned_employee_id: string | null;
  created_at: string;
};

type PrepPayload = {
  seller_name?: string;
  handover_date?: string | null;
  winter_tires?: boolean;
  summer_tires?: boolean;
  wheels_in_car?: boolean;
  store_wheels?: boolean;
  registration_date?: string | null;
  registration_time?: string | null;
  other_notes?: string;
};

type PrepRow = {
  id: string;
  vehicle_id: string;
  dealer_employee_id: string | null;
  top_seller_payload: any;
  attachment_urls: string[] | null; // wir speichern STORAGE-PFADE (stabil)
  created_at: string;
  updated_at: string;
};

type PhotoItem = {
  uri: string; // local uri ODER signed url (display)
  path: string | null; // storage path (für DB)
  isLocal: boolean; // local => noch nicht hochgeladen
};

function titleFromCarx(carx: any) {
  const brand = String(carx?.brand_txt ?? carx?.brand_name ?? "").trim();
  const model = String(carx?.model_name ?? carx?.model_txt ?? "").trim();
  const out = [brand, model].filter(Boolean).join(" ").trim();
  return out || "Fahrzeug";
}

function isActive(status: string) {
  return ["open", "in_progress", "blocked", "overdue"].includes(status);
}

function YesNoRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.yesNoRow}>
      <Text style={styles.yesNoLabel}>{label}</Text>
      <View style={styles.yesNoRight}>
        <Pressable
          disabled={disabled}
          onPress={() => onChange(true)}
          style={({ pressed }) => [
            styles.chip,
            value ? styles.chipActive : null,
            disabled ? { opacity: 0.55 } : null,
            pressed ? { opacity: 0.85 } : null,
          ]}
        >
          <Text style={[styles.chipText, value ? styles.chipTextActive : null]}>
            Ja
          </Text>
        </Pressable>

        <Pressable
          disabled={disabled}
          onPress={() => onChange(false)}
          style={({ pressed }) => [
            styles.chip,
            !value ? styles.chipActive : null,
            disabled ? { opacity: 0.55 } : null,
            pressed ? { opacity: 0.85 } : null,
          ]}
        >
          <Text
            style={[styles.chipText, !value ? styles.chipTextActive : null]}
          >
            Nein
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

async function openUrl(url: string) {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    // ignore
  }
}

async function openContract(contractPath: string) {
  const { data, error } = await supabase.storage
    .from("contracts")
    .createSignedUrl(contractPath, 60 * 60);

  if (error) throw error;
  await openUrl(data.signedUrl);
}

function latest(tasks: TaskRow[], type: string) {
  const list = tasks
    .filter((t) => String(t.type) === type)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return list[0] ?? null;
}

function isLocalUri(uri: string) {
  const u = String(uri || "");
  return (
    u.startsWith("file://") ||
    u.startsWith("content://") ||
    u.startsWith("ph://") ||
    u.startsWith("assets-library://")
  );
}

async function signedUrlForPath(path: string) {
  const { data, error } = await supabase.storage
    .from(PREP_PHOTOS_BUCKET)
    .createSignedUrl(path, 60 * 60); // 1h
  if (error) throw error;
  return data.signedUrl;
}

async function resolvePhotoItemsFromDb(paths: string[] | null) {
  const list = (paths ?? []).filter(Boolean);

  const items = await Promise.all(
    list.map(async (p) => {
      try {
        const signed = await signedUrlForPath(p);
        const item: PhotoItem = { uri: signed, path: p, isLocal: false };
        return item;
      } catch {
        return null;
      }
    }),
  );

  return items.filter(Boolean) as PhotoItem[];
}

export default function SalePrepScreen() {
  const params = useLocalSearchParams<{ saleId?: string }>();
  const saleId = String(params?.saleId ?? "").trim();

  const { employee } = useDevEmployee();
  const dealerId = employee?.role === "dealer" ? employee.id : "";
  const dealerName = employee?.display_name ?? "";

  const [loading, setLoading] = useState(false);
  const [sale, setSale] = useState<SaleRow | null>(null);
  const [vehicle, setVehicle] = useState<VehicleRow | null>(null);
  const [prep, setPrep] = useState<PrepRow | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  // PHOTOS (neu)
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const photoUris = useMemo(() => photoItems.map((p) => p.uri), [photoItems]);

  // form
  const [handoverDate, setHandoverDate] = useState<Date | null>(null);
  const [winterTires, setWinterTires] = useState(false);
  const [summerTires, setSummerTires] = useState(false);
  const [wheelsInCar, setWheelsInCar] = useState(false);
  const [storeWheels, setStoreWheels] = useState(false);
  const [regDate, setRegDate] = useState<Date | null>(null);
  const [regTime, setRegTime] = useState("12:00");
  const [otherNotes, setOtherNotes] = useState("");

  const reload = React.useCallback(async () => {
    if (!saleId) return;
    setLoading(true);
    try {
      const { data: s, error: sErr } = await supabase
        .from("sales")
        .select("id, status, contract_url, vehicle_id, dealer_employee_id")
        .eq("id", saleId)
        .single();
      if (sErr) throw sErr;

      const saleRow = s as SaleRow;
      setSale(saleRow);

      const { data: v, error: vErr } = await supabase
        .from("vehicles")
        .select("id, vin, status, carx_data")
        .eq("id", saleRow.vehicle_id)
        .single();
      if (vErr) throw vErr;
      setVehicle(v as VehicleRow);

      const { data: d, error: dErr } = await supabase
        .from("sale_contract_details")
        .select("handover_date")
        .eq("sale_id", saleId)
        .maybeSingle();
      if (dErr) throw dErr;

      const { data: p, error: pErr } = await supabase
        .from("vehicle_sale_prep")
        .select(
          "id, vehicle_id, dealer_employee_id, top_seller_payload, attachment_urls, created_at, updated_at",
        )
        .eq("vehicle_id", saleRow.vehicle_id)
        .eq("dealer_employee_id", saleRow.dealer_employee_id)
        .maybeSingle();
      if (pErr) throw pErr;

      const prepRow = (p as PrepRow) ?? null;
      setPrep(prepRow);

      // photos hydrate (neu)
      const resolved = await resolvePhotoItemsFromDb(prepRow?.attachment_urls);
      setPhotoItems(resolved);

      const { data: t, error: tErr } = await supabase
        .from("tasks")
        .select(
          "id, vehicle_id, type, status, assigned_employee_id, created_at",
        )
        .eq("vehicle_id", saleRow.vehicle_id)
        .in("type", ["sale_prep", "mechanic_prep", "detail_final", "handover"]);
      if (tErr) throw tErr;

      const taskRows = (t ?? []) as TaskRow[];
      setTasks(taskRows);

      // hydrate form
      const payload = (prepRow?.top_seller_payload ?? {}) as PrepPayload;

      const hd = payload.handover_date ?? (d as any)?.handover_date ?? null;
      if (hd) {
        const dt = new Date(String(hd));
        setHandoverDate(!Number.isNaN(dt.getTime()) ? dt : null);
      } else {
        setHandoverDate(null);
      }

      setWinterTires(Boolean(payload.winter_tires ?? false));
      setSummerTires(Boolean(payload.summer_tires ?? false));
      setWheelsInCar(Boolean(payload.wheels_in_car ?? false));
      setStoreWheels(Boolean(payload.store_wheels ?? false));

      if (payload.registration_date) {
        const dt = new Date(String(payload.registration_date));
        setRegDate(!Number.isNaN(dt.getTime()) ? dt : null);
      } else {
        setRegDate(null);
      }

      setRegTime(String(payload.registration_time ?? "12:00"));
      setOtherNotes(String(payload.other_notes ?? "").trim());
    } catch (e: any) {
      Alert.alert("Fehler", e?.message ?? "Konnte Daten nicht laden.");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [saleId]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const carx = vehicle?.carx_data ?? null;
  const vehicleTitle = useMemo(() => titleFromCarx(carx), [carx]);
  const vin = useMemo(
    () => String(vehicle?.vin ?? "").trim() || "—",
    [vehicle?.vin],
  );

  const salePrepTask = useMemo(() => latest(tasks, "sale_prep"), [tasks]);
  const mechanicTask = useMemo(() => latest(tasks, "mechanic_prep"), [tasks]);
  const detailTask = useMemo(() => latest(tasks, "detail_final"), [tasks]);
  const handoverTask = useMemo(() => latest(tasks, "handover"), [tasks]);

  const canEditTopSeller = useMemo(() => {
    // editbar solange mechanic nicht übernommen / gestartet
    if (!mechanicTask) return true;
    const ms = String(mechanicTask.status);
    const taken = !!mechanicTask.assigned_employee_id;
    if (ms === "in_progress" || ms === "done" || taken) return false;
    return true;
  }, [mechanicTask]);

  const needsTopSeller = useMemo(() => {
    // sale_prep Task ist offen => dealer muss ausfüllen
    const st = String(salePrepTask?.status ?? "");
    return st && st !== "done";
  }, [salePrepTask?.status]);

  const isReady = useMemo(() => {
    if (String(vehicle?.status ?? "") === "handover_ready") return true;
    const hs = String(handoverTask?.status ?? "");
    return hs && isActive(hs);
  }, [handoverTask?.status, vehicle?.status]);

  const [saving, setSaving] = useState(false);

  // photos change (neu)
  const onPhotosChange = (nextUris: string[]) => {
    setPhotoItems((prev) => {
      const byUri = new Map(prev.map((p) => [p.uri, p]));
      return nextUris.map((uri) => {
        const existing = byUri.get(uri);
        if (existing) return existing;
        return { uri, path: null, isLocal: isLocalUri(uri) };
      });
    });
  };

  const onSavePrep = async () => {
    if (!sale || !vehicle || !dealerId) return;

    setSaving(true);
    try {
      const payload: PrepPayload = {
        seller_name: dealerName,
        handover_date: handoverDate ? handoverDate.toISOString() : null,
        winter_tires: winterTires,
        summer_tires: summerTires,
        wheels_in_car: wheelsInCar,
        store_wheels: storeWheels,
        registration_date: regDate ? regDate.toISOString() : null,
        registration_time: regTime.trim() || null,
        other_notes: otherNotes.trim(),
      };

      // 0) ensure prep row exists (wie dein Pattern: insert -> upload -> update)
      let prepId = prep?.id ?? "";
      if (!prepId) {
        const { data, error } = await supabase
          .from("vehicle_sale_prep")
          .insert({
            vehicle_id: vehicle.id,
            dealer_employee_id: sale.dealer_employee_id,
            top_seller_payload: payload,
            attachment_urls: null,
          })
          .select(
            "id, vehicle_id, dealer_employee_id, top_seller_payload, attachment_urls, created_at, updated_at",
          )
          .single();

        if (error) throw error;
        const created = data as PrepRow;
        setPrep(created);
        prepId = created.id;
      }

      // 1) upload ONLY new local photos via existing helper
      const localUris = photoItems.filter((p) => p.isLocal).map((p) => p.uri);

      const uploadedPaths = localUris.length
        ? await uploadImagesToBucket({
            bucket: PREP_PHOTOS_BUCKET,
            vehicleId: vehicle.id,
            uris: localUris,
          })
        : [];

      // 2) build final paths exactly based on current selection/order
      //    keep existing paths + replace locals by uploadedPaths (same order)
      let upIdx = 0;
      const finalPaths: string[] = [];
      const finalItems: PhotoItem[] = [];

      // create signed urls for new uploads for immediate display (optional)
      const signedNew = uploadedPaths.length
        ? await Promise.all(
            uploadedPaths.map(async (p) => ({
              path: p,
              uri: await signedUrlForPath(p),
            })),
          )
        : [];

      for (const item of photoItems) {
        if (item.isLocal) {
          const next = signedNew[upIdx];
          upIdx += 1;
          if (next?.path) {
            finalPaths.push(next.path);
            finalItems.push({ uri: next.uri, path: next.path, isLocal: false });
          }
        } else if (item.path) {
          finalPaths.push(item.path);
          finalItems.push(item);
        }
      }

      setPhotoItems(finalItems);

      // 3) update prep with payload + attachment paths
      const { data: updated, error: updErr } = await supabase
        .from("vehicle_sale_prep")
        .update({
          top_seller_payload: payload,
          attachment_urls: finalPaths.length ? finalPaths : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prepId)
        .select(
          "id, vehicle_id, dealer_employee_id, top_seller_payload, attachment_urls, created_at, updated_at",
        )
        .single();

      if (updErr) throw updErr;
      setPrep(updated as PrepRow);

      Alert.alert("Gespeichert", "Daten wurden gespeichert.");
      await reload();
    } catch (e: any) {
      Alert.alert("Fehler", e?.message ?? "Konnte nicht speichern.");
    } finally {
      setSaving(false);
    }
  };

  const onConfirmHandover = async () => {
    if (!handoverTask?.id) {
      Alert.alert("Fehlt etwas", "Keine Übergabe-Task gefunden.");
      return;
    }

    Alert.alert("Übergabe bestätigen", "Wirklich als verkauft markieren?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Bestätigen",
        style: "destructive",
        onPress: async () => {
          try {
            setSaving(true);

            // IMPORTANT: mark TASK done -> DB trigger archives sale + vehicle
            const { error } = await supabase
              .from("tasks")
              .update({
                status: "done",
                done_at: new Date().toISOString(),
                actor_employee_id: dealerId,
              })
              .eq("id", handoverTask.id);

            if (error) throw error;

            Alert.alert("Erledigt", "Übergabe bestätigt.");
            await reload();
          } catch (e: any) {
            Alert.alert(
              "Fehler",
              e?.message ?? "Konnte Übergabe nicht bestätigen.",
            );
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const onOpenContract = async () => {
    if (!sale?.contract_url) return;
    try {
      await openContract(sale.contract_url);
    } catch (e: any) {
      Alert.alert("Fehler", e?.message ?? "Konnte Vertrag nicht öffnen.");
    }
  };

  const statusLine = useMemo(() => {
    if (!sale || !vehicle) return "";

    if (String(sale.status) === "draft") return "Status: Entwurf";
    if (
      String(sale.status) === "handover_done" ||
      String(sale.status) === "archived"
    )
      return "Status: Verkauft";

    if (isReady) return "Status: Übergabe bereit";

    if (needsTopSeller) return "Status: Top Verkäufer ausfüllen";

    const ms = String(mechanicTask?.status ?? "");
    if (!ms) return "Status: Mechaniker ausstehend";
    if (ms === "open" || ms === "blocked" || ms === "overdue")
      return "Status: Mechaniker offen";
    if (ms === "in_progress") return "Status: Mechaniker in Arbeit";
    if (ms === "done") {
      const ds = String(detailTask?.status ?? "");
      if (!ds) return "Status: Aufbereiter ausstehend";
      if (ds === "open" || ds === "blocked" || ds === "overdue")
        return "Status: Aufbereiter offen";
      if (ds === "in_progress") return "Status: Aufbereiter in Arbeit";
      if (ds === "done") return "Status: Aufbereiter fertig";
    }

    return "Status: Vertrag erstellt";
  }, [
    detailTask?.status,
    isReady,
    mechanicTask?.status,
    needsTopSeller,
    sale,
    vehicle,
  ]);

  return (
    <Screen variant="scroll" bottomSpace={170}>
      <Stack.Screen options={{ title: "Verkaufsabwicklung" }} />

      <View style={styles.container}>
        {!saleId ? (
          <Text style={styles.error}>Fehlende saleId</Text>
        ) : loading || !sale || !vehicle ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Lade…</Text>
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroTitle} numberOfLines={1}>
                {vehicleTitle}
              </Text>
              <Text style={styles.heroSub}>VIN: {vin}</Text>
              <Text style={styles.heroStatus}>{statusLine}</Text>

              {sale.contract_url ? (
                <Pressable
                  onPress={onOpenContract}
                  style={({ pressed }) => [
                    styles.contractBtn,
                    pressed ? { opacity: 0.85 } : null,
                  ]}
                >
                  <Feather name="file-text" size={16} color="#145437" />
                  <Text style={styles.contractBtnText}>
                    Kaufvertrag ansehen
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <AccordionCard
              title="Top Verkäufer – Auftrag für Mechaniker"
              defaultOpen
            >
              <TextField
                label="Verkäufer"
                value={dealerName}
                editable={false}
              />

              <DatePickerField
                label="Übergabe Datum (optional)"
                value={handoverDate}
                onChange={setHandoverDate}
              />

              <YesNoRow
                label="Winterreifen"
                value={winterTires}
                onChange={setWinterTires}
                disabled={!canEditTopSeller}
              />
              <YesNoRow
                label="Sommerreifen"
                value={summerTires}
                onChange={setSummerTires}
                disabled={!canEditTopSeller}
              />
              <YesNoRow
                label="Räder ins Auto"
                value={wheelsInCar}
                onChange={setWheelsInCar}
                disabled={!canEditTopSeller}
              />
              <YesNoRow
                label="Räder lagern"
                value={storeWheels}
                onChange={setStoreWheels}
                disabled={!canEditTopSeller}
              />

              <View style={{ height: 10 }} />

              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <DatePickerField
                    label="Anmeldegutachten bis"
                    value={regDate}
                    onChange={setRegDate}
                  />
                </View>
                <View style={{ width: 14 }} />
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Uhrzeit"
                    placeholder="HH:MM"
                    value={regTime}
                    onChangeText={setRegTime}
                    editable={canEditTopSeller}
                  />
                </View>
              </View>

              <TextArea
                label="Sonstige Vereinbarung / Hinweis"
                placeholder="Freitext…"
                value={otherNotes}
                onChangeText={setOtherNotes}
                minHeight={120}
                editable={canEditTopSeller}
              />

              {!canEditTopSeller ? (
                <Text style={styles.mutedHint}>
                  Formular gesperrt: Mechaniker hat bereits übernommen / ist in
                  Arbeit.
                </Text>
              ) : null}
            </AccordionCard>

            {/* NUR NEU: AccordionCard + Logik */}
            <AccordionCard title="Fotos hochladen" defaultOpen>
              <ImagePickerField
                value={photoUris}
                onChange={onPhotosChange}
                readOnly={!canEditTopSeller}
                max={30}
              />

              {!canEditTopSeller ? (
                <Text style={styles.mutedHint}>
                  Foto-Upload gesperrt: Mechaniker hat bereits übernommen / ist
                  in Arbeit.
                </Text>
              ) : null}
            </AccordionCard>

            <AccordionCard title="Status" defaultOpen>
              <Text style={styles.statusRow}>
                sale_prep:{" "}
                <Text style={styles.statusStrong}>
                  {salePrepTask ? String(salePrepTask.status) : "—"}
                </Text>
              </Text>
              <Text style={styles.statusRow}>
                Mechaniker:{" "}
                <Text style={styles.statusStrong}>
                  {mechanicTask
                    ? `${String(mechanicTask.status)}${
                        mechanicTask.assigned_employee_id ? " (übernommen)" : ""
                      }`
                    : "—"}
                </Text>
              </Text>
              <Text style={styles.statusRow}>
                Aufbereiter:{" "}
                <Text style={styles.statusStrong}>
                  {detailTask
                    ? `${String(detailTask.status)}${
                        detailTask.assigned_employee_id ? " (übernommen)" : ""
                      }`
                    : "—"}
                </Text>
              </Text>
              <Text style={styles.statusRow}>
                Übergabe:{" "}
                <Text style={styles.statusStrong}>
                  {handoverTask ? String(handoverTask.status) : "—"}
                </Text>
              </Text>
              <Text style={styles.statusRow}>
                Fahrzeug Status:{" "}
                <Text style={styles.statusStrong}>
                  {String(vehicle.status)}
                </Text>
              </Text>
            </AccordionCard>

            {isReady ? (
              <AppButton
                title="Übergabe bestätigen"
                onPress={onConfirmHandover}
                disabled={saving}
                loading={saving}
                style={{ marginTop: 0 }}
              />
            ) : (
              <AppButton
                title={prep?.id ? "Speichern" : "Bestätigen"}
                onPress={onSavePrep}
                disabled={saving || !canEditTopSeller}
                loading={saving}
                style={{ marginTop: 0 }}
              />
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },

  error: {
    color: "#000",
    fontWeight: "900",
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  loading: { paddingVertical: 18, alignItems: "center", gap: 10 },
  loadingText: { color: "rgba(0,0,0,0.55)", fontWeight: "700" },

  hero: {
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.04)",
    padding: 14,
    gap: 6,
  },
  heroTitle: { fontSize: 16, fontWeight: "900", color: "#000" },
  heroSub: { fontSize: 12, fontWeight: "800", color: "rgba(0,0,0,0.60)" },
  heroStatus: { fontSize: 12, fontWeight: "800", color: "rgba(0,0,0,0.70)" },

  contractBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(20,84,55,0.10)",
    borderWidth: 1,
    borderColor: "rgba(20,84,55,0.22)",
  },
  contractBtnText: { fontSize: 12, fontWeight: "900", color: "#145437" },

  yesNoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  yesNoLabel: { fontSize: 13, fontWeight: "800", color: "#000", flex: 1 },
  yesNoRight: { flexDirection: "row", gap: 10 },

  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: "#145437" },
  chipText: { fontSize: 12, fontWeight: "900", color: "rgba(0,0,0,0.65)" },
  chipTextActive: { color: "#fff" },

  row2: { flexDirection: "row", alignItems: "flex-start" },

  mutedHint: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
    lineHeight: 18,
  },

  statusRow: { fontSize: 13, fontWeight: "800", color: "rgba(0,0,0,0.75)" },
  statusStrong: { fontWeight: "900", color: "#000" },
});
