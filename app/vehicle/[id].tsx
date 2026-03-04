import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import AccordionCard from "@/src/components/ui/AccordionCard";
import VehicleImageCarousel from "@/src/components/vehicle/VehicleImageCarousel";
import SpecGrid, { type SpecItem } from "@/src/components/vehicle/SpecGrid";
import { carxCarDetail } from "@/src/features/carx/carx.service";
import Screen from "@/src/components/ui/Screen";
import VehicleDetailsModal from "@/src/components/vehicle/VehicleDetailsModal";
import PrepDocumentationAccordion from "@/src/components/vehicle/PrepDocumentationAccordion";
import AppButton from "@/src/components/ui/AppButton";

import { findInternalVehicleForCarx } from "@/src/features/vehicles/vehicleResolve.service";
import { createOrGetDraftSale } from "@/src/features/sales/salesDraft.service";

function formatEUR(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "";
  try {
    return new Intl.NumberFormat("de-AT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${Math.round(value)} €`;
  }
}

function titleFromDetail(d: any) {
  const brand = d?.brand_txt?.trim();
  const model = d?.model_txt?.trim();
  const typ = d?.typ_txt?.trim();
  const variant = d?.variant_txt?.trim();
  return [brand, model, typ, variant].filter(Boolean).join(" ");
}

function arrivedLabel(d: any) {
  const raw = d?.eingangsdatum;
  if (!raw) return "";
  return `Eingetroffen am ${String(raw)}`;
}

export default function VehicleDetailScreen() {
  const params = useLocalSearchParams<{ vin?: string; id?: string }>();

  const carID = useMemo(() => {
    const id = params?.id ? String(params.id) : "";
    return id || "";
  }, [params?.id]);

  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [images, setImages] = useState<string[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [internalVehicleId, setInternalVehicleId] = useState<string | null>(
    null,
  );
  const [internalResolving, setInternalResolving] = useState(false);

  const [saleStarting, setSaleStarting] = useState(false);

  const load = useCallback(async () => {
    if (!carID) return;

    setLoading(true);
    try {
      const res = await carxCarDetail({ carID, imageSize: "xxxxl" });
      setDetail(res.detail);
      setImages(res.imageUrls?.length ? res.imageUrls : []);
    } catch (e: any) {
      console.log("vehicle detail error", e?.message ?? e);
    } finally {
      setLoading(false);
    }
  }, [carID]);

  React.useEffect(() => {
    load();
  }, [load]);

  // Resolve internes vehicle einmal (carx id + fallback VIN)
  React.useEffect(() => {
    if (!carID) return;

    (async () => {
      setInternalResolving(true);
      try {
        const v = await findInternalVehicleForCarx({
          carxVehicleId: carID,
          vin: detail?.vin ?? null,
        });
        setInternalVehicleId(v?.id ?? null);
      } catch (e: any) {
        console.log("resolve internal vehicle error", e?.message ?? e);
        setInternalVehicleId(null);
      } finally {
        setInternalResolving(false);
      }
    })();
  }, [carID, detail?.vin]);

  const model = useMemo(
    () => (detail ? titleFromDetail(detail) : ""),
    [detail],
  );

  const price = useMemo(() => {
    const p = detail?.vk_brutto ?? detail?.vk_netto ?? null;
    return p != null ? formatEUR(p) : "";
  }, [detail]);

  const specs: SpecItem[] = useMemo(() => {
    if (!detail) return [];

    const km =
      detail?.km_laufleistung != null ? `${detail.km_laufleistung} km` : "-";

    const ez = detail?.erstzulassung ? String(detail.erstzulassung) : "-";
    const farbe = detail?.farbe ? String(detail.farbe) : "-";
    const getriebe = detail?.getriebe_name ? String(detail.getriebe_name) : "-";
    const kraftstoff = detail?.kraftstoff_name
      ? String(detail.kraftstoff_name)
      : "-";

    const ps = detail?.ps_leistung;
    const kw = detail?.kw_leistung;
    const leistung =
      ps != null && kw != null
        ? `${ps} PS (${kw} kW)`
        : ps != null
          ? `${ps} PS`
          : kw != null
            ? `${kw} kW`
            : "-";

    return [
      { icon: "activity", label: "Kilometerstand", value: km },
      { icon: "calendar", label: "Erstzulassung", value: ez },
      { icon: "droplet", label: "Kraftstoff", value: kraftstoff },
      { icon: "settings", label: "Getriebe", value: getriebe },
      { icon: "tag", label: "Farbe", value: farbe },
      { icon: "zap", label: "Leistung", value: leistung },
    ];
  }, [detail]);

  const onStartSale = async () => {
    if (saleStarting) return;
    if (!carID) return;

    setSaleStarting(true);
    try {
      // falls internal noch nicht da (race condition), resolve on demand
      let vId = internalVehicleId;
      if (!vId) {
        const v = await findInternalVehicleForCarx({
          carxVehicleId: carID,
          vin: detail?.vin ?? null,
        });
        vId = v?.id ?? null;
        setInternalVehicleId(vId);
      }

      if (!vId) {
        Alert.alert(
          "Kein internes Fahrzeug",
          "Dieses Fahrzeug ist noch nicht in 'vehicles' verknüpft (carx_vehicle_id / VIN).",
        );
        return;
      }

      const sale = await createOrGetDraftSale(vId);

      router.push(`/sale/contract/${sale.id}/step1`);
    } catch (e: any) {
      Alert.alert(
        "Fehler",
        e?.message ?? "Konnte Verkaufsprozess nicht starten.",
      );
    } finally {
      setSaleStarting(false);
    }
  };

  return (
    <Screen variant="scroll" bottomSpace={140}>
      <View style={styles.container}>
        {loading && !detail ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Lade Fahrzeug…</Text>
          </View>
        ) : null}

        <View style={styles.headerBlock}>
          <Text style={styles.model} numberOfLines={2}>
            {model || String(params?.id ?? "")}
          </Text>
          <Text style={styles.price} numberOfLines={1}>
            {price}
          </Text>
        </View>

        <VehicleImageCarousel
          imageUrls={images}
          arrivedLabel={detail ? arrivedLabel(detail) : ""}
        />

        <AccordionCard
          title="Beschreibung"
          defaultOpen
          actionLabel="alles anzeigen"
          onActionPress={() => setDetailsOpen(true)}
        >
          <SpecGrid items={specs} />
        </AccordionCard>

        <PrepDocumentationAccordion
          carxVehicleId={carID}
          carxVin={detail?.vin ?? null}
          vehicleId={internalVehicleId}
        />

        <AppButton
          title="Verkaufsprozess beginnen"
          onPress={onStartSale}
          loading={saleStarting}
          disabled={saleStarting || internalResolving}
        />

        <VehicleDetailsModal
          visible={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          detail={detail}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 20 },

  loading: {
    paddingVertical: 16,
    alignItems: "center",
    gap: 10,
  },

  loadingText: {
    color: "rgba(0,0,0,0.55)",
    fontWeight: "700",
  },

  headerBlock: { gap: 6 },

  model: { fontSize: 17, fontWeight: "900", color: "#000" },

  price: { fontSize: 15, fontWeight: "900", color: "#000" },
});

// import React, { useCallback, useMemo, useState } from "react";
// import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
// import { useLocalSearchParams } from "expo-router";

// import AccordionCard from "@/src/components/ui/AccordionCard";
// import VehicleImageCarousel from "@/src/components/vehicle/VehicleImageCarousel";
// import SpecGrid, { type SpecItem } from "@/src/components/vehicle/SpecGrid";
// import { carxCarDetail } from "@/src/features/carx/carx.service";
// import Screen from "@/src/components/ui/Screen";
// import VehicleDetailsModal from "@/src/components/vehicle/VehicleDetailsModal";
// import PrepDocumentationAccordion from "@/src/components/vehicle/PrepDocumentationAccordion";
// import AppButton from "@/src/components/ui/AppButton";

// function formatEUR(value?: number | null) {
//   if (value == null || Number.isNaN(value)) return "";
//   try {
//     return new Intl.NumberFormat("de-AT", {
//       style: "currency",
//       currency: "EUR",
//       maximumFractionDigits: 0,
//     }).format(value);
//   } catch {
//     return `${Math.round(value)} €`;
//   }
// }

// function titleFromDetail(d: any) {
//   const brand = d?.brand_txt?.trim();
//   const model = d?.model_txt?.trim();
//   const typ = d?.typ_txt?.trim();
//   const variant = d?.variant_txt?.trim();
//   return [brand, model, typ, variant].filter(Boolean).join(" ");
// }

// function arrivedLabel(d: any) {
//   const raw = d?.eingangsdatum;
//   if (!raw) return "";
//   return `Eingetroffen am ${String(raw)}`;
// }

// export default function VehicleDetailScreen() {
//   const params = useLocalSearchParams<{ vin?: string; id?: string }>();

//   const carID = useMemo(() => {
//     const id = params?.id ? String(params.id) : "";
//     return id || "";
//   }, [params?.id]);

//   const [loading, setLoading] = useState(false);
//   const [detail, setDetail] = useState<any>(null);
//   const [images, setImages] = useState<string[]>([]);
//   const [detailsOpen, setDetailsOpen] = useState(false);

//   const load = useCallback(async () => {
//     if (!carID) return;

//     setLoading(true);
//     try {
//       const res = await carxCarDetail({ carID, imageSize: "xxxxl" });
//       setDetail(res.detail);
//       setImages(res.imageUrls?.length ? res.imageUrls : []);
//     } catch (e: any) {
//       console.log("vehicle detail error", e?.message ?? e);
//     } finally {
//       setLoading(false);
//     }
//   }, [carID]);

//   React.useEffect(() => {
//     load();
//   }, [load]);

//   const model = useMemo(
//     () => (detail ? titleFromDetail(detail) : ""),
//     [detail],
//   );

//   const price = useMemo(() => {
//     const p = detail?.vk_brutto ?? detail?.vk_netto ?? null;
//     return p != null ? formatEUR(p) : "";
//   }, [detail]);

//   const specs: SpecItem[] = useMemo(() => {
//     if (!detail) return [];

//     const km =
//       detail?.km_laufleistung != null ? `${detail.km_laufleistung} km` : "-";

//     const ez = detail?.erstzulassung ? String(detail.erstzulassung) : "-";
//     const farbe = detail?.farbe ? String(detail.farbe) : "-";
//     const getriebe = detail?.getriebe_name ? String(detail.getriebe_name) : "-";
//     const kraftstoff = detail?.kraftstoff_name
//       ? String(detail.kraftstoff_name)
//       : "-";

//     const ps = detail?.ps_leistung;
//     const kw = detail?.kw_leistung;
//     const leistung =
//       ps != null && kw != null
//         ? `${ps} PS (${kw} kW)`
//         : ps != null
//           ? `${ps} PS`
//           : kw != null
//             ? `${kw} kW`
//             : "-";

//     return [
//       { icon: "activity", label: "Kilometerstand", value: km },
//       { icon: "calendar", label: "Erstzulassung", value: ez },
//       { icon: "droplet", label: "Kraftstoff", value: kraftstoff },
//       { icon: "settings", label: "Getriebe", value: getriebe },
//       { icon: "tag", label: "Farbe", value: farbe },
//       { icon: "zap", label: "Leistung", value: leistung },
//     ];
//   }, [detail]);

//   return (
//     <Screen variant="scroll" bottomSpace={100}>
//       <View style={styles.container}>
//         {loading && !detail ? (
//           <View style={styles.loading}>
//             <ActivityIndicator />
//             <Text style={styles.loadingText}>Lade Fahrzeug…</Text>
//           </View>
//         ) : null}

//         <View style={styles.headerBlock}>
//           <Text style={styles.model} numberOfLines={2}>
//             {model || String(params?.id ?? "")}
//           </Text>
//           <Text style={styles.price} numberOfLines={1}>
//             {price}
//           </Text>
//         </View>

//         <VehicleImageCarousel
//           imageUrls={images}
//           arrivedLabel={detail ? arrivedLabel(detail) : ""}
//         />

//         <AccordionCard
//           title="Beschreibung"
//           defaultOpen
//           actionLabel="alles anzeigen"
//           onActionPress={() => setDetailsOpen(true)}
//         >
//           <SpecGrid items={specs} />
//         </AccordionCard>

//         {/* NEU: Aufbereiter Dokumentation */}
//         <PrepDocumentationAccordion
//           carxVehicleId={carID}
//           carxVin={detail?.vin ?? null}
//         />

//         <AppButton
//           title="Verkaufsprozess beginnen"
//           onPress={() => {
//             console.log("cklicked main button");
//           }}
//         />

//         <VehicleDetailsModal
//           visible={detailsOpen}
//           onClose={() => setDetailsOpen(false)}
//           detail={detail}
//         />
//       </View>
//     </Screen>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     gap: 20,
//   },

//   loading: {
//     paddingVertical: 16,
//     alignItems: "center",
//     gap: 10,
//   },

//   loadingText: {
//     color: "rgba(0,0,0,0.55)",
//     fontWeight: "700",
//   },

//   headerBlock: {
//     gap: 6,
//   },

//   model: {
//     fontSize: 17,
//     fontWeight: "900",
//     color: "#000",
//   },

//   price: {
//     fontSize: 15,
//     fontWeight: "900",
//     color: "#000",
//   },
// });
