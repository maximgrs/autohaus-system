import React, { memo } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";

type Props = Omit<TextInputProps, "style"> & {
  value: string;
  onChangeText: (t: string) => void;
  onMicPress?: () => void;

  /** Style für den äußeren Container (View) */
  containerStyle?: StyleProp<ViewStyle>;

  /** Style für das TextInput */
  inputStyle?: StyleProp<TextStyle>;
};

const T = {
  bg: "#E7E7E7",
  text: "#000",
  placeholder: "rgba(0,0,0,0.45)",
  radius: 999,
  height: 44,
  padX: 14,
};

function SearchBarBase({
  value,
  onChangeText,
  onMicPress,
  containerStyle,
  inputStyle,
  ...props
}: Props) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      <Feather name="search" size={18} color="rgba(0,0,0,0.55)" />

      <TextInput
        {...props}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={T.placeholder}
        style={[styles.input, inputStyle]}
      />
    </View>
  );
}

export default memo(SearchBarBase);

const styles = StyleSheet.create({
  wrap: {
    height: T.height,
    borderRadius: T.radius,
    backgroundColor: T.bg,
    paddingHorizontal: T.padX,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    padding: 0,
    fontSize: 14,
    fontWeight: "500",
    color: T.text,
  },
});
