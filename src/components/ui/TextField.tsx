import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TextInputProps,
} from "react-native";

type Props = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
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
};

export default function TextField({
  label,
  hint,
  error,
  style,
  ...props
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.inputWrap, !!error && styles.inputError]}>
        <TextInput
          {...props}
          style={[styles.input, style]}
          placeholderTextColor={TOKENS.placeholder}
        />
      </View>

      {!!error ? (
        <Text style={[styles.hint, { color: "#D64545" }]}>{error}</Text>
      ) : !!hint ? (
        <Text style={styles.hint}>{hint}</Text>
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

    shadowColor: TOKENS.shadowColor,
    shadowOpacity: TOKENS.shadowOpacity,
    shadowRadius: TOKENS.shadowRadius,
    shadowOffset: TOKENS.shadowOffset,
    elevation: TOKENS.elevation,
  },

  input: {
    fontSize: 14,
    fontWeight: "500",
    color: TOKENS.text,
    padding: 0, // RN default padding entfernen
  },

  hint: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(0,0,0,0.55)",
  },

  inputError: {
    borderColor: "#D64545",
  },
});
