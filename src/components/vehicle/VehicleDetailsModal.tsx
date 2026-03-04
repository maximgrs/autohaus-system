import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  onClose: () => void;
  detail: any | null;
};

type EquipDef = {
  key: string;
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  group:
    | "Komfort"
    | "Infotainment"
    | "Sicherheit"
    | "Assistenten"
    | "Exterieur";
};

const TOKENS = {
  bgOverlay: "rgba(0,0,0,0.35)",
  sheetBg: "#fff",
  cardBg: "#F2F2F2",
  text: "#000",
  muted: "rgba(0,0,0,0.55)",

  radiusSheet: 18,
  radiusCard: 16,

  pad: 16,
  gap: 12,

  chipBg: "#FFFFFF",
  chipBorder: "rgba(0,0,0,0.06)",

  green: "#2F763E",
  greenSoft: "rgba(47,118,62,0.10)",
};

const EQUIPMENT: EquipDef[] = [
  // Komfort
  {
    key: "fensterheber",
    label: "Fensterheber",
    icon: "square",
    group: "Komfort",
  },
  {
    key: "zentralverriegelung",
    label: "Zentralverriegelung",
    icon: "lock",
    group: "Komfort",
  },
  {
    key: "servolenkung",
    label: "Servolenkung",
    icon: "rotate-cw",
    group: "Komfort",
  },
  {
    key: "sitzheizung",
    label: "Sitzheizung",
    icon: "thermometer",
    group: "Komfort",
  },
  {
    key: "sitzbelueftung",
    label: "Sitzbelüftung",
    icon: "wind",
    group: "Komfort",
  },
  {
    key: "klimatisierung_name",
    label: "Klimatisierung",
    icon: "sun",
    group: "Komfort",
  },
  { key: "schiebedach", label: "Schiebedach", icon: "sun", group: "Komfort" },
  { key: "panoramadach", label: "Panoramadach", icon: "sun", group: "Komfort" },
  { key: "armlehne", label: "Armlehne", icon: "minus", group: "Komfort" },
  {
    key: "regensensor",
    label: "Regensensor",
    icon: "cloud-rain",
    group: "Komfort",
  },
  {
    key: "lichtsensor",
    label: "Lichtsensor",
    icon: "sunrise",
    group: "Komfort",
  },

  // Infotainment
  {
    key: "navigationssystem",
    label: "Navigation",
    icon: "map",
    group: "Infotainment",
  },
  {
    key: "touchscreen",
    label: "Touchscreen",
    icon: "smartphone",
    group: "Infotainment",
  },
  { key: "usb", label: "USB", icon: "radio", group: "Infotainment" },
  {
    key: "bluetooth",
    label: "Bluetooth",
    icon: "bluetooth",
    group: "Infotainment",
  },
  {
    key: "soundsystem",
    label: "Soundsystem",
    icon: "speaker",
    group: "Infotainment",
  },
  { key: "radio_cd", label: "Radio/CD", icon: "music", group: "Infotainment" },
  {
    key: "dab_radio",
    label: "DAB Radio",
    icon: "radio",
    group: "Infotainment",
  },
  {
    key: "carplay",
    label: "Apple CarPlay",
    icon: "smartphone",
    group: "Infotainment",
  },
  {
    key: "android_auto",
    label: "Android Auto",
    icon: "smartphone",
    group: "Infotainment",
  },

  // Sicherheit
  { key: "abs", label: "ABS", icon: "shield", group: "Sicherheit" },
  { key: "esp", label: "ESP", icon: "shield", group: "Sicherheit" },
  {
    key: "wegfahrsperre",
    label: "Wegfahrsperre",
    icon: "key",
    group: "Sicherheit",
  },
  {
    key: "alarmanlage",
    label: "Alarmanlage",
    icon: "bell",
    group: "Sicherheit",
  },
  { key: "isofix", label: "ISOFIX", icon: "anchor", group: "Sicherheit" },
  {
    key: "fahrerairbag",
    label: "Airbag Fahrer",
    icon: "alert-triangle",
    group: "Sicherheit",
  },
  {
    key: "beifahrerairbag",
    label: "Airbag Beifahrer",
    icon: "alert-triangle",
    group: "Sicherheit",
  },

  // Assistenten
  {
    key: "einparkhilfe",
    label: "Einparkhilfe",
    icon: "corner-up-right",
    group: "Assistenten",
  },
  {
    key: "einparkhilfe_vorne",
    label: "Parkhilfe vorne",
    icon: "corner-up-right",
    group: "Assistenten",
  },
  {
    key: "einparkhilfe_hinten",
    label: "Parkhilfe hinten",
    icon: "corner-up-left",
    group: "Assistenten",
  },
  {
    key: "einparkhilfe_kamera",
    label: "Rückfahrkamera",
    icon: "camera",
    group: "Assistenten",
  },
  {
    key: "tempomat",
    label: "Tempomat",
    icon: "navigation",
    group: "Assistenten",
  },
  {
    key: "spurhalteassistent",
    label: "Spurhalteassistent",
    icon: "git-commit",
    group: "Assistenten",
  },
  {
    key: "notbremsassistent",
    label: "Notbremsassistent",
    icon: "octagon",
    group: "Assistenten",
  },
  {
    key: "totwinkel_assistent",
    label: "Totwinkel-Assistent",
    icon: "eye",
    group: "Assistenten",
  },
  {
    key: "verkehrszeichenerk",
    label: "Verkehrszeichen-Erkennung",
    icon: "flag",
    group: "Assistenten",
  },

  // Exterieur
  {
    key: "led_scheinwerfer",
    label: "LED Scheinwerfer",
    icon: "zap",
    group: "Exterieur",
  },
  { key: "xenonscheinwerfer", label: "Xenon", icon: "zap", group: "Exterieur" },
  {
    key: "leichtmetallfelgen",
    label: "Leichtmetallfelgen",
    icon: "circle",
    group: "Exterieur",
  },
  {
    key: "allradantrieb",
    label: "Allrad",
    icon: "trending-up",
    group: "Exterieur",
  },
  {
    key: "partikelfilter",
    label: "Partikelfilter",
    icon: "filter",
    group: "Exterieur",
  },
];

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

function getValue(detail: any, key: string) {
  if (!detail || typeof detail !== "object") return undefined;
  return detail[key];
}

function isTrueBool(v: any) {
  return v === true || v === 1 || v === "1";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function FeatureChip({
  label,
  icon,
  muted,
}: {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  muted?: boolean;
}) {
  return (
    <View style={[styles.chip, muted ? styles.chipMissing : null]}>
      {icon ? (
        <View
          style={[styles.chipIconWrap, muted ? styles.chipIconMissing : null]}
        >
          <Feather
            name={icon}
            size={14}
            color={muted ? "rgba(0,0,0,0.35)" : TOKENS.green}
          />
        </View>
      ) : null}
      <Text
        style={[styles.chipText, muted ? styles.chipTextMissing : null]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export default function VehicleDetailsModal({
  visible,
  onClose,
  detail,
}: Props) {
  const [showMissing, setShowMissing] = useState(false);

  const title = useMemo(() => {
    if (!detail) return "Fahrzeugdetails";
    const brand = String(detail.brand_txt ?? "").trim();
    const model = String(detail.model_txt ?? "").trim();
    const typ = String(detail.typ_txt ?? "").trim();
    const variant = String(detail.variant_txt ?? "").trim();
    const joined = [brand, model, typ, variant].filter(Boolean).join(" ");
    return joined || "Fahrzeugdetails";
  }, [detail]);

  const baseFacts = useMemo(() => {
    if (!detail) return [];
    const price = detail.vk_brutto ?? detail.vk_netto ?? null;

    return [
      { label: "CarX ID", value: String(detail.car_id ?? "-") },
      { label: "VIN", value: String(detail.dyna_fin ?? "-") },
      { label: "Preis", value: price != null ? formatEUR(price) : "-" },
      {
        label: "Status",
        value: String(detail.status_name ?? detail.status ?? "-"),
      },
      { label: "Art", value: String(detail.art_name ?? detail.art ?? "-") },
      { label: "Angebots-Nr.", value: String(detail.angebots_nr ?? "-") },
      { label: "Filiale", value: String(detail.filiale_name ?? "-") },
    ];
  }, [detail]);

  const techFacts = useMemo(() => {
    if (!detail) return [];
    const leistung =
      detail.ps_leistung != null || detail.kw_leistung != null
        ? `${detail.ps_leistung ?? "-"} PS (${detail.kw_leistung ?? "-"} kW)`
        : "-";

    return [
      { label: "Eingetroffen", value: String(detail.eingangsdatum ?? "-") },
      { label: "Erstzulassung", value: String(detail.erstzulassung ?? "-") },
      {
        label: "Kilometerstand",
        value:
          detail.km_laufleistung != null ? `${detail.km_laufleistung} km` : "-",
      },
      { label: "Kraftstoff", value: String(detail.kraftstoff_name ?? "-") },
      { label: "Getriebe", value: String(detail.getriebe_name ?? "-") },
      { label: "Farbe", value: String(detail.farbe ?? "-") },
      { label: "Leistung", value: leistung },
      { label: "CCM", value: detail.ccm != null ? String(detail.ccm) : "-" },
      {
        label: "Baujahr",
        value: detail.baujahr != null ? String(detail.baujahr) : "-",
      },
      { label: "HU", value: String(detail.datum_hu ?? "-") },
      {
        label: "Sitzplätze",
        value:
          detail.anz_sitzplaetze != null ? String(detail.anz_sitzplaetze) : "-",
      },
      {
        label: "Türen",
        value: detail.anz_tueren != null ? String(detail.anz_tueren) : "-",
      },
    ];
  }, [detail]);

  const equipmentByGroup = useMemo(() => {
    const groups: Record<string, { present: EquipDef[]; missing: EquipDef[] }> =
      {};
    for (const def of EQUIPMENT) {
      if (!groups[def.group]) groups[def.group] = { present: [], missing: [] };

      const v = getValue(detail, def.key);

      // string feld (klimatisierung_name)
      if (def.key === "klimatisierung_name") {
        if (typeof v === "string" && v.trim())
          groups[def.group].present.push(def);
        else groups[def.group].missing.push(def);
        continue;
      }

      if (isTrueBool(v)) groups[def.group].present.push(def);
      else groups[def.group].missing.push(def);
    }
    return groups;
  }, [detail]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <SafeAreaView
        style={styles.sheet}
        edges={["bottom", "left", "right", "top"]}
      >
        <View style={styles.handle} />

        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              Details & Ausstattung
            </Text>
          </View>

          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <Feather name="x" size={18} color={TOKENS.text} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Basis</Text>
            <View style={styles.rows}>
              {baseFacts.map((r) => (
                <Row key={r.label} label={r.label} value={r.value} />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Technik</Text>
            <View style={styles.rows}>
              {techFacts.map((r) => (
                <Row key={r.label} label={r.label} value={r.value} />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Ausstattung</Text>

              <Pressable
                onPress={() => setShowMissing((v) => !v)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.toggleBtn,
                  pressed ? { opacity: 0.85 } : null,
                ]}
              >
                <Text style={styles.toggleText}>
                  {showMissing ? "nur vorhanden" : "auch fehlend"}
                </Text>
              </Pressable>
            </View>

            {Object.keys(equipmentByGroup).map((g) => {
              const group = equipmentByGroup[g];
              if (!group.present.length && !showMissing) return null;

              return (
                <View key={g} style={styles.group}>
                  <Text style={styles.groupTitle}>{g}</Text>

                  <View style={styles.chipWrap}>
                    {group.present.map((d) => (
                      <FeatureChip key={d.key} label={d.label} icon={d.icon} />
                    ))}
                    {showMissing
                      ? group.missing.map((d) => (
                          <FeatureChip
                            key={d.key}
                            label={d.label}
                            icon={d.icon}
                            muted
                          />
                        ))
                      : null}
                  </View>
                </View>
              );
            })}
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: TOKENS.bgOverlay,
  },

  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: "10%",
    backgroundColor: TOKENS.sheetBg,
    borderTopLeftRadius: TOKENS.radiusSheet,
    borderTopRightRadius: TOKENS.radiusSheet,
    overflow: "hidden",
  },

  handle: {
    alignSelf: "center",
    marginTop: 10,
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.12)",
  },

  topBar: {
    paddingHorizontal: TOKENS.pad,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },

  title: {
    fontSize: 16,
    fontWeight: "900",
    color: TOKENS.text,
  },

  sub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: TOKENS.muted,
  },

  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {
    padding: TOKENS.pad,
    gap: TOKENS.gap,
  },

  card: {
    backgroundColor: TOKENS.cardBg,
    borderRadius: TOKENS.radiusCard,
    padding: 14,
    gap: 10,
  },

  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  cardTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: TOKENS.text,
  },

  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: TOKENS.greenSoft,
  },

  toggleText: {
    fontSize: 11,
    fontWeight: "800",
    color: TOKENS.green,
  },

  rows: { gap: 10 },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  rowLabel: {
    width: 110,
    fontSize: 11,
    fontWeight: "700",
    color: TOKENS.muted,
  },

  rowValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "800",
    color: TOKENS.text,
  },

  group: {
    gap: 8,
    marginTop: 6,
  },

  groupTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: TOKENS.text,
  },

  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: TOKENS.chipBg,
    borderWidth: 1,
    borderColor: TOKENS.chipBorder,
  },

  chipIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: TOKENS.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  chipText: {
    fontSize: 12,
    fontWeight: "800",
    color: TOKENS.text,
    maxWidth: 220,
  },

  chipMissing: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderColor: "rgba(0,0,0,0.04)",
  },

  chipIconMissing: {
    backgroundColor: "rgba(0,0,0,0.05)",
  },

  chipTextMissing: {
    color: "rgba(0,0,0,0.40)",
    fontWeight: "700",
  },
});
