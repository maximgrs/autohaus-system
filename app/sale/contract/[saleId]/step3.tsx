import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";

import Screen from "@/src/components/ui/Screen";
import AccordionCard from "@/src/components/ui/AccordionCard";
import AppButton from "@/src/components/ui/AppButton";

import {
  fetchSaleSummary,
  generateContract,
  openExistingContractSignedUrl,
  type SaleSummary,
} from "@/src/features/sales/saleStep3.service";

type CarxSnapshotSelected = {
  dyna_fin?: string | null;
  dyna_motor_nr?: string | null;

  brand_txt?: string | null;
  brand_name?: string | null;
  model_txt?: string | null;
  model_name?: string | null;
  typ_txt?: string | null;
  variant_txt?: string | null;
  full_text?: string | null;

  farbe?: string | null;
  baujahr?: number | null;
  erstzulassung?: string | null;
  erstzulassung_sort?: string | null;
  eingangsdatum?: string | null;
  datum_hu?: string | null;
  bauart_name?: string | null;

  ccm?: number | null;
  kw_leistung?: number | null;
  ps_leistung?: number | null;
  kraftstoff_name?: string | null;
  getriebe_name?: string | null;
  anz_gaenge?: number | null;

  anz_tueren?: number | null;
  anz_sitzplaetze?: number | null;
  anz_vorbesitzer?: number | null;

  km_laufleistung?: number | null;

  dyna_ekx?: number | null;
  vk_netto?: number | null;
  vk_brutto?: number | null;
  listenpreis_netto?: number | null;
  vk_haendler_netto?: number | null;
  vk_haendler_brutto?: number | null;

  angebots_nr?: string | null;
  art?: string | null;
  art_name?: string | null;
  carx_last_chg?: string | null;
};

function fmtDateLoose(raw?: string | null) {
  const s = String(raw ?? "").trim();
  if (!s) return "—";

  // ISO / YYYY-MM-DD => format to de-AT
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
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

  // CarX liefert oft "28.08.2012" oder "08-2026" -> einfach anzeigen
  return s;
}

function fmtHu(raw?: string | null) {
  const s = String(raw ?? "").trim();
  if (!s) return "—";

  // expected: "MM-YYYY" (e.g. "09-2026")
  const m = s.match(/^(\d{2})-(\d{4})$/);
  if (m) {
    const mm = m[1];
    const yyyy = m[2];
    return `${mm}.${yyyy}`;
  }

  // fallback: show as-is
  return s;
}

function fmtEUR(n?: number | null) {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat("de-AT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${Math.round(n)} €`;
  }
}

function fmtInt(n?: number | null) {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat("de-AT", { maximumFractionDigits: 0 }).format(
      n,
    );
  } catch {
    return String(n);
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value || "—"}
      </Text>
    </View>
  );
}

export default function ContractStep3Screen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ saleId?: string }>();
  const saleId = String(params?.saleId ?? "");

  const bottomPad = Math.max(14, insets.bottom + 10);
  const BOTTOM_BAR_HEIGHT = 12 + 45 + bottomPad;
  const CONTENT_SPACER = BOTTOM_BAR_HEIGHT + 18;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SaleSummary | null>(null);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (!saleId) return;
    (async () => {
      setLoading(true);
      try {
        setData(await fetchSaleSummary(saleId));
      } catch (e: any) {
        Alert.alert("Fehler", e?.message ?? "Konnte Übersicht nicht laden.");
      } finally {
        setLoading(false);
      }
    })();
  }, [saleId]);

  const sale = data?.sale ?? null;
  const buyer = data?.buyer ?? null;
  const dealer = data?.dealer ?? null;
  const vehicle = data?.vehicle ?? null;
  const details = data?.details ?? null;

  const carx = (vehicle?.carx_data ?? null) as CarxSnapshotSelected | null;

  function shortModelTxt(raw: string) {
    const s = raw.trim();
    if (!s) return "";
    const cut = s.split("*")[0].trim(); // falls CarX mit *Extras* arbeitet
    return cut.length > 28 ? `${cut.slice(0, 28).trim()}…` : cut;
  }

  const vehicleTitle = useMemo(() => {
    const brand = String(carx?.brand_txt ?? "").trim();
    const modelName = String(carx?.model_name ?? "").trim();
    const modelTxt = shortModelTxt(String(carx?.model_txt ?? ""));
    const model = modelName || modelTxt;
    const out = [brand, model].filter(Boolean).join(" ");
    return out || "—";
  }, [carx?.brand_txt, carx?.model_name, carx?.model_txt]);

  const paymentLabel = useMemo(() => {
    const p = sale?.payment_type ?? null;
    if (!p) return "—";
    if (p === "cash") return "Bar";
    if (p === "credit") return "Kredit";
    if (p === "transfer") return "Überweisung";
    if (p === "leasing") return "Leasing";
    return "—";
  }, [sale?.payment_type]);

  const goEditStep1 = () =>
    router.push({
      pathname: "/sale/contract/[saleId]/step1",
      params: { saleId },
    });

  const goEditStep2 = () =>
    router.push({
      pathname: "/sale/contract/[saleId]/step2",
      params: { saleId },
    });

  const goVehicle = () => {
    const carxId = vehicle?.carx_vehicle_id ?? null;
    if (!carxId) return;
    router.push({ pathname: "/vehicle/[id]", params: { id: String(carxId) } });
  };

  const openUrl = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      // ignore
    }
  };

  const onGenerate = async () => {
    if (!saleId) return;

    setBusy(true);
    try {
      // already generated
      if (sale?.contract_url) {
        const signed = await openExistingContractSignedUrl(sale.contract_url);
        await openUrl(signed);
        return;
      }

      const res = await generateContract(saleId);

      setData((prev) =>
        prev
          ? { ...prev, sale: { ...prev.sale, contract_url: res.path } }
          : prev,
      );

      await openUrl(res.signedUrl);
    } catch (e: any) {
      Alert.alert(
        "Fehler",
        e?.message ?? "Konnte Kaufvertrag nicht generieren.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen variant="scroll" bottomSpace={0}>
      <Stack.Screen options={{ title: "Kaufvertrag" }} />

      <View style={styles.container}>
        {!saleId ? (
          <Text style={styles.error}>Fehlende saleId</Text>
        ) : loading || !data ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Lade Übersicht…</Text>
          </View>
        ) : (
          <>
            <AccordionCard
              title="Händler"
              defaultOpen
              actionLabel="bearbeiten"
              onActionPress={goEditStep1}
            >
              <Row label="Händler" value={dealer?.display_name ?? "—"} />
            </AccordionCard>

            <AccordionCard
              title="Käufer"
              defaultOpen
              actionLabel="bearbeiten"
              onActionPress={goEditStep1}
            >
              <Row
                label="Frau / Herr / Firma"
                value={buyer?.full_name ?? "—"}
              />
              <Row label="Adresse" value={buyer?.address ?? "—"} />
              <Row label="E-Mail" value={buyer?.email ?? "—"} />
              <Row label="Telefon" value={buyer?.phone ?? "—"} />
              <Row
                label="Geboren am"
                value={fmtDateLoose(buyer?.birthdate ?? null)}
              />
            </AccordionCard>

            <AccordionCard
              title="Fahrzeug"
              defaultOpen
              actionLabel="bearbeiten"
              onActionPress={goVehicle}
            >
              <Row label="Marke / Modell" value={vehicleTitle} />

              {/* FIN kommt aus vehicles.vin (ist = dyna_fin) */}
              <Row
                label="FIN"
                value={String(vehicle?.vin ?? carx?.dyna_fin ?? "—")}
              />

              <Row
                label="Motornummer"
                value={String(carx?.dyna_motor_nr ?? "—")}
              />
              <Row
                label="KM"
                value={
                  carx?.km_laufleistung != null
                    ? `${fmtInt(carx.km_laufleistung)} km`
                    : "—"
                }
              />
              <Row
                label="Erstzulassung"
                value={fmtDateLoose(carx?.erstzulassung ?? null)}
              />
              <Row label="Farbe" value={String(carx?.farbe ?? "—")} />

              <View style={styles.sep} />

              <Row
                label="Hubraum"
                value={carx?.ccm != null ? `${fmtInt(carx.ccm)} ccm` : "—"}
              />
              <Row
                label="Leistung"
                value={
                  carx?.ps_leistung != null
                    ? `${fmtInt(carx.ps_leistung)} PS`
                    : "—"
                }
              />
              <Row
                label="Getriebe"
                value={String(carx?.getriebe_name ?? "—")}
              />
              <Row
                label="Kraftstoff"
                value={String(carx?.kraftstoff_name ?? "—")}
              />
              <Row
                label="Türen"
                value={carx?.anz_tueren != null ? fmtInt(carx.anz_tueren) : "—"}
              />
              <Row
                label="Sitzplätze"
                value={
                  carx?.anz_sitzplaetze != null
                    ? fmtInt(carx.anz_sitzplaetze)
                    : "—"
                }
              />
              <Row
                label="Vorbesitzer"
                value={
                  carx?.anz_vorbesitzer != null
                    ? fmtInt(carx.anz_vorbesitzer)
                    : "—"
                }
              />
              <Row label="HU" value={fmtHu(carx?.datum_hu ?? null)} />
            </AccordionCard>

            <AccordionCard
              title="Zahlung und Zustand"
              defaultOpen
              actionLabel="bearbeiten"
              onActionPress={goEditStep2}
            >
              <Row
                label="Mech. Zustand (A)"
                value={
                  details?.cond_a ? `Klasse ${details.cond_a}` : "keine Angabe"
                }
              />
              <Row
                label="Karosserie (B)"
                value={
                  details?.cond_b ? `Klasse ${details.cond_b}` : "keine Angabe"
                }
              />
              <Row
                label="Lack (C)"
                value={
                  details?.cond_c ? `Klasse ${details.cond_c}` : "keine Angabe"
                }
              />
              <Row
                label="Innenraum / Sonstiges (D)"
                value={
                  details?.cond_d ? `Klasse ${details.cond_d}` : "keine Angabe"
                }
              />
              <Row
                label="Elektrische Ausrüstung (E)"
                value={
                  details?.cond_e ? `Klasse ${details.cond_e}` : "keine Angabe"
                }
              />

              <View style={styles.sep} />

              <Row label="Zahlungsart" value={paymentLabel} />
              <Row
                label="Brutto Gesamtpreis"
                value={fmtEUR(sale?.sale_price ?? null)}
              />
              <Row
                label="Anzahlung"
                value={fmtEUR(sale?.down_payment ?? null)}
              />
              <Row label="Bank" value={sale?.bank_name?.trim() || "—"} />
              <Row label="Ort" value={"Dornbirn"} />
              <Row
                label="Kaufvertrag Datum"
                value={fmtDateLoose(details?.contract_date ?? null)}
              />
              <Row
                label="Übergabe Datum"
                value={fmtDateLoose(details?.handover_date ?? null)}
              />
            </AccordionCard>

            <AccordionCard
              title="Sonstige Vereinbarungen"
              defaultOpen
              actionLabel="bearbeiten"
              onActionPress={goEditStep2}
            >
              <Text style={styles.longText}>
                {details?.other_agreements?.trim()
                  ? details.other_agreements.trim()
                  : "—"}
              </Text>
            </AccordionCard>

            <View style={{ height: CONTENT_SPACER }} />
          </>
        )}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: bottomPad }]}>
        <AppButton
          title={
            busy
              ? "Erstelle…"
              : sale?.contract_url
                ? "Vertrag öffnen"
                : "weiter"
          }
          onPress={onGenerate}
          disabled={!saleId || busy || loading || !data}
          loading={busy}
          style={{ marginTop: 0 }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },

  error: { color: "#000", fontWeight: "800" },

  loading: { paddingVertical: 16, alignItems: "center", gap: 10 },
  loadingText: { color: "rgba(0,0,0,0.55)", fontWeight: "700" },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  rowLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(0,0,0,0.65)",
    flex: 1,
  },

  rowValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#000",
    flex: 1,
    textAlign: "right",
  },

  longText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.75)",
    lineHeight: 18,
  },

  sep: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginVertical: 6,
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
});
