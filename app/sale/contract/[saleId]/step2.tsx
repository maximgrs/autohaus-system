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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Screen from "@/src/components/ui/Screen";
import AccordionCard from "@/src/components/ui/AccordionCard";
import AppButton from "@/src/components/ui/AppButton";
import TextField from "@/src/components/ui/TextField";
import TextArea from "@/src/components/ui/TextArea";
import DatePickerField from "@/src/components/ui/DatePickerField";
import SelectField from "@/src/components/ui/SelectField";

import {
  fetchStep2Data,
  upsertContractDetails,
  updateSalePayment,
  type PaymentType,
} from "@/src/features/sales/saleStep2.service";

type ClassValue = "1" | "2" | "3" | "4";

const CLASS_OPTIONS = [
  { label: "Klasse 1", value: "1" as const },
  { label: "Klasse 2", value: "2" as const },
  { label: "Klasse 3", value: "3" as const },
  { label: "Klasse 4", value: "4" as const },
];

function toIsoDateOnly(d: Date) {
  const yyyy = String(d.getFullYear()).padStart(4, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseMoney(input: string): number | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  let s = raw.replace(/€/g, "").replace(/\s/g, "");

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // "16.850,50"
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma && !hasDot) {
    // "16850,5"
    s = s.replace(",", ".");
  } else {
    // dot could be thousands or decimal
    const parts = s.split(".");
    if (parts.length === 2 && parts[1].length <= 2) {
      // keep decimal
    } else {
      // treat dots as thousands separators
      s = s.replace(/\./g, "");
    }
  }

  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return n;
}

function moneyDisplay(n: number | null) {
  if (n == null) return "";
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

/**
 * Gesamtzustand:
 * - wenn gar nichts gewählt -> 2 (Vertragstext sagt: default Klasse 2)
 * - sonst Durchschnitt der vorhandenen Klassen, aufrunden (ceil), 1..4 clamp
 */
function computeOverallClass(vals: Array<ClassValue | null>) {
  const nums = vals
    .map((v) => (v ? Number(v) : null))
    .filter((x): x is number => typeof x === "number" && !Number.isNaN(x));

  if (!nums.length) return 2;

  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  const ceil = Math.ceil(avg);
  return Math.min(4, Math.max(1, ceil));
}

function PaymentChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : styles.chipIdle,
        pressed ? { opacity: 0.9, transform: [{ scale: 0.98 }] } : null,
      ]}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function ContractStep2Screen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ saleId?: string }>();
  const saleId = String(params?.saleId ?? "");

  const bottomPad = Math.max(14, insets.bottom + 10);
  const BOTTOM_BAR_HEIGHT = 12 + 45 + bottomPad;
  const CONTENT_SPACER = BOTTOM_BAR_HEIGHT + 18;

  const [loading, setLoading] = useState(false);

  // Bewertung
  const [a, setA] = useState<ClassValue | null>(null);
  const [b, setB] = useState<ClassValue | null>(null);
  const [c, setC] = useState<ClassValue | null>(null);
  const [d, setD] = useState<ClassValue | null>(null);
  const [e, setE] = useState<ClassValue | null>(null);

  // NEW: Gesamtzustand (Text58)
  const [overall, setOverall] = useState<ClassValue | null>(null);
  const [overallTouched, setOverallTouched] = useState(false);

  // Payment
  const [paymentType, setPaymentType] = useState<PaymentType | null>(null);
  const [bankName, setBankName] = useState("");
  const [salePriceText, setSalePriceText] = useState("");
  const [downPaymentText, setDownPaymentText] = useState("");

  // Dates + agreements
  const [contractDate, setContractDate] = useState<Date | null>(null);
  const [handoverDate, setHandoverDate] = useState<Date | null>(null);
  const [otherText, setOtherText] = useState("");

  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!saleId) return;

    (async () => {
      setLoading(true);
      try {
        const res = await fetchStep2Data(saleId);

        setPaymentType(res.sale.payment_type ?? null);
        setBankName(res.sale.bank_name ?? "");
        setSalePriceText(
          res.sale.sale_price != null ? String(res.sale.sale_price) : "",
        );
        setDownPaymentText(
          res.sale.down_payment != null ? String(res.sale.down_payment) : "",
        );

        const ct = res.contract as any;

        if (ct) {
          setA(ct.cond_a != null ? (String(ct.cond_a) as ClassValue) : null);
          setB(ct.cond_b != null ? (String(ct.cond_b) as ClassValue) : null);
          setC(ct.cond_c != null ? (String(ct.cond_c) as ClassValue) : null);
          setD(ct.cond_d != null ? (String(ct.cond_d) as ClassValue) : null);
          setE(ct.cond_e != null ? (String(ct.cond_e) as ClassValue) : null);

          // overall from DB if exists; otherwise computed
          if (ct.cond_overall != null) {
            setOverall(String(ct.cond_overall) as ClassValue);
            setOverallTouched(true);
          } else {
            const ov = computeOverallClass([
              ct.cond_a != null ? (String(ct.cond_a) as ClassValue) : null,
              ct.cond_b != null ? (String(ct.cond_b) as ClassValue) : null,
              ct.cond_c != null ? (String(ct.cond_c) as ClassValue) : null,
              ct.cond_d != null ? (String(ct.cond_d) as ClassValue) : null,
              ct.cond_e != null ? (String(ct.cond_e) as ClassValue) : null,
            ]);
            setOverall(String(ov) as ClassValue);
            setOverallTouched(false);
          }

          setContractDate(ct.contract_date ? new Date(ct.contract_date) : null);
          setHandoverDate(ct.handover_date ? new Date(ct.handover_date) : null);
          setOtherText(ct.other_agreements ?? "");
        } else {
          // default overall to 2 (default class)
          setOverall("2");
          setOverallTouched(false);
        }
      } catch (err: any) {
        Alert.alert("Fehler", err?.message ?? "Konnte Schritt 2 nicht laden.");
      } finally {
        setLoading(false);
      }
    })();
  }, [saleId]);

  // auto compute overall as long as user hasn't manually overridden it
  React.useEffect(() => {
    if (overallTouched) return;
    const ov = computeOverallClass([a, b, c, d, e]);
    setOverall(String(ov) as ClassValue);
  }, [a, b, c, d, e, overallTouched]);

  const needsBank = paymentType === "credit" || paymentType === "leasing";

  const salePrice = useMemo(() => parseMoney(salePriceText), [salePriceText]);
  const downPayment = useMemo(
    () => parseMoney(downPaymentText),
    [downPaymentText],
  );

  const downPaymentError =
    downPayment != null && salePrice != null && downPayment > salePrice
      ? "Anzahlung darf nicht größer als Gesamtpreis sein."
      : null;

  const agreementsComputed = useMemo(() => {
    const base = otherText.trim();
    if (needsBank && bankName.trim()) {
      const prefix = `Finanzierung über ${bankName.trim()}`;
      return base ? `${prefix}\n${base}` : prefix;
    }
    return base;
  }, [bankName, needsBank, otherText]);

  const canContinue = useMemo(() => {
    if (!saleId) return false;
    if (!paymentType) return false;

    // require positive sale price
    if (salePrice == null || salePrice <= 0) return false;

    // bank required for credit/leasing
    if (needsBank && !bankName.trim()) return false;

    // logical constraint
    if (downPaymentError) return false;

    return true;
  }, [bankName, downPaymentError, needsBank, paymentType, saleId, salePrice]);

  const onSaveAndNext = async () => {
    if (!canContinue || !paymentType) return;

    setSaving(true);
    try {
      await updateSalePayment({
        saleId,
        payment_type: paymentType,
        bank_name: needsBank ? bankName.trim() || null : null,
        sale_price: salePrice,
        down_payment: downPayment,
      });

      await upsertContractDetails({
        saleId,
        details: {
          cond_a: a ? Number(a) : null,
          cond_b: b ? Number(b) : null,
          cond_c: c ? Number(c) : null,
          cond_d: d ? Number(d) : null,
          cond_e: e ? Number(e) : null,

          // NEW Text58
          cond_overall: overall ? Number(overall) : null,

          contract_date: contractDate ? toIsoDateOnly(contractDate) : null,
          handover_date: handoverDate ? toIsoDateOnly(handoverDate) : null,
          other_agreements: agreementsComputed || null,
        } as any,
      });

      router.push({
        pathname: "/sale/contract/[saleId]/step3",
        params: { saleId },
      });
    } catch (err: any) {
      Alert.alert("Fehler", err?.message ?? "Konnte Daten nicht speichern.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen variant="scroll" bottomSpace={0}>
      <Stack.Screen options={{ title: "Kaufvertrag" }} />

      <View style={styles.container}>
        {!saleId ? (
          <Text style={styles.error}>Fehlende saleId</Text>
        ) : loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Lade Schritt 2…</Text>
          </View>
        ) : (
          <>
            <AccordionCard title="Beurteilung & Zahlung" defaultOpen>
              <SelectField
                label="Mech. Zustand (A)"
                value={a}
                onChange={setA}
                options={CLASS_OPTIONS}
              />
              <SelectField
                label="Karosserie (B)"
                value={b}
                onChange={setB}
                options={CLASS_OPTIONS}
              />
              <SelectField
                label="Lack (C)"
                value={c}
                onChange={setC}
                options={CLASS_OPTIONS}
              />
              <SelectField
                label="Innenraum / Sonstiges (D)"
                value={d}
                onChange={setD}
                options={CLASS_OPTIONS}
              />
              <SelectField
                label="Elektrische / Elektronische Ausrüstung (E)"
                value={e}
                onChange={setE}
                options={CLASS_OPTIONS}
              />

              <View style={{ height: 6 }} />

              <SelectField
                label="Zustandsklasse Gesamt"
                value={overall}
                onChange={(v) => {
                  setOverall(v);
                  setOverallTouched(true);
                }}
                options={CLASS_OPTIONS}
              />

              <Pressable
                onPress={() => {
                  const ov = computeOverallClass([a, b, c, d, e]);
                  setOverall(String(ov) as ClassValue);
                  setOverallTouched(false);
                }}
                style={({ pressed }) => [
                  styles.autoBtn,
                  pressed ? { opacity: 0.85 } : null,
                ]}
              >
                <Text style={styles.autoBtnText}>automatisch berechnen</Text>
              </Pressable>
            </AccordionCard>

            <AccordionCard title="Zahlungsart" defaultOpen>
              <View style={styles.chipRow}>
                <PaymentChip
                  label="Bar"
                  active={paymentType === "cash"}
                  onPress={() => setPaymentType("cash")}
                />
                <PaymentChip
                  label="Kredit"
                  active={paymentType === "credit"}
                  onPress={() => setPaymentType("credit")}
                />
                <PaymentChip
                  label="Überweisung"
                  active={paymentType === "transfer"}
                  onPress={() => setPaymentType("transfer")}
                />
                <PaymentChip
                  label="Leasing"
                  active={paymentType === "leasing"}
                  onPress={() => setPaymentType("leasing")}
                />
              </View>

              {needsBank ? (
                <TextField
                  label="Bank (nur bei Kredit und Leasing)"
                  placeholder="z.B. Raiffeisen…"
                  value={bankName}
                  onChangeText={setBankName}
                />
              ) : null}

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Gesamtpreis"
                    placeholder="z.B. 16850 €"
                    keyboardType="numeric"
                    value={salePriceText}
                    onChangeText={setSalePriceText}
                  />
                  {salePrice != null ? (
                    <Text style={styles.moneyHint}>
                      {moneyDisplay(salePrice)}
                    </Text>
                  ) : null}
                </View>

                <View style={{ flex: 1 }}>
                  <TextField
                    label="Anzahlung"
                    placeholder="z.B. 1000 €"
                    keyboardType="numeric"
                    value={downPaymentText}
                    onChangeText={setDownPaymentText}
                    error={downPaymentError ?? undefined}
                  />
                  {downPayment != null ? (
                    <Text style={styles.moneyHint}>
                      {moneyDisplay(downPayment)}
                    </Text>
                  ) : null}
                </View>
              </View>
            </AccordionCard>

            <AccordionCard
              title="Datum und Sonstige Vereinbarungen"
              defaultOpen
            >
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <DatePickerField
                    label="Kaufvertrag"
                    value={contractDate}
                    onChange={setContractDate}
                    placeholder="TT.MM.JJJJ"
                    maximumDate={new Date(new Date().getFullYear() + 2, 11, 31)}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <DatePickerField
                    label="Übergabe"
                    value={handoverDate}
                    onChange={setHandoverDate}
                    placeholder="keine"
                    maximumDate={new Date(new Date().getFullYear() + 2, 11, 31)}
                  />
                </View>
              </View>

              {needsBank && bankName.trim() ? (
                <View style={styles.autoLine}>
                  <Text style={styles.autoLineTitle}>Automatisch:</Text>
                  <Text style={styles.autoLineText}>
                    Finanzierung über {bankName.trim()}
                  </Text>
                </View>
              ) : null}

              <TextArea
                label="Sonstige Vereinbarungen"
                placeholder="Freitext…"
                value={otherText}
                onChangeText={setOtherText}
                minHeight={140}
              />
            </AccordionCard>

            <View style={{ height: CONTENT_SPACER }} />
          </>
        )}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: bottomPad }]}>
        <AppButton
          title="weiter"
          onPress={onSaveAndNext}
          disabled={!canContinue || saving}
          loading={saving}
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

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },

  chipIdle: {
    backgroundColor: "rgba(0,0,0,0.04)",
    borderColor: "rgba(0,0,0,0.06)",
  },

  chipActive: {
    backgroundColor: "#145437",
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  chipText: { fontSize: 12, fontWeight: "900", color: "#000" },
  chipTextActive: { color: "#fff" },

  twoCol: {
    flexDirection: "row",
    gap: 12,
  },

  moneyHint: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(0,0,0,0.55)",
  },

  autoLine: {
    backgroundColor: "rgba(20,84,55,0.08)",
    borderColor: "rgba(20,84,55,0.18)",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },

  autoLineTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(0,0,0,0.65)",
  },

  autoLineText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#000",
  },

  autoBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },

  autoBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#000",
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
