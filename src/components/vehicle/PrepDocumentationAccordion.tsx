import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

import AccordionCard from "@/src/components/ui/AccordionCard";
import {
  fetchPrepDocumentationForCarx,
  fetchPrepDocumentationForVehicle,
  type DbInspectionItem,
  type DbInspection,
} from "@/src/features/inspections/prepDocumentation.service";

type Props = {
  carxVehicleId: string | number;
  carxVin?: string | null;

  /** wenn gesetzt, wird KEIN matching gemacht, sondern direkt so geladen */
  vehicleId?: string | null;

  /** wenn true, zeigt zusätzlich Final-Doku an (falls vorhanden) */
  includeFinal?: boolean;
};

const T = {
  greenA: "#145437",
  greenB: "#2F763E",
  chipText: "#fff",

  muted: "rgba(0,0,0,0.55)",
  text: "#000",

  chipRadius: 999,
  chipPadH: 10,
  chipPadV: 6,

  thumbW: 86,
  thumbH: 54,
  thumbR: 10,

  sectionBg: "rgba(0,0,0,0.04)",
  sectionRadius: 14,
};

function prettyCategory(raw: string) {
  const c = (raw ?? "").toLowerCase();

  if (c === "scratch" || c.includes("kratzer")) return "Kratzer";
  if (c === "dent" || c.includes("delle")) return "Dellen";
  if (c === "rust" || c.includes("rost")) return "Rost";
  if (
    c === "other" ||
    c.includes("vormerk") ||
    c.includes("remark") ||
    c.includes("note")
  )
    return "Vormerkungen";

  return raw || "Sonstiges";
}

function catIcon(label: string): keyof typeof Feather.glyphMap {
  switch (label) {
    case "Kratzer":
      return "scissors";
    case "Dellen":
      return "disc";
    case "Rost":
      return "wind";
    case "Vormerkungen":
      return "edit-3";
    default:
      return "file-text";
  }
}

function extractPositionLabels(position: any): string[] {
  if (!position) return [];
  if (typeof position === "string") return [position];
  if (Array.isArray(position))
    return position.map((x) => String(x)).filter(Boolean);

  if (typeof position === "object") {
    const keys = ["labels", "tags", "positions", "parts", "areas"];
    for (const k of keys) {
      const v = (position as any)[k];
      if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
      if (typeof v === "string" && v.trim()) return [v.trim()];
    }

    const out: string[] = [];
    for (const v of Object.values(position)) {
      if (typeof v === "string" && v.trim()) out.push(v.trim());
    }
    return out;
  }

  return [];
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function Chip({ label }: { label: string }) {
  return (
    <LinearGradient
      colors={[T.greenA, T.greenB]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.chip}
    >
      <Text style={styles.chipText} numberOfLines={1}>
        {label}
      </Text>
    </LinearGradient>
  );
}

function Section({
  title,
  inspection,
  items,
}: {
  title: string;
  inspection: DbInspection | null;
  items: DbInspectionItem[];
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, DbInspectionItem[]>();

    for (const it of items) {
      const label = prettyCategory(String(it.category ?? ""));
      const curr = map.get(label) ?? [];
      curr.push(it);
      map.set(label, curr);
    }

    const order = ["Kratzer", "Dellen", "Rost", "Vormerkungen"];
    const rest = Array.from(map.keys())
      .filter((k) => !order.includes(k))
      .sort();

    return [...order, ...rest]
      .filter((k) => map.has(k))
      .map((k) => ({ label: k, icon: catIcon(k), items: map.get(k)! }));
  }, [items]);

  const photos = useMemo(() => {
    const all: string[] = [];
    for (const it of items) {
      for (const u of it.photo_urls ?? []) {
        if (u) all.push(u);
      }
    }
    return uniq(all);
  }, [items]);

  if (!inspection) return null;

  return (
    <View style={styles.sectionWrap}>
      <View style={styles.sectionTop}>
        <Text style={styles.sectionTitleBig}>{title}</Text>
        <Text style={styles.sectionMeta}>
          {inspection.created_at
            ? `Gespeichert am ${fmtDate(inspection.created_at)}`
            : ""}
        </Text>
      </View>

      {grouped.map((g) => {
        const posLabels = uniq(
          g.items.flatMap((it) => extractPositionLabels(it.position)),
        );
        const comments = g.items
          .map((it) => (it.comment ?? "").trim())
          .filter(Boolean);

        const isRemarks = g.label === "Vormerkungen";

        return (
          <View key={`${title}-${g.label}`} style={styles.block}>
            <View style={styles.blockHead}>
              <Feather name={g.icon} size={16} color={T.text} />
              <Text style={styles.blockTitle}>{g.label}</Text>
            </View>

            {isRemarks ? (
              <Text style={styles.notesText}>
                {comments.length ? comments.join("\n\n") : "—"}
              </Text>
            ) : (
              <View style={styles.chipsWrap}>
                {posLabels.length ? (
                  posLabels.map((p) => (
                    <Chip key={`${title}-${g.label}-${p}`} label={p} />
                  ))
                ) : (
                  <Text style={styles.muted}>—</Text>
                )}
              </View>
            )}
          </View>
        );
      })}

      <View style={styles.divider} />

      <Text style={styles.photosTitle}>Bilder</Text>

      {photos.length ? (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={photos}
          keyExtractor={(u, i) => `${u}-${i}`}
          ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={styles.thumb} />
          )}
        />
      ) : (
        <Text style={styles.muted}>Keine Bilder vorhanden.</Text>
      )}
    </View>
  );
}

export default function PrepDocumentationAccordion({
  carxVehicleId,
  carxVin,
  vehicleId,
  includeFinal = false,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [intakeInspection, setIntakeInspection] = useState<DbInspection | null>(
    null,
  );
  const [intakeItems, setIntakeItems] = useState<DbInspectionItem[]>([]);

  const [finalInspection, setFinalInspection] = useState<DbInspection | null>(
    null,
  );
  const [finalItems, setFinalItems] = useState<DbInspectionItem[]>([]);

  const [resolved, setResolved] = useState(false);

  const hasAny = useMemo(() => {
    return Boolean(intakeInspection?.id || finalInspection?.id);
  }, [finalInspection?.id, intakeInspection?.id]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = vehicleId
        ? await fetchPrepDocumentationForVehicle({
            vehicleId,
            includeFinal,
          })
        : await fetchPrepDocumentationForCarx({
            carxVehicleId,
            vin: carxVin ?? null,
            includeFinal,
          });

      setResolved(Boolean(res.vehicle?.id));

      setIntakeInspection(res.intake.inspection);
      setIntakeItems(res.intake.items);

      setFinalInspection(res.final.inspection);
      setFinalItems(res.final.items);
    } catch (e: any) {
      console.log("prep doc load error", e?.message ?? e);
      setResolved(false);
      setIntakeInspection(null);
      setIntakeItems([]);
      setFinalInspection(null);
      setFinalItems([]);
    } finally {
      setLoading(false);
    }
  }, [carxVehicleId, carxVin, includeFinal, vehicleId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const emptyState = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Lade Aufbereitung…</Text>
        </View>
      );
    }

    const title = resolved
      ? "Noch keine Aufbereitung dokumentiert."
      : "Noch keine interne Dokumentation verfügbar.";

    const sub = resolved
      ? "Sobald der Aufbereiter die Dokumentation speichert, erscheint sie hier."
      : "Dieses Fahrzeug ist noch nicht mit einer internen Fahrzeugakte verknüpft (CarX-ID/VIN).";

    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptySub}>{sub}</Text>

        <Pressable
          onPress={load}
          style={({ pressed }) => [styles.retry, pressed && { opacity: 0.85 }]}
        >
          <Feather name="refresh-cw" size={14} color={T.text} />
          <Text style={styles.retryText}>Neu laden</Text>
        </Pressable>
      </View>
    );
  }, [loading, load, resolved]);

  return (
    <AccordionCard title="Aufbereiter Dokumentation" defaultOpen>
      {!hasAny ? (
        emptyState
      ) : (
        <View style={{ gap: 14 }}>
          <Section
            title="Eingangsdokumentation"
            inspection={intakeInspection}
            items={intakeItems}
          />
          {includeFinal ? (
            <Section
              title="Finale Dokumentation"
              inspection={finalInspection}
              items={finalItems}
            />
          ) : null}
        </View>
      )}
    </AccordionCard>
  );
}

const styles = StyleSheet.create({
  sectionWrap: {
    backgroundColor: T.sectionBg,
    borderRadius: T.sectionRadius,
    padding: 12,
    gap: 12,
  },

  sectionTop: { gap: 2 },

  sectionTitleBig: {
    fontSize: 13,
    fontWeight: "900",
    color: T.text,
  },

  sectionMeta: {
    fontSize: 11,
    fontWeight: "700",
    color: T.muted,
  },

  block: { gap: 8 },

  blockHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  blockTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: T.text,
  },

  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  chip: {
    paddingHorizontal: T.chipPadH,
    paddingVertical: T.chipPadV,
    borderRadius: T.chipRadius,
  },

  chipText: {
    color: T.chipText,
    fontSize: 11,
    fontWeight: "700",
  },

  notesText: {
    color: "rgba(0,0,0,0.75)",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },

  divider: { height: 1, backgroundColor: "rgba(0,0,0,0.06)" },

  photosTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: T.text,
  },

  thumb: {
    width: T.thumbW,
    height: T.thumbH,
    borderRadius: T.thumbR,
    backgroundColor: "rgba(0,0,0,0.06)",
  },

  muted: { color: T.muted, fontWeight: "600" },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  loadingText: { color: T.muted, fontWeight: "700" },

  empty: { gap: 10 },

  emptyTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: T.text,
  },

  emptySub: {
    fontSize: 12,
    fontWeight: "600",
    color: T.muted,
    lineHeight: 18,
  },

  retry: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },

  retryText: {
    fontSize: 12,
    fontWeight: "800",
    color: T.text,
  },
});

// // src/components/vehicle/PrepDocumentationAccordion.tsx
// import React, { useCallback, useMemo, useState } from "react";
// import {
//   ActivityIndicator,
//   FlatList,
//   Image,
//   Pressable,
//   StyleSheet,
//   Text,
//   View,
// } from "react-native";
// import { LinearGradient } from "expo-linear-gradient";
// import { Feather } from "@expo/vector-icons";

// import AccordionCard from "@/src/components/ui/AccordionCard";
// import {
//   fetchPrepDocumentationForCarx,
//   type DbInspectionItem,
//   type DbInspection,
// } from "@/src/features/inspections/prepDocumentation.service";

// type Props = {
//   carxVehicleId: string | number;
//   carxVin?: string | null;

//   /** wenn true, zeigt zusätzlich Final-Doku an (falls vorhanden) */
//   includeFinal?: boolean;
// };

// const T = {
//   greenA: "#145437",
//   greenB: "#2F763E",
//   chipText: "#fff",

//   muted: "rgba(0,0,0,0.55)",
//   text: "#000",

//   chipRadius: 999,
//   chipPadH: 10,
//   chipPadV: 6,

//   thumbW: 86,
//   thumbH: 54,
//   thumbR: 10,

//   sectionBg: "rgba(0,0,0,0.04)",
//   sectionRadius: 14,
// };

// function prettyCategory(raw: string) {
//   const c = (raw ?? "").toLowerCase();

//   if (c === "scratch" || c.includes("kratzer")) return "Kratzer";
//   if (c === "dent" || c.includes("delle")) return "Dellen";
//   if (c === "rust" || c.includes("rost")) return "Rost";
//   if (
//     c === "other" ||
//     c.includes("vormerk") ||
//     c.includes("remark") ||
//     c.includes("note")
//   )
//     return "Vormerkungen";

//   return raw || "Sonstiges";
// }

// function catIcon(label: string): keyof typeof Feather.glyphMap {
//   switch (label) {
//     case "Kratzer":
//       return "scissors";
//     case "Dellen":
//       return "disc";
//     case "Rost":
//       return "wind";
//     case "Vormerkungen":
//       return "edit-3";
//     default:
//       return "file-text";
//   }
// }

// function extractPositionLabels(position: any): string[] {
//   if (!position) return [];
//   if (typeof position === "string") return [position];
//   if (Array.isArray(position))
//     return position.map((x) => String(x)).filter(Boolean);

//   if (typeof position === "object") {
//     const keys = ["labels", "tags", "positions", "parts", "areas"];
//     for (const k of keys) {
//       const v = (position as any)[k];
//       if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
//       if (typeof v === "string" && v.trim()) return [v.trim()];
//     }

//     const out: string[] = [];
//     for (const v of Object.values(position)) {
//       if (typeof v === "string" && v.trim()) out.push(v.trim());
//     }
//     return out;
//   }

//   return [];
// }

// function uniq<T>(arr: T[]) {
//   return Array.from(new Set(arr));
// }

// function fmtDate(iso?: string | null) {
//   if (!iso) return "";
//   try {
//     return new Intl.DateTimeFormat("de-AT", {
//       day: "2-digit",
//       month: "2-digit",
//       year: "numeric",
//     }).format(new Date(iso));
//   } catch {
//     return iso;
//   }
// }

// function Chip({ label }: { label: string }) {
//   return (
//     <LinearGradient
//       colors={[T.greenA, T.greenB]}
//       start={{ x: 0, y: 0 }}
//       end={{ x: 1, y: 1 }}
//       style={styles.chip}
//     >
//       <Text style={styles.chipText} numberOfLines={1}>
//         {label}
//       </Text>
//     </LinearGradient>
//   );
// }

// function Section({
//   title,
//   inspection,
//   items,
// }: {
//   title: string;
//   inspection: DbInspection | null;
//   items: DbInspectionItem[];
// }) {
//   const grouped = useMemo(() => {
//     const map = new Map<string, DbInspectionItem[]>();

//     for (const it of items) {
//       const label = prettyCategory(String(it.category ?? ""));
//       const curr = map.get(label) ?? [];
//       curr.push(it);
//       map.set(label, curr);
//     }

//     const order = ["Kratzer", "Dellen", "Rost", "Vormerkungen"];
//     const rest = Array.from(map.keys())
//       .filter((k) => !order.includes(k))
//       .sort();

//     return [...order, ...rest]
//       .filter((k) => map.has(k))
//       .map((k) => ({ label: k, icon: catIcon(k), items: map.get(k)! }));
//   }, [items]);

//   const photos = useMemo(() => {
//     const all: string[] = [];
//     for (const it of items) {
//       for (const u of it.photo_urls ?? []) {
//         if (u) all.push(u);
//       }
//     }
//     return uniq(all);
//   }, [items]);

//   if (!inspection) {
//     return null;
//   }

//   return (
//     <View style={styles.sectionWrap}>
//       <View style={styles.sectionTop}>
//         <Text style={styles.sectionTitleBig}>{title}</Text>
//         <Text style={styles.sectionMeta}>
//           {inspection.created_at
//             ? `Gespeichert am ${fmtDate(inspection.created_at)}`
//             : ""}
//         </Text>
//       </View>

//       {grouped.map((g) => {
//         const posLabels = uniq(
//           g.items.flatMap((it) => extractPositionLabels(it.position)),
//         );
//         const comments = g.items
//           .map((it) => (it.comment ?? "").trim())
//           .filter(Boolean);

//         const isRemarks = g.label === "Vormerkungen";

//         return (
//           <View key={`${title}-${g.label}`} style={styles.block}>
//             <View style={styles.blockHead}>
//               <Feather name={g.icon} size={16} color={T.text} />
//               <Text style={styles.blockTitle}>{g.label}</Text>
//             </View>

//             {isRemarks ? (
//               <Text style={styles.notesText}>
//                 {comments.length ? comments.join("\n\n") : "—"}
//               </Text>
//             ) : (
//               <View style={styles.chipsWrap}>
//                 {posLabels.length ? (
//                   posLabels.map((p) => (
//                     <Chip key={`${title}-${g.label}-${p}`} label={p} />
//                   ))
//                 ) : (
//                   <Text style={styles.muted}>—</Text>
//                 )}
//               </View>
//             )}
//           </View>
//         );
//       })}

//       <View style={styles.divider} />

//       <Text style={styles.photosTitle}>Bilder</Text>

//       {photos.length ? (
//         <FlatList
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           data={photos}
//           keyExtractor={(u, i) => `${u}-${i}`}
//           ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
//           renderItem={({ item }) => (
//             <Image source={{ uri: item }} style={styles.thumb} />
//           )}
//         />
//       ) : (
//         <Text style={styles.muted}>Keine Bilder vorhanden.</Text>
//       )}
//     </View>
//   );
// }

// export default function PrepDocumentationAccordion({
//   carxVehicleId,
//   carxVin,
//   includeFinal = false,
// }: Props) {
//   const [loading, setLoading] = useState(false);

//   const [intakeInspection, setIntakeInspection] = useState<DbInspection | null>(
//     null,
//   );
//   const [intakeItems, setIntakeItems] = useState<DbInspectionItem[]>([]);

//   const [finalInspection, setFinalInspection] = useState<DbInspection | null>(
//     null,
//   );
//   const [finalItems, setFinalItems] = useState<DbInspectionItem[]>([]);

//   const [resolved, setResolved] = useState(false); // ob internes vehicle gefunden wurde

//   const hasAny = useMemo(() => {
//     return Boolean(intakeInspection?.id || finalInspection?.id);
//   }, [finalInspection?.id, intakeInspection?.id]);

//   const load = useCallback(async () => {
//     setLoading(true);
//     try {
//       const res = await fetchPrepDocumentationForCarx({
//         carxVehicleId,
//         vin: carxVin ?? null,
//         includeFinal,
//       });

//       setResolved(Boolean(res.vehicle?.id));

//       setIntakeInspection(res.intake.inspection);
//       setIntakeItems(res.intake.items);

//       setFinalInspection(res.final.inspection);
//       setFinalItems(res.final.items);
//     } catch (e: any) {
//       console.log("prep doc load error", e?.message ?? e);
//       setResolved(false);
//       setIntakeInspection(null);
//       setIntakeItems([]);
//       setFinalInspection(null);
//       setFinalItems([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [carxVehicleId, carxVin, includeFinal]);

//   React.useEffect(() => {
//     load();
//   }, [load]);

//   const emptyState = useMemo(() => {
//     if (loading) {
//       return (
//         <View style={styles.loadingRow}>
//           <ActivityIndicator />
//           <Text style={styles.loadingText}>Lade Aufbereitung…</Text>
//         </View>
//       );
//     }

//     const title = resolved
//       ? "Noch keine Aufbereitung dokumentiert."
//       : "Noch keine interne Dokumentation verfügbar.";

//     const sub = resolved
//       ? "Sobald der Aufbereiter die Dokumentation speichert, erscheint sie hier."
//       : "Dieses Fahrzeug ist noch nicht mit einer internen Fahrzeugakte verknüpft (CarX-ID/VIN).";

//     return (
//       <View style={styles.empty}>
//         <Text style={styles.emptyTitle}>{title}</Text>
//         <Text style={styles.emptySub}>{sub}</Text>

//         <Pressable
//           onPress={load}
//           style={({ pressed }) => [styles.retry, pressed && { opacity: 0.85 }]}
//         >
//           <Feather name="refresh-cw" size={14} color={T.text} />
//           <Text style={styles.retryText}>Neu laden</Text>
//         </Pressable>
//       </View>
//     );
//   }, [loading, load, resolved]);

//   return (
//     <AccordionCard title="Aufbereiter Dokumentation" defaultOpen>
//       {!hasAny ? (
//         emptyState
//       ) : (
//         <View style={{ gap: 14 }}>
//           <Section
//             title="Eingangsdokumentation"
//             inspection={intakeInspection}
//             items={intakeItems}
//           />
//           {includeFinal ? (
//             <Section
//               title="Finale Dokumentation"
//               inspection={finalInspection}
//               items={finalItems}
//             />
//           ) : null}
//         </View>
//       )}
//     </AccordionCard>
//   );
// }

// const styles = StyleSheet.create({
//   sectionWrap: {
//     backgroundColor: T.sectionBg,
//     borderRadius: T.sectionRadius,
//     padding: 12,
//     gap: 12,
//   },

//   sectionTop: {
//     gap: 2,
//   },

//   sectionTitleBig: {
//     fontSize: 13,
//     fontWeight: "900",
//     color: T.text,
//   },

//   sectionMeta: {
//     fontSize: 11,
//     fontWeight: "700",
//     color: T.muted,
//   },

//   block: { gap: 8 },

//   blockHead: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//   },

//   blockTitle: {
//     fontSize: 13,
//     fontWeight: "800",
//     color: T.text,
//   },

//   chipsWrap: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     gap: 8,
//   },

//   chip: {
//     paddingHorizontal: T.chipPadH,
//     paddingVertical: T.chipPadV,
//     borderRadius: T.chipRadius,
//   },

//   chipText: {
//     color: T.chipText,
//     fontSize: 11,
//     fontWeight: "700",
//   },

//   notesText: {
//     color: "rgba(0,0,0,0.75)",
//     fontSize: 12,
//     fontWeight: "600",
//     lineHeight: 18,
//   },

//   divider: {
//     height: 1,
//     backgroundColor: "rgba(0,0,0,0.06)",
//   },

//   photosTitle: {
//     fontSize: 12,
//     fontWeight: "900",
//     color: T.text,
//   },

//   thumb: {
//     width: T.thumbW,
//     height: T.thumbH,
//     borderRadius: T.thumbR,
//     backgroundColor: "rgba(0,0,0,0.06)",
//   },

//   muted: {
//     color: T.muted,
//     fontWeight: "600",
//   },

//   loadingRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//   },

//   loadingText: {
//     color: T.muted,
//     fontWeight: "700",
//   },

//   empty: {
//     gap: 10,
//   },

//   emptyTitle: {
//     fontSize: 13,
//     fontWeight: "900",
//     color: T.text,
//   },

//   emptySub: {
//     fontSize: 12,
//     fontWeight: "600",
//     color: T.muted,
//     lineHeight: 18,
//   },

//   retry: {
//     alignSelf: "flex-start",
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 999,
//     backgroundColor: "rgba(0,0,0,0.06)",
//   },

//   retryText: {
//     fontSize: 12,
//     fontWeight: "800",
//     color: T.text,
//   },
// });
