import { Feather } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Screen from "@/src/components/ui/Screen";
import AccordionCard from "@/src/components/ui/AccordionCard";
import AppButton from "@/src/components/ui/AppButton";
import TextArea from "@/src/components/ui/TextArea";
import VehicleHeroCard from "@/src/components/vehicle/VehicleHeroCard";
import ImagePickerField from "@/src/components/ui/ImagePickerField";

import { supabase } from "@/src/lib/supabase";
import { useDevEmployee } from "@/src/features/session/devSession";

import { useMechanics } from "@/src/features/employees/useMechanics";
import type { MechanicEmployee } from "@/src/features/employees/mechanics.service";

import {
  completeMechanicTask,
  fetchMechanicTaskDetail,
  takeMechanicTask,
  upsertWorkcard,
  type MechanicTaskDetail,
} from "@/src/features/tasks/mechanicTaskDetail.service";

// ✅ your working uploader (no blob())
import { uploadImagesToBucket } from "@/src/features/vehicles/storage.upload";

const UI = {
  text: "#000",
  muted: "rgba(0,0,0,0.55)",
  surface: "#F2F2F2",
  green: "#145437",
} as const;

function titleFromCarx(carx: any, fallback?: string | null) {
  const brand = String(carx?.brand_txt ?? carx?.brand_name ?? "").trim();
  const model = String(carx?.model_name ?? carx?.model_txt ?? "").trim();
  const out = [brand, model].filter(Boolean).join(" ").trim();
  return out || (fallback?.trim() ? fallback : "Fahrzeug");
}

function fmtDateDE(iso?: string | null) {
  const s = String(iso ?? "").trim();
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  try {
    return new Intl.DateTimeFormat("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return s;
  }
}

function fmtTimeDE(iso?: string | null) {
  const s = String(iso ?? "").trim();
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isLocalUri(uri: string) {
  const u = String(uri ?? "");
  return (
    u.startsWith("file:") ||
    u.startsWith("ph:") ||
    u.startsWith("assets-library:") ||
    u.startsWith("content:")
  );
}

function toPublicUrl(bucket: string, pathOrUrl: string) {
  const s = String(pathOrUrl ?? "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  const pub = supabase.storage.from(bucket).getPublicUrl(s);
  return pub.data.publicUrl || s;
}

function uniqPreserveOrder(arr: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const v = String(x ?? "").trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function BoolPill({ value }: { value: boolean }) {
  return (
    <View style={[styles.pill, value ? styles.pillYes : styles.pillNo]}>
      <Text style={[styles.pillText, !value ? styles.pillTextDark : null]}>
        {value ? "Ja" : "Nein"}
      </Text>
    </View>
  );
}

function KeyValueRow({
  label,
  right,
}: {
  label: string;
  right: React.ReactNode;
}) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <View style={{ alignItems: "flex-end" }}>{right}</View>
    </View>
  );
}

export default function MechanicTaskDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const taskId = String(params?.id ?? "").trim();

  const { employee } = useDevEmployee();
  const actorId = employee?.id ?? null;

  const { loading: mechanicsLoading, mechanics } = useMechanics();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MechanicTaskDetail | null>(null);

  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [selectedMechanic, setSelectedMechanic] =
    useState<MechanicEmployee | null>(null);

  const [notes, setNotes] = useState("");
  // ✅ draft state: local URIs + remote URLs (exactly how ImagePickerField is intended)
  const [photoDraft, setPhotoDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await fetchMechanicTaskDetail(taskId);
      setData(res);

      if (res.task.assigned_employee_id) {
        const found =
          mechanics.find((m) => m.id === res.task.assigned_employee_id) ?? null;
        setSelectedMechanic(found);
      }

      setNotes(res.workcard?.notes ?? "");
      setPhotoDraft(res.workcard?.photo_urls ?? []);
    } catch (e: any) {
      Alert.alert("Fehler", e?.message ?? "Konnte Aufgabe nicht laden.");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [mechanics, taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const task = data?.task ?? null;
  const vehicle = data?.vehicle ?? null;
  const prep = data?.prep ?? null;

  const carx = vehicle?.carx_data ?? null;

  const vehicleTitle = useMemo(
    () => titleFromCarx(carx, vehicle?.draft_model ?? null),
    [carx, vehicle?.draft_model],
  );

  const vin = useMemo(
    () => String(vehicle?.vin ?? "").trim() || "—",
    [vehicle?.vin],
  );

  const takenAt = useMemo(() => {
    const raw = task?.payload?.taken_at ?? null;
    return raw ? String(raw) : null;
  }, [task?.payload?.taken_at]);

  const isInProgress = String(task?.status ?? "") === "in_progress";
  const isDone = String(task?.status ?? "") === "done";

  // only show content after assigned
  const started = useMemo(
    () => Boolean(task?.assigned_employee_id),
    [task?.assigned_employee_id],
  );

  const canTake = useMemo(() => {
    if (!task) return false;
    if (task.assigned_employee_id) return false;
    return (
      String(task.status) === "open" ||
      String(task.status) === "blocked" ||
      String(task.status) === "overdue"
    );
  }, [task]);

  const onTake = async () => {
    if (!task) return;
    if (!selectedMechanic) {
      Alert.alert(
        "Mitarbeiter fehlt",
        "Bitte zuerst einen Mitarbeiter auswählen.",
      );
      return;
    }

    setSaving(true);
    try {
      await takeMechanicTask({
        taskId: task.id,
        mechanicEmployeeId: selectedMechanic.id,
        actorEmployeeId: actorId,
      });
      await load();
      Alert.alert("Übernommen", "Aufgabe wurde übernommen.");
    } catch (e: any) {
      Alert.alert("Fehler", e?.message ?? "Konnte Aufgabe nicht übernehmen.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Save workcard (uploads locals + writes notes + remote urls)
  const onSaveNotes = async () => {
    if (!vehicle?.id || !task) return;

    setSaving(true);
    try {
      const bucket = "workcards";

      const locals = photoDraft.filter(isLocalUri);

      let uploadedUrls: string[] = [];
      if (locals.length > 0) {
        const uploaded = await uploadImagesToBucket({
          bucket,
          vehicleId: vehicle.id,
          uris: locals,
        });

        // uploaded might be URLs OR paths -> normalize to public URLs
        uploadedUrls = uploaded.map((x) => toPublicUrl(bucket, x));
      }

      // Replace locals in-place with uploaded urls (preserve order)
      let idx = 0;
      const replaced = photoDraft.map((u) => {
        if (!isLocalUri(u)) return u;
        const next = uploadedUrls[idx];
        idx += 1;
        return next ?? ""; // drop if missing
      });

      const finalUrls = uniqPreserveOrder([
        ...replaced.filter((u) => !isLocalUri(u)),
      ]);

      const wc = await upsertWorkcard({
        vehicleId: vehicle.id,
        actorEmployeeId: task.assigned_employee_id ?? actorId,
        notes: notes.trim() || null,
        photoUrls: finalUrls,
      });

      setNotes(wc.notes ?? "");
      setPhotoDraft(wc.photo_urls ?? []);
    } catch (e: any) {
      Alert.alert(
        "Fehler",
        e?.message ?? "Konnte Arbeitskarte nicht speichern.",
      );
    } finally {
      setSaving(false);
    }
  };

  const onDone = async () => {
    if (!task) return;

    Alert.alert("Aufgabe beenden", "Wirklich abschließen?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Beenden",
        style: "destructive",
        onPress: async () => {
          setSaving(true);
          try {
            await completeMechanicTask({
              taskId: task.id,
              actorEmployeeId: actorId,
            });
            await load();
            Alert.alert("Erledigt", "Aufgabe wurde abgeschlossen.");
          } catch (e: any) {
            Alert.alert(
              "Fehler",
              e?.message ?? "Konnte Aufgabe nicht beenden.",
            );
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const payload = (prep?.top_seller_payload ?? {}) as any;
  const dealerName = String(payload?.seller_name ?? "").trim() || "—";

  const handoverIso = payload?.handover_date
    ? String(payload.handover_date)
    : null;

  const regIso = payload?.registration_due_at
    ? String(payload.registration_due_at)
    : payload?.registration_date
      ? String(payload.registration_date)
      : null;

  return (
    <Screen variant="scroll" bottomSpace={170}>
      <Stack.Screen options={{ title: "Aufgabe" }} />

      <View style={styles.container}>
        {!taskId ? (
          <Text style={styles.error}>Fehlende Task-ID</Text>
        ) : loading || !data || !task || !vehicle ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Lade Aufgabe…</Text>
          </View>
        ) : (
          <>
            <View style={styles.hintRow}>
              <Feather name="info" size={14} color={UI.muted} />
              <Text style={styles.hintText}>
                Bitte überprüfe das Fahrzeug für die Übergabe und dokumentiere
                die relevanten Punkte.
              </Text>
            </View>

            <VehicleHeroCard title={vehicleTitle} vin={vin} />

            {!started ? (
              <View style={styles.takeoverRow}>
                <AppButton
                  title={selectedMechanic?.display_name ?? "Mitarbeiter wählen"}
                  onPress={() => setEmployeeModalOpen(true)}
                  variant="secondary"
                  style={[styles.takeoverBtn, styles.btnShadowSoft]}
                  disabled={saving || mechanicsLoading || loading}
                />
                <AppButton
                  title={saving ? "…" : "Aufgabe übernehmen"}
                  onPress={onTake}
                  variant="primary"
                  style={[styles.takeoverBtn, styles.btnShadowSoft]}
                  disabled={!canTake || !selectedMechanic || saving || loading}
                  loading={saving}
                />
              </View>
            ) : (
              <>
                <View style={styles.startedInfo}>
                  <Text style={styles.startedLine}>
                    <Text style={styles.startedLabel}>Aufgabe: </Text>
                    <Text style={styles.startedValue}>
                      {task.title ?? "Mechaniker Vorbereitung"}
                    </Text>
                  </Text>

                  <Text style={styles.startedLine}>
                    <Text style={styles.startedLabel}>Übernommen von: </Text>
                    <Text style={styles.startedValue}>
                      {data.assignedEmployee?.display_name ?? "—"}
                    </Text>
                  </Text>

                  <Text style={styles.startedLine}>
                    <Text style={styles.startedLabel}>Übernommen am: </Text>
                    <Text style={styles.startedValue}>
                      {takenAt
                        ? `${fmtDateDE(takenAt)}, ${fmtTimeDE(takenAt)} Uhr`
                        : "—"}
                    </Text>
                  </Text>

                  {isDone ? (
                    <Text style={styles.readOnlyHint}>
                      Diese Aufgabe ist erledigt. Inhalte sind nur zur Ansicht.
                    </Text>
                  ) : null}
                </View>

                <AccordionCard title="Top Verkäufer" defaultOpen>
                  <View style={{ gap: 10 }}>
                    <View style={styles.topRow}>
                      <Feather name="user" size={16} color={UI.green} />
                      <Text style={styles.topText}>
                        Erstellt von:{" "}
                        <Text style={styles.topStrong}>{dealerName}</Text>
                      </Text>
                    </View>

                    <View style={styles.topRow}>
                      <Feather name="clock" size={16} color={UI.green} />
                      <Text style={styles.topText}>
                        Übergabe Datum:{" "}
                        <Text style={styles.topStrong}>
                          {handoverIso
                            ? `${fmtDateDE(handoverIso)}, ${fmtTimeDE(handoverIso)} Uhr`
                            : "—"}
                        </Text>
                      </Text>
                    </View>

                    <View style={styles.topRow}>
                      <Feather name="calendar" size={16} color={UI.green} />
                      <Text style={styles.topText}>
                        Anmeldegutachten bis:{" "}
                        <Text style={styles.topStrong}>
                          {regIso
                            ? `${fmtDateDE(regIso)}, ${fmtTimeDE(regIso)} Uhr`
                            : "—"}
                        </Text>
                      </Text>
                    </View>

                    <View style={{ height: 6 }} />

                    <Text style={styles.sectionTitle}>Formularangaben:</Text>

                    <View style={styles.formList}>
                      <KeyValueRow
                        label="Winter Reifen:"
                        right={
                          <BoolPill value={Boolean(payload?.winter_tires)} />
                        }
                      />
                      <KeyValueRow
                        label="Sommer Reifen:"
                        right={
                          <BoolPill value={Boolean(payload?.summer_tires)} />
                        }
                      />
                      <KeyValueRow
                        label="Räder ins Auto:"
                        right={
                          <BoolPill value={Boolean(payload?.wheels_in_car)} />
                        }
                      />
                      <KeyValueRow
                        label="Räder lagern:"
                        right={
                          <BoolPill value={Boolean(payload?.store_wheels)} />
                        }
                      />
                    </View>

                    <Text style={styles.sectionTitle}>
                      Sonstige Vereinbarungen:
                    </Text>
                    <Text style={styles.longText}>
                      {String(payload?.other_notes ?? "").trim() || "—"}
                    </Text>
                  </View>
                </AccordionCard>

                <AccordionCard title="Anhänge" defaultOpen>
                  {prep?.attachment_urls?.length ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        {prep.attachment_urls.map((u, i) => (
                          <Image
                            key={`${u}-${i}`}
                            source={{ uri: u }}
                            style={styles.thumb}
                          />
                        ))}
                      </View>
                    </ScrollView>
                  ) : (
                    <Text style={styles.muted}>Keine Anhänge vorhanden.</Text>
                  )}
                </AccordionCard>

                <AccordionCard title="Arbeitskarte" defaultOpen>
                  <View style={{ gap: 12 }}>
                    <ImagePickerField
                      value={photoDraft}
                      onChange={setPhotoDraft}
                      readOnly={isDone}
                      max={6}
                      tileSize={92}
                      addButtonLabel="+ Hinzufügen"
                      addTileLabel="Mehr"
                    />

                    <TextArea
                      label="Notizen"
                      placeholder="Notizen zur Arbeitskarte…"
                      value={notes}
                      onChangeText={setNotes}
                      minHeight={110}
                      editable={!isDone}
                    />

                    <Pressable
                      onPress={onSaveNotes}
                      disabled={saving || isDone}
                      style={({ pressed }) => [
                        styles.saveBtn,
                        saving || isDone ? { opacity: 0.55 } : null,
                        pressed ? { opacity: 0.85 } : null,
                      ]}
                    >
                      <Text style={styles.saveBtnText}>
                        {saving ? "Speichern…" : "Speichern"}
                      </Text>
                    </Pressable>
                  </View>
                </AccordionCard>

                <AppButton
                  title={isDone ? "Erledigt" : "Aufgabe beenden"}
                  onPress={onDone}
                  disabled={!isInProgress || saving || isDone}
                  loading={saving}
                  style={{ marginTop: 0 }}
                />
              </>
            )}
          </>
        )}
      </View>

      <Modal
        visible={employeeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEmployeeModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setEmployeeModalOpen(false)}
        />

        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Mitarbeiter wählen</Text>
            <Pressable
              onPress={() => setEmployeeModalOpen(false)}
              hitSlop={10}
              style={styles.closeX}
            >
              <Feather name="x" size={18} color={UI.text} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalList}
          >
            {mechanicsLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator />
                <Text style={styles.muted}>Lade Mitarbeiter…</Text>
              </View>
            ) : mechanics.length === 0 ? (
              <Text style={styles.muted}>Keine Mechaniker gefunden.</Text>
            ) : (
              mechanics.map((m) => {
                const active = selectedMechanic?.id === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => {
                      setSelectedMechanic(m);
                      setEmployeeModalOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.employeeRow,
                      active ? styles.employeeRowActive : null,
                      pressed ? { opacity: 0.9 } : null,
                    ]}
                  >
                    <Text style={styles.employeeName}>{m.display_name}</Text>
                    {active ? (
                      <Feather name="check" size={16} color={UI.green} />
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },

  error: {
    color: UI.text,
    fontWeight: "900",
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  loading: { paddingVertical: 18, alignItems: "center", gap: 10 },
  loadingText: { color: UI.muted, fontWeight: "700" },

  hintRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  hintText: {
    flex: 1,
    color: UI.muted,
    fontWeight: "600",
    fontSize: 12,
    lineHeight: 16,
  },

  takeoverRow: { flexDirection: "row", gap: 12 },
  takeoverBtn: { marginTop: 0, flex: 1, minWidth: 0 },

  btnShadowSoft: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  startedInfo: {
    backgroundColor: UI.surface,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  startedLine: { fontSize: 12, fontWeight: "700", color: UI.text },
  startedLabel: { color: UI.muted, fontWeight: "700" },
  startedValue: { color: UI.text, fontWeight: "900" },
  readOnlyHint: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    color: UI.muted,
  },

  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  topText: { fontSize: 12, fontWeight: "800", color: "rgba(0,0,0,0.70)" },
  topStrong: { fontWeight: "900", color: UI.text },

  sectionTitle: { fontSize: 13, fontWeight: "900", color: UI.text },

  formList: {
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.04)",
    padding: 10,
    gap: 10,
  },

  kvRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  kvLabel: { fontSize: 13, fontWeight: "800", color: UI.text },

  pill: {
    minWidth: 64,
    height: 30,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  pillYes: { backgroundColor: UI.green },
  pillNo: { backgroundColor: "rgba(0,0,0,0.12)" },
  pillText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  pillTextDark: { color: UI.text },

  thumb: {
    width: 110,
    height: 70,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
  },

  muted: { color: "rgba(0,0,0,0.55)", fontWeight: "700" },
  longText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.75)",
    lineHeight: 18,
  },

  saveBtn: {
    alignSelf: "flex-start",
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { fontSize: 12, fontWeight: "900", color: UI.text },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalSheet: {
    position: "absolute",
    left: 16,
    right: 16,
    top: "22%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    maxHeight: "60%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 14, fontWeight: "900", color: UI.text },
  closeX: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalList: { gap: 10, paddingBottom: 6 },
  modalLoading: { paddingVertical: 16, alignItems: "center", gap: 10 },

  employeeRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: UI.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  employeeRowActive: {
    borderWidth: 1,
    borderColor: "rgba(31,122,58,0.35)",
    backgroundColor: "rgba(31,122,58,0.1)",
  },
  employeeName: { fontSize: 12, fontWeight: "900", color: UI.text },
});
