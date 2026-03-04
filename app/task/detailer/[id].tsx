// app/(tasks)/detailer/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Screen from "@/src/components/ui/Screen";
import AccordionCard from "@/src/components/ui/AccordionCard";
import AppButton from "@/src/components/ui/AppButton";
import ImagePickerField from "@/src/components/ui/ImagePickerField";
import SwitchControl from "@/src/components/ui/SwitchControl";
import PositionPicker from "@/src/components/ui/PositionPicker";
import VehicleHeroCard from "@/src/components/vehicle/VehicleHeroCard";

import { supabase } from "@/src/lib/supabase";
import {
  fetchTaskDetail,
  type TaskDetail,
  type TaskType,
} from "@/src/features/tasks/taskDetail.service";

type TaskStatus =
  | "open"
  | "in_progress"
  | "done"
  | "blocked"
  | "overdue"
  | string;

type EmployeeRow = {
  id: string;
  display_name: string;
  role: string;
  active: boolean;
};

type InspectionType = "intake" | "final";

type InspectionRow = {
  id: string;
  vehicle_id: string;
  type: InspectionType;
  notes: string | null;
  actor_employee_id: string | null;
  created_at: string;
  updated_at: string;
};

type IssueCategory = "scratch" | "dent" | "rust" | "other";
type IssueSeverity = "low" | "mid" | "high";

type InspectionItemRow = {
  id: string;
  inspection_id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  position: any; // jsonb
  comment: string | null;
  photo_urls: string[] | null;
  created_at: string;
};

type DamageKind = "scratch" | "dent" | "rust";

type DamageEntry = {
  id: string;
  kind: DamageKind;
  severity: IssueSeverity;
  positions: string[];
  comment: string;
  photos: string[];
};

type InspectionItemInsert = {
  inspection_id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  position: any;
  comment: string | null;
  photo_urls: string[];
};

const UI = {
  text: "#000",
  muted: "rgba(0,0,0,0.55)",
  surface: "#F2F2F2",
  surface2: "rgba(0,0,0,0.06)",
  green: "#1F7A3A",
} as const;

/* ----------------------------- helpers ----------------------------- */

function inspectionTypeFromTaskType(
  taskType: TaskType | string,
): InspectionType {
  return taskType === "detail_final" ? "final" : "intake";
}

function subtitleFromTaskType(type: string) {
  if (type === "detail_intake")
    return "Fahrzeug neu eingetroffen – bitte prüfen und Mängel dokumentieren.";
  if (type === "detail_final")
    return "Fahrzeug für Übergabe vorbereiten und final dokumentieren.";
  return "Bitte Aufgabe bearbeiten und dokumentieren.";
}

function prettyTitle(data: TaskDetail | null) {
  const v = data?.vehicle;
  if (!v) return "Fahrzeug";
  return v.draft_model?.trim() ? v.draft_model : v.vin;
}

function prettyVin(data: TaskDetail | null) {
  return data?.vehicle?.vin ?? "-";
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function damageLabel(kind: DamageKind) {
  if (kind === "scratch") return "Kratzer";
  if (kind === "dent") return "Dellen";
  return "Rost";
}

function emptyDamageText(kind: DamageKind) {
  if (kind === "scratch") return "Noch keine Kratzer dokumentiert";
  if (kind === "dent") return "Noch keine Dellen dokumentiert";
  return "Noch keine Roststellen dokumentiert";
}

function severityLabel(s: IssueSeverity) {
  if (s === "low") return "Leicht";
  if (s === "mid") return "Mittel";
  return "Stark";
}

function severityTone(s: IssueSeverity) {
  if (s === "low") return "rgba(31,122,58,0.12)";
  if (s === "mid") return "rgba(255,193,7,0.14)";
  return "rgba(220,53,69,0.14)";
}

function severityText(s: IssueSeverity) {
  if (s === "low") return "#1F7A3A";
  if (s === "mid") return "#8A6B00";
  return "#B02A37";
}

function isDamageCategory(c: IssueCategory): c is DamageKind {
  return c === "scratch" || c === "dent" || c === "rust";
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function mapDamageEntries(items: InspectionItemRow[]): DamageEntry[] {
  return items
    .filter((it2) => isDamageCategory(it2.category))
    .map((it2) => ({
      id: it2.id,
      kind: it2.category as DamageKind,
      severity: it2.severity,
      positions: Array.isArray(it2.position?.positions)
        ? it2.position.positions
        : [],
      comment: it2.comment ?? "",
      photos: it2.photo_urls ?? [],
    }));
}

/* ----------------------------- DB calls ---------------------------- */

async function fetchEmployeesDetailer() {
  const { data, error } = await supabase
    .from("employees")
    .select("id, display_name, role, active")
    .eq("role", "detailer")
    .eq("active", true)
    .order("display_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as EmployeeRow[];
}

async function fetchLatestInspection(vehicleId: string, type: InspectionType) {
  const { data, error } = await supabase
    .from("inspections")
    .select(
      "id, vehicle_id, type, notes, actor_employee_id, created_at, updated_at",
    )
    .eq("vehicle_id", vehicleId)
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as InspectionRow) ?? null;
}

async function fetchInspectionItems(inspectionId: string) {
  const { data, error } = await supabase
    .from("inspection_items")
    .select(
      "id, inspection_id, category, severity, position, comment, photo_urls, created_at",
    )
    .eq("inspection_id", inspectionId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as InspectionItemRow[];
}

async function takeOverTask(args: {
  taskId: string;
  vehicleId: string;
  employeeId: string;
  taskType: TaskType | string;
}) {
  const inspectionType = inspectionTypeFromTaskType(args.taskType);

  let inspection = await fetchLatestInspection(args.vehicleId, inspectionType);

  if (!inspection) {
    const { data: created, error: insErr } = await supabase
      .from("inspections")
      .insert({
        vehicle_id: args.vehicleId,
        type: inspectionType,
        actor_employee_id: args.employeeId,
        notes: null,
      })
      .select(
        "id, vehicle_id, type, notes, actor_employee_id, created_at, updated_at",
      )
      .single();

    if (insErr) throw insErr;
    inspection = created as InspectionRow;
  }

  const { error: tErr } = await supabase
    .from("tasks")
    .update({
      status: "in_progress",
      assigned_employee_id: args.employeeId,
      actor_employee_id: args.employeeId,
    })
    .eq("id", args.taskId);

  if (tErr) throw tErr;

  return inspection;
}

async function completeTask(args: {
  taskId: string;
  employeeId: string;
  inspectionId: string;
  items: InspectionItemInsert[];
  notes?: string | null;
}) {
  if (args.items.length > 0) {
    const { error: itemsErr } = await supabase
      .from("inspection_items")
      .insert(args.items);
    if (itemsErr) throw itemsErr;
  }

  const { error: insErr } = await supabase
    .from("inspections")
    .update({
      actor_employee_id: args.employeeId,
      notes: args.notes ?? null,
    })
    .eq("id", args.inspectionId);

  if (insErr) throw insErr;

  const { error: tErr } = await supabase
    .from("tasks")
    .update({
      status: "done",
      done_at: new Date().toISOString(),
      actor_employee_id: args.employeeId,
    })
    .eq("id", args.taskId);

  if (tErr) throw tErr;
}

/* -------------------------- UI subcomponents ----------------------- */

function SeverityPicker({
  value,
  onChange,
  disabled,
}: {
  value: IssueSeverity;
  onChange: (next: IssueSeverity) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[sevStyles.row, disabled && { opacity: 0.6 }]}>
      {(["low", "mid", "high"] as const).map((s) => {
        const active = value === s;
        return (
          <Pressable
            key={s}
            onPress={() => !disabled && onChange(s)}
            style={[
              sevStyles.chip,
              active ? sevStyles.chipActive : sevStyles.chipInactive,
            ]}
          >
            <Text style={[sevStyles.text, active && sevStyles.textActive]}>
              {severityLabel(s)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const sevStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  chip: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  chipInactive: { backgroundColor: UI.surface },
  chipActive: {
    backgroundColor: "rgba(31,122,58,0.14)",
  },
  text: { fontSize: 11, fontWeight: "900", color: "rgba(0,0,0,0.55)" },
  textActive: { color: UI.green },
});

/* ------------------------------ Screen ----------------------------- */

export default function DetailerTaskDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const taskId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TaskDetail | null>(null);

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [employeeModal, setEmployeeModal] = useState(false);

  // inspection used for THIS task (intake -> intake inspection, final -> final inspection)
  const [inspection, setInspection] = useState<InspectionRow | null>(null);

  // read-only DB entries (especially for DONE)
  const [savedEntries, setSavedEntries] = useState<DamageEntry[]>([]);

  // editable draft entries while working
  const [draftEntries, setDraftEntries] = useState<DamageEntry[]>([]);

  // add/edit modal
  const [editOpen, setEditOpen] = useState<null | {
    kind: DamageKind;
    entryId?: string;
  }>(null);
  const [posSelected, setPosSelected] = useState<string[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [photosInput, setPhotosInput] = useState<string[]>([]);
  const [severity, setSeverity] = useState<IssueSeverity>("mid");

  // cleaning for final
  const [cleanInside, setCleanInside] = useState(false);
  const [cleanOutside, setCleanOutside] = useState(false);
  const [polish, setPolish] = useState(false);
  const [notes, setNotes] = useState("");

  const taskStatus: TaskStatus = String(data?.task?.status ?? "open");
  const taskType = String(data?.task?.type ?? "");
  const isFinal = taskType === "detail_final";

  const readOnly = taskStatus === "done";
  const started = taskStatus === "in_progress" || taskStatus === "done";
  const canEdit = started && !readOnly;

  // ✅ For detail_final: damages must be read-only always
  const canEditDamages = canEdit && !isFinal;

  const headerTitle = useMemo(() => prettyTitle(data), [data]);
  const headerVin = useMemo(() => prettyVin(data), [data]);
  const helperText = useMemo(() => subtitleFromTaskType(taskType), [taskType]);

  const load = useCallback(async () => {
    if (!taskId) return;

    setLoading(true);
    try {
      const res = await fetchTaskDetail(taskId);
      setData(res);

      const emps = await fetchEmployeesDetailer();
      setEmployees(emps);

      // auto-select assigned employee if present
      const assignedId = res.task.assigned_employee_id;
      if (assignedId) {
        const found = emps.find((e) => e.id === assignedId);
        if (found) setEmployee(found);
      }

      // reset per-load (avoid state leaking between vehicles)
      setDraftEntries([]);
      setEditOpen(null);

      // if we have vehicle -> load inspections
      const vehicleId = res.vehicle?.id;
      if (vehicleId) {
        if (!isFinal) {
          // ------------------ INTAKE TASK (existing behavior) ------------------
          const ins = await fetchLatestInspection(vehicleId, "intake");
          setInspection(ins);

          if (ins?.id) {
            const items = await fetchInspectionItems(ins.id);
            setSavedEntries(mapDamageEntries(items));
          } else {
            setSavedEntries([]);
          }

          // reset cleaning UI (not used in intake)
          setCleanInside(false);
          setCleanOutside(false);
          setPolish(false);
          setNotes("");
        } else {
          // ------------------ FINAL TASK (new behavior) ------------------
          // 1) Karosserie must show INTAKE inspection items (read-only)
          const intakeIns = await fetchLatestInspection(vehicleId, "intake");
          if (intakeIns?.id) {
            const intakeItems = await fetchInspectionItems(intakeIns.id);
            setSavedEntries(mapDamageEntries(intakeItems));
          } else {
            setSavedEntries([]);
          }

          // 2) We still need FINAL inspection for cleaning + to complete task
          const finalIns = await fetchLatestInspection(vehicleId, "final");
          setInspection(finalIns);

          // hydrate cleaning values from final inspection items
          if (finalIns?.id) {
            const finalItems = await fetchInspectionItems(finalIns.id);

            const cleaningItem = finalItems.find(
              (x) => x.category === "other" && x.position?.cleaning,
            );

            const c = cleaningItem?.position?.cleaning ?? null;

            setCleanInside(Boolean(c?.cleanInside ?? false));
            setCleanOutside(Boolean(c?.cleanOutside ?? false));
            setPolish(Boolean(c?.polish ?? false));

            // priority: cleaning item comment, fallback to inspection notes
            const n = String(
              cleaningItem?.comment ?? finalIns.notes ?? "",
            ).trim();
            setNotes(n);
          } else {
            // no final inspection yet (before takeover)
            setCleanInside(false);
            setCleanOutside(false);
            setPolish(false);
            setNotes("");
          }
        }
      }
    } catch (e: any) {
      console.log("detailer load error", e?.message ?? e);
    } finally {
      setLoading(false);
    }
  }, [isFinal, taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const startedByName = useMemo(() => {
    const assignedId = data?.task?.assigned_employee_id;
    if (!assignedId) return employee?.display_name ?? "—";
    const found = employees.find((e) => e.id === assignedId);
    return found?.display_name ?? employee?.display_name ?? "—";
  }, [data?.task?.assigned_employee_id, employee?.display_name, employees]);

  const startedAt = useMemo(() => {
    if (inspection?.created_at) return inspection.created_at;
    return data?.task?.updated_at ?? null;
  }, [data?.task?.updated_at, inspection?.created_at]);

  const openAdd = useCallback(
    (kind: DamageKind) => {
      if (!canEditDamages) return;
      setEditOpen({ kind });
      setPosSelected([]);
      setCommentInput("");
      setPhotosInput([]);
      setSeverity("mid");
    },
    [canEditDamages],
  );

  const openEdit = useCallback(
    (kind: DamageKind, entryId: string) => {
      if (!canEditDamages) return;
      const entry = draftEntries.find((e) => e.id === entryId);
      if (!entry) return;

      setEditOpen({ kind, entryId });
      setPosSelected(entry.positions);
      setCommentInput(entry.comment);
      setPhotosInput(entry.photos);
      setSeverity(entry.severity);
    },
    [canEditDamages, draftEntries],
  );

  const closeEdit = useCallback(() => setEditOpen(null), []);

  const saveEdit = useCallback(() => {
    if (!editOpen) return;

    const positions = uniq(posSelected).slice(0, 12);
    if (positions.length === 0) {
      Alert.alert(
        "Position fehlt",
        "Bitte mindestens eine Position auswählen.",
      );
      return;
    }

    const base = {
      severity,
      positions,
      comment: commentInput.trim(),
      photos: photosInput,
    };

    // create
    if (!editOpen.entryId) {
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const next: DamageEntry = { id, kind: editOpen.kind, ...base };
      setDraftEntries((p) => [next, ...p]);
      closeEdit();
      return;
    }

    // update (draft only)
    setDraftEntries((p) =>
      p.map((x) => (x.id === editOpen.entryId ? { ...x, ...base } : x)),
    );
    closeEdit();
  }, [closeEdit, commentInput, editOpen, photosInput, posSelected, severity]);

  const removeDraftEntry = useCallback((entryId: string) => {
    Alert.alert("Eintrag löschen?", "Möchtest du diesen Eintrag entfernen?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: () =>
          setDraftEntries((p) => p.filter((x) => x.id !== entryId)),
      },
    ]);
  }, []);

  const entriesByKind = useMemo(() => {
    // ✅ For detail_final we never show draft damages
    const all = readOnly
      ? savedEntries
      : isFinal
        ? savedEntries
        : [...draftEntries, ...savedEntries];

    return {
      scratch: all.filter((e) => e.kind === "scratch"),
      dent: all.filter((e) => e.kind === "dent"),
      rust: all.filter((e) => e.kind === "rust"),
    };
  }, [draftEntries, isFinal, readOnly, savedEntries]);

  const takeover = useCallback(async () => {
    if (!taskId || !data?.vehicle?.id) return;
    if (!employee) {
      Alert.alert(
        "Mitarbeiter fehlt",
        "Bitte zuerst einen Mitarbeiter auswählen.",
      );
      return;
    }

    try {
      setLoading(true);
      const ins = await takeOverTask({
        taskId,
        vehicleId: data.vehicle.id,
        employeeId: employee.id,
        taskType: data.task.type,
      });
      setInspection(ins);

      Alert.alert("Übernommen", "Aufgabe wurde übernommen.");
      await load();
    } catch (e: any) {
      Alert.alert("Fehler", e?.message ?? "Übernehmen fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }, [data?.task.type, data?.vehicle?.id, employee, load, taskId]);

  const endTask = useCallback(async () => {
    if (!taskId || !inspection?.id || !employee) return;

    if (
      draftEntries.length === 0 &&
      !notes.trim() &&
      !cleanInside &&
      !cleanOutside &&
      !polish
    ) {
      Alert.alert(
        "Keine Daten",
        "Bitte mindestens einen Eintrag erfassen oder Notizen ergänzen.",
      );
      return;
    }

    try {
      setLoading(true);

      const items: InspectionItemInsert[] = [];

      // Only draft entries are inserted (detail_final typically has none)
      for (const e of draftEntries) {
        items.push({
          inspection_id: inspection.id,
          category: e.kind,
          severity: e.severity,
          position: { positions: e.positions },
          comment: e.comment || null,
          photo_urls: e.photos ?? [],
        });
      }

      const hasCleaning =
        taskType === "detail_final" &&
        (cleanInside || cleanOutside || polish || notes.trim());

      if (hasCleaning) {
        items.push({
          inspection_id: inspection.id,
          category: "other",
          severity: "low",
          position: { cleaning: { cleanInside, cleanOutside, polish } },
          comment: notes.trim() || null,
          photo_urls: [],
        });
      }

      await completeTask({
        taskId,
        employeeId: employee.id,
        inspectionId: inspection.id,
        items,
        notes: notes.trim() || null,
      });

      Alert.alert("Erledigt", "Aufgabe wurde abgeschlossen.");
      router.back();
    } catch (e: any) {
      Alert.alert("Fehler", e?.message ?? "Abschließen fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }, [
    cleanInside,
    cleanOutside,
    draftEntries,
    employee,
    inspection?.id,
    notes,
    polish,
    taskId,
    taskType,
  ]);

  return (
    <Screen variant="scroll" bottomSpace={160}>
      <View style={styles.container}>
        {loading && !data ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Lade Aufgabe…</Text>
          </View>
        ) : null}

        <View style={styles.hintRow}>
          <Feather name="info" size={14} color={UI.muted} />
          <Text style={styles.hintText}>{helperText}</Text>
        </View>

        <VehicleHeroCard title={headerTitle} vin={headerVin} />

        {!started ? (
          <View style={styles.takeoverRow}>
            <AppButton
              title={employee ? employee.display_name : "Mitarbeiter wählen"}
              onPress={() => setEmployeeModal(true)}
              variant="secondary"
              style={{ marginTop: 0, flex: 1 }}
            />
            <AppButton
              title={loading ? "…" : "Aufgabe übernehmen"}
              onPress={takeover}
              variant="primary"
              disabled={!employee || loading}
              style={{ marginTop: 0, flex: 1 }}
            />
          </View>
        ) : (
          <>
            <View style={styles.startedInfo}>
              <Text style={styles.startedLine}>
                <Text style={styles.startedLabel}>Übernommen von: </Text>
                <Text style={styles.startedValue}>{startedByName}</Text>
              </Text>
              <Text style={styles.startedLine}>
                <Text style={styles.startedLabel}>Gestartet am: </Text>
                <Text style={styles.startedValue}>
                  {startedAt ? formatDateTime(startedAt) : "—"}
                </Text>
              </Text>

              {readOnly ? (
                <Text style={styles.readOnlyHint}>
                  Diese Aufgabe ist erledigt. Inhalte sind nur zur Ansicht.
                </Text>
              ) : null}
            </View>

            <AccordionCard title="Karosserie" defaultOpen>
              {(["scratch", "dent", "rust"] as const).map((kind) => {
                const list = entriesByKind[kind];
                return (
                  <View key={kind} style={{ gap: 10 }}>
                    <View style={styles.sectionHeader}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.sectionTitle}>
                          {damageLabel(kind)}
                        </Text>
                        <Text style={styles.sectionSub}>
                          {list.length === 0
                            ? emptyDamageText(kind)
                            : `${list.length} Eintrag${list.length === 1 ? "" : "e"} dokumentiert`}
                        </Text>
                      </View>

                      {canEditDamages ? (
                        <Pressable
                          onPress={() => openAdd(kind)}
                          style={({ pressed }) => [
                            styles.addBtn,
                            pressed ? { opacity: 0.88 } : null,
                          ]}
                          hitSlop={10}
                        >
                          <Text style={styles.addBtnText}>+ Hinzufügen</Text>
                        </Pressable>
                      ) : null}
                    </View>

                    {list.length > 0 ? (
                      <View style={{ gap: 10 }}>
                        {list.map((e) => {
                          const isDraft = draftEntries.some(
                            (d) => d.id === e.id,
                          );
                          const editable = canEditDamages && isDraft;

                          return (
                            <Pressable
                              key={e.id}
                              disabled={!editable}
                              onPress={() => editable && openEdit(kind, e.id)}
                              style={({ pressed }) => [
                                styles.entryCard,
                                pressed && editable ? { opacity: 0.92 } : null,
                              ]}
                            >
                              <View style={styles.entryTop}>
                                <View
                                  style={[
                                    styles.sevPill,
                                    {
                                      backgroundColor: severityTone(e.severity),
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.sevText,
                                      { color: severityText(e.severity) },
                                    ]}
                                  >
                                    {severityLabel(e.severity)}
                                  </Text>
                                </View>

                                {editable ? (
                                  <Pressable
                                    onPress={() => removeDraftEntry(e.id)}
                                    hitSlop={10}
                                  >
                                    <Feather
                                      name="trash-2"
                                      size={16}
                                      color="rgba(0,0,0,0.55)"
                                    />
                                  </Pressable>
                                ) : null}
                              </View>

                              <Text style={styles.entryTitle} numberOfLines={2}>
                                Position: {e.positions.join(", ") || "—"}
                              </Text>

                              <Text style={styles.entrySub} numberOfLines={2}>
                                {e.comment ? e.comment : "Kein Kommentar"}
                              </Text>

                              <Text style={styles.entryMeta}>
                                {e.photos.length} Foto
                                {e.photos.length === 1 ? "" : "s"}
                                {editable ? " · Tippen zum Bearbeiten" : ""}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </AccordionCard>

            {taskType === "detail_final" ? (
              <AccordionCard title="Reinigung" defaultOpen>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Innenreinigung</Text>
                  <SwitchControl
                    value={cleanInside}
                    onChange={setCleanInside}
                    disabled={!canEdit}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Außenreinigung</Text>
                  <SwitchControl
                    value={cleanOutside}
                    onChange={setCleanOutside}
                    disabled={!canEdit}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Politur</Text>
                  <SwitchControl
                    value={polish}
                    onChange={setPolish}
                    disabled={!canEdit}
                  />
                </View>

                <View style={styles.notesBlock}>
                  <Text style={styles.notesTitle}>Sonstiges</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    editable={canEdit}
                    placeholder="Freitext…"
                    placeholderTextColor="rgba(0,0,0,0.35)"
                    style={[styles.notesInput, !canEdit && { opacity: 0.7 }]}
                    multiline
                  />
                </View>
              </AccordionCard>
            ) : null}

            {canEdit ? (
              <AppButton
                title={loading ? "Speichern..." : "Aufgabe beenden"}
                onPress={endTask}
                variant="primary"
                disabled={!employee || !inspection?.id || loading}
                style={{ marginTop: 0 }}
              />
            ) : null}
          </>
        )}

        {/* Employee Modal */}
        <Modal
          visible={employeeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setEmployeeModal(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setEmployeeModal(false)}
          />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Mitarbeiter wählen</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {employees.map((e) => {
                const active = employee?.id === e.id;
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => {
                      setEmployee(e);
                      setEmployeeModal(false);
                    }}
                    style={({ pressed }) => [
                      styles.employeeRow,
                      active ? styles.employeeRowActive : null,
                      pressed ? { opacity: 0.9 } : null,
                    ]}
                  >
                    <Text style={styles.employeeName}>{e.display_name}</Text>
                    {active ? (
                      <Feather name="check" size={16} color={UI.green} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Modal>

        {/* Add/Edit Modal (draft entries) */}
        <Modal
          visible={!!editOpen}
          transparent
          animationType="slide"
          onRequestClose={closeEdit}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeEdit} />

          <View
            style={[styles.addSheet, { paddingBottom: 16 + insets.bottom }]}
          >
            <View style={styles.addHeader}>
              <Text style={styles.addTitle}>
                {editOpen
                  ? `${damageLabel(editOpen.kind)} ${
                      editOpen.entryId ? "bearbeiten" : "hinzufügen"
                    }`
                  : "Bearbeiten"}
              </Text>
              <Pressable onPress={closeEdit} hitSlop={10} style={styles.closeX}>
                <Feather name="x" size={18} color={UI.text} />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Schweregrad</Text>
            <SeverityPicker value={severity} onChange={setSeverity} />

            <Text style={styles.fieldLabel}>Position(en)</Text>
            <PositionPicker value={posSelected} onChange={setPosSelected} />

            <Text style={styles.fieldLabel}>Kommentar</Text>
            <TextInput
              value={commentInput}
              onChangeText={setCommentInput}
              placeholder="Optional…"
              placeholderTextColor="rgba(0,0,0,0.35)"
              style={[styles.input, { height: 84 }]}
              multiline
            />

            <Text style={styles.fieldLabel}>Bilder</Text>
            <ImagePickerField value={photosInput} onChange={setPhotosInput} />

            <View style={styles.addActions}>
              <AppButton
                title="Abbrechen"
                onPress={closeEdit}
                variant="secondary"
                style={{ marginTop: 0, flex: 1 }}
              />
              <AppButton
                title="Speichern"
                onPress={saveEdit}
                variant="primary"
                style={{ marginTop: 0, flex: 1 }}
              />
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

/* ------------------------------ styles ----------------------------- */

const styles = StyleSheet.create({
  container: { gap: 16 },

  loading: { paddingVertical: 16, alignItems: "center", gap: 10 },
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

  startedInfo: {
    backgroundColor: UI.surface,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  startedLine: { fontSize: 12, fontWeight: "700", color: UI.text },
  startedLabel: { color: UI.muted },
  startedValue: { color: UI.text },

  readOnlyHint: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    color: UI.muted,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: { fontSize: 13, fontWeight: "900", color: UI.text },
  sectionSub: { fontSize: 11, fontWeight: "600", color: UI.muted },

  addBtn: {
    backgroundColor: UI.green,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  entryCard: {
    backgroundColor: UI.surface,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  entryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  entryTitle: { fontSize: 12, fontWeight: "900", color: UI.text },
  entrySub: {
    fontSize: 11,
    fontWeight: "700",
    color: UI.muted,
    lineHeight: 15,
  },
  entryMeta: { fontSize: 10, fontWeight: "800", color: "rgba(0,0,0,0.45)" },

  sevPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  sevText: { fontSize: 10, fontWeight: "900" },

  switchRow: {
    backgroundColor: UI.surface,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: { fontSize: 12, fontWeight: "800", color: UI.text },

  notesBlock: {
    backgroundColor: UI.surface,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  notesTitle: { fontSize: 12, fontWeight: "900", color: UI.text },
  notesInput: {
    minHeight: 90,
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: "600",
    color: UI.text,
  },

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
    gap: 10,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: UI.text,
    marginBottom: 6,
  },

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
    backgroundColor: "rgba(31,122,58,0.10)",
  },
  employeeName: { fontSize: 12, fontWeight: "900", color: UI.text },

  addSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    gap: 10,
  },
  addHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  addTitle: { fontSize: 15, fontWeight: "900", color: UI.text },
  closeX: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  fieldLabel: { fontSize: 11, fontWeight: "900", color: UI.muted },

  input: {
    height: 44,
    borderRadius: 12,
    backgroundColor: UI.surface,
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: "800",
    color: UI.text,
  },

  addActions: { flexDirection: "row", gap: 12, marginTop: 10 },
});
