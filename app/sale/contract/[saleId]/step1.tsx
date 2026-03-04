import { Feather } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Screen from "@/src/components/ui/Screen";
import AccordionCard from "@/src/components/ui/AccordionCard";
import AppButton from "@/src/components/ui/AppButton";
import TextField from "@/src/components/ui/TextField";
import DatePickerField from "@/src/components/ui/DatePickerField";

import ContractVehicleHeroCard from "@/src/components/sales/ContractVehicleHeroCard";
import { useDealers } from "@/src/features/employees/useDealers";
import type { DealerEmployee } from "@/src/features/employees/dealers.service";

import {
  fetchSaleWithVehicle,
  linkBuyerAndDealerToSale,
  type SaleWithVehicle,
} from "@/src/features/sales/saleStep1.service";
import { createBuyer } from "@/src/features/buyers/buyers.service";

function titleFromCarxSnapshot(carx: any): string {
  const brand = carx?.brand_txt?.trim();
  const model = carx?.model_txt?.trim();
  const typ = carx?.typ_txt?.trim();
  const variant = carx?.variant_txt?.trim();
  return [brand, model, typ, variant].filter(Boolean).join(" ");
}

function toIsoDateOnly(d: Date) {
  const yyyy = String(d.getFullYear()).padStart(4, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function ContractStep1Screen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ saleId?: string; imageUrl?: string }>();

  const saleId = String(params?.saleId ?? "");
  const imageUrlParam = (
    params?.imageUrl ? String(params.imageUrl) : ""
  ).trim();

  const { loading: dealersLoading, dealers } = useDealers();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SaleWithVehicle | null>(null);

  const [dealerOpen, setDealerOpen] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<DealerEmployee | null>(
    null,
  );

  // Kundendaten
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthdate, setBirthdate] = useState<Date | null>(null);

  // BottomBar Höhe (AppButton height 45 + paddingTop + paddingBottom + safeArea)
  const bottomPad = Math.max(14, insets.bottom + 10);
  const BOTTOM_BAR_HEIGHT = 12 + 45 + bottomPad; // paddingTop + button + paddingBottom
  const CONTENT_SPACER = BOTTOM_BAR_HEIGHT + 18; // bisschen Luft

  React.useEffect(() => {
    if (!saleId) return;

    (async () => {
      setLoading(true);
      try {
        const res = await fetchSaleWithVehicle(saleId);
        setData(res);

        if (res.sale.dealer_employee_id && dealers.length) {
          const found =
            dealers.find((d) => d.id === res.sale.dealer_employee_id) ?? null;
          setSelectedDealer(found);
        }
      } catch (e: any) {
        Alert.alert("Fehler", e?.message ?? "Konnte Verkauf nicht laden.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleId]);

  const vehicle = data?.vehicle ?? null;
  const carx = vehicle?.carx_data ?? null;

  const model = useMemo(() => {
    const m = titleFromCarxSnapshot(carx);
    return m || "Fahrzeug";
  }, [carx]);

  const vin = useMemo(() => {
    return String(vehicle?.vin ?? carx?.vin ?? "").trim();
  }, [vehicle?.vin, carx?.vin]);

  const heroImage = useMemo(() => {
    if (imageUrlParam) return imageUrlParam;
    const arr = vehicle?.internal_image_urls ?? null;
    return arr?.length ? arr[0] : null;
  }, [imageUrlParam, vehicle?.internal_image_urls]);

  const canContinue =
    !!saleId &&
    !!selectedDealer?.id &&
    fullName.trim().length > 2 &&
    !!birthdate;

  const [saving, setSaving] = useState(false);

  const onContinue = async () => {
    if (!canContinue || !selectedDealer || !birthdate) return;

    setSaving(true);
    try {
      const buyer = await createBuyer({
        full_name: fullName.trim(),
        address: address.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        birthdate: toIsoDateOnly(birthdate),
      });

      await linkBuyerAndDealerToSale({
        saleId,
        buyerId: buyer.id,
        dealerEmployeeId: selectedDealer.id,
      });

      router.push(`/sale/contract/${saleId}/step2`);
    } catch (e: any) {
      Alert.alert("Fehler", e?.message ?? "Konnte Daten nicht speichern.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen variant="scroll" bottomSpace={0}>
      <Stack.Screen options={{ title: "Kaufvertrag" }} />

      <View style={styles.container}>
        {!saleId ? (
          <View style={styles.center}>
            <Text style={styles.errorTitle}>Fehlende saleId</Text>
            <Text style={styles.errorText}>
              Bitte starte den Kaufvertrag über den Verkaufsprozess.
            </Text>
          </View>
        ) : loading || !data ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Lade Kaufvertrag…</Text>
          </View>
        ) : (
          <>
            <ContractVehicleHeroCard
              imageUrl={heroImage}
              model={model}
              vin={vin}
            />

            {/* Dealer Select */}
            <Pressable
              onPress={() => setDealerOpen(true)}
              style={({ pressed }) => [
                styles.dealerBtn,
                pressed
                  ? { transform: [{ scale: 0.99 }], opacity: 0.95 }
                  : null,
              ]}
            >
              <View style={styles.dealerLeft}>
                <Text style={styles.dealerText} numberOfLines={1}>
                  {selectedDealer?.display_name ?? "Händler wählen"}
                </Text>
              </View>

              <View style={styles.dealerRight}>
                {dealersLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Feather name="chevron-down" size={18} color="#fff" />
                )}
              </View>
            </Pressable>

            <AccordionCard title="Kundendaten Eingeben" defaultOpen>
              <TextField
                label="Frau / Herr / Firma"
                placeholder="z.B. Fikret Miskic"
                value={fullName}
                onChangeText={setFullName}
              />

              <TextField
                label="Adresse"
                placeholder="Straße Hausnr, PLZ Ort"
                value={address}
                onChangeText={setAddress}
              />

              <TextField
                label="E-Mail"
                placeholder="name@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <TextField
                label="Telefon"
                placeholder="0660..."
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              {/* DatePicker war da, aber wurde überdeckt -> jetzt sichtbar */}
              <DatePickerField
                label="geboren am"
                value={birthdate}
                onChange={setBirthdate}
                placeholder="TT.MM.JJJJ"
                required
                maximumDate={new Date()}
              />
            </AccordionCard>

            {/* WICHTIG: Spacer damit BottomBar NICHT den Content überdeckt */}
            <View style={{ height: CONTENT_SPACER }} />
          </>
        )}
      </View>

      {/* Bottom Button fixed */}
      <View style={[styles.bottomBar, { paddingBottom: bottomPad }]}>
        <AppButton
          title="weiter"
          onPress={onContinue}
          disabled={!canContinue || saving}
          loading={saving}
          style={{ marginTop: 0 }}
        />
      </View>

      {/* Dealer Modal */}
      <Modal
        visible={dealerOpen}
        presentationStyle="overFullScreen"
        animationType="fade"
        transparent
        onRequestClose={() => setDealerOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setDealerOpen(false)}
        />

        <View style={[styles.modalSheet, { paddingBottom: bottomPad }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Händler wählen</Text>
            <Pressable onPress={() => setDealerOpen(false)} hitSlop={10}>
              <Feather name="x" size={20} color="#000" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalList}>
            {dealersLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator />
                <Text style={styles.modalLoadingText}>Lade Mitarbeiter…</Text>
              </View>
            ) : dealers.length === 0 ? (
              <Text style={styles.modalEmpty}>
                Keine Händler-Mitarbeiter gefunden.
              </Text>
            ) : (
              dealers.map((d) => {
                const active = selectedDealer?.id === d.id;
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => {
                      setSelectedDealer(d);
                      setDealerOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.modalRow,
                      active ? styles.modalRowActive : null,
                      pressed ? { opacity: 0.85 } : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalRowText,
                        active ? { fontWeight: "800" } : null,
                      ]}
                    >
                      {d.display_name}
                    </Text>
                    {active ? (
                      <Feather name="check" size={18} color="#145437" />
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

  loading: { paddingVertical: 16, alignItems: "center", gap: 10 },
  loadingText: { color: "rgba(0,0,0,0.55)", fontWeight: "700" },

  center: { paddingVertical: 30, alignItems: "center", gap: 8 },
  errorTitle: { fontSize: 16, fontWeight: "800", color: "#000" },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(0,0,0,0.6)",
    textAlign: "center",
    paddingHorizontal: 20,
  },

  dealerBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#2F763E",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  dealerLeft: { flex: 1, paddingRight: 12 },
  dealerText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  dealerRight: { width: 24, alignItems: "flex-end" },

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

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)" },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    maxHeight: "65%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#000" },

  modalList: { paddingVertical: 12, gap: 10 },
  modalRow: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalRowActive: {
    backgroundColor: "rgba(20,84,55,0.10)",
    borderWidth: 1,
    borderColor: "rgba(20,84,55,0.25)",
  },
  modalRowText: { fontSize: 14, fontWeight: "700", color: "#000" },

  modalLoading: { paddingVertical: 16, alignItems: "center", gap: 10 },
  modalLoadingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
  },
  modalEmpty: { fontSize: 13, fontWeight: "700", color: "rgba(0,0,0,0.6)" },
});
