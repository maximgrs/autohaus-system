// src/components/ui/DatePickerField.tsx
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  label: string;
  value: Date | null;
  onChange: (next: Date | null) => void;

  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  required?: boolean;
};

const TOKENS = {
  text: "#000",
  placeholder: "rgba(0,0,0,0.45)",
  border: "rgba(0,0,0,0.06)",
  bg: "#FFF",
  radius: 15,

  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,

  sheetRadius: 18,
};

function formatDE(d: Date) {
  try {
    return new Intl.DateTimeFormat("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear());
    return `${dd}.${mm}.${yy}`;
  }
}

export default function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "TT.MM.JJJJ",
  minimumDate,
  maximumDate,
  required,
}: Props) {
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);

  // Android: native dialog via "show"
  const [androidShow, setAndroidShow] = useState(false);

  // iOS: modal sheet + temp date
  const [temp, setTemp] = useState<Date>(value ?? new Date());

  const bottomPad = Math.max(14, insets.bottom + 10);

  const display = useMemo(() => {
    return value ? formatDE(value) : "";
  }, [value]);

  const pickerWidth = useMemo(() => {
    const w = Dimensions.get("window").width;
    return Math.min(360, Math.max(280, w - 40));
  }, []);

  const openPicker = () => {
    if (Platform.OS === "android") {
      setAndroidShow(true);
      return;
    }
    setTemp(value ?? new Date());
    setOpen(true);
  };

  const onAndroidChange = (_: DateTimePickerEvent, selected?: Date) => {
    setAndroidShow(false);
    if (selected) onChange(selected);
  };

  const onIosDone = () => {
    onChange(temp);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? " *" : ""}
      </Text>

      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [
          styles.inputWrap,
          pressed ? { opacity: 0.95 } : null,
        ]}
      >
        <Text style={[styles.value, !display ? styles.placeholder : null]}>
          {display || placeholder}
        </Text>

        <Feather name="calendar" size={16} color="rgba(0,0,0,0.65)" />
      </Pressable>

      {/* Android native */}
      {Platform.OS === "android" && androidShow ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display="default"
          onChange={onAndroidChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}

      {/* iOS modal sheet */}
      {Platform.OS === "ios" ? (
        <Modal
          visible={open}
          transparent
          presentationStyle="overFullScreen"
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <View style={styles.modalRoot}>
            <Pressable
              style={[StyleSheet.absoluteFillObject, styles.backdrop]}
              onPress={() => setOpen(false)}
            />

            <View style={[styles.sheet, { paddingBottom: bottomPad }]}>
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                  <Text style={styles.sheetCancel}>Abbrechen</Text>
                </Pressable>

                <Text style={styles.sheetTitle}>Datum wählen</Text>

                <Pressable onPress={onIosDone} hitSlop={10}>
                  <Text style={styles.sheetDone}>Fertig</Text>
                </Pressable>
              </View>

              {/* Centered picker (optically more balanced) */}
              <View style={styles.pickerCenter}>
                <DateTimePicker
                  value={temp}
                  mode="date"
                  display="spinner"
                  onChange={(_, d) => d && setTemp(d)}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  style={[styles.iosPicker, { width: pickerWidth }]}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },

  label: {
    fontSize: 12,
    fontWeight: "600",
    color: TOKENS.text,
  },

  inputWrap: {
    backgroundColor: TOKENS.bg,
    borderRadius: TOKENS.radius,
    borderWidth: 1,
    borderColor: TOKENS.border,
    paddingHorizontal: 12,
    paddingVertical: 12,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    shadowColor: TOKENS.shadowColor,
    shadowOpacity: TOKENS.shadowOpacity,
    shadowRadius: TOKENS.shadowRadius,
    shadowOffset: TOKENS.shadowOffset,
    elevation: TOKENS.elevation,
  },

  value: {
    fontSize: 14,
    fontWeight: "500",
    color: TOKENS.text,
  },

  placeholder: {
    color: TOKENS.placeholder,
    fontWeight: "600",
  },

  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },

  backdrop: {
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: TOKENS.sheetRadius,
    borderTopRightRadius: TOKENS.sheetRadius,
    paddingTop: 10,
    paddingHorizontal: 14,
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },

  sheetTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#000",
  },

  sheetCancel: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(0,0,0,0.65)",
  },

  sheetDone: {
    fontSize: 13,
    fontWeight: "900",
    color: "#145437",
  },

  pickerCenter: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 6,
  },

  iosPicker: {
    height: 260, // wichtig: sonst wirkt's geclipped
  },
});
