import React, { useCallback, useMemo } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";

type Props = {
  value: string[]; // lokale URIs oder remote URLs
  onChange?: (next: string[]) => void; // optional wenn readOnly
  readOnly?: boolean;

  max?: number;
  tileSize?: number;

  emptyTitle?: string;
  emptySubtitle?: string;

  addButtonLabel?: string;
  addTileLabel?: string;
};

const TOKENS = {
  radius: 16,

  text: "#0F172A",
  muted: "rgba(15,23,42,0.60)",

  green: "#1F7A3A",

  tileBg: "rgba(0,0,0,0.10)",
  chipBg: "rgba(255,255,255,0.85)",
};

async function ensureCameraPermission() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === "granted";
}

async function ensureLibraryPermission() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === "granted";
}

export default function ImagePickerField({
  value,
  onChange,
  readOnly = false,

  max = 30,
  tileSize = 92,
  emptyTitle = "Noch keine Fotos",
  emptySubtitle = "Füge Bilder aus Galerie hinzu oder mache ein Foto.",
  addButtonLabel = "+ Hinzufügen",
  addTileLabel = "Mehr",
}: Props) {
  const canEdit = !readOnly && typeof onChange === "function";
  const canAddMore = canEdit && value.length < max;

  const selectionLimit = useMemo(() => {
    const remaining = max - value.length;
    return remaining <= 0 ? 1 : remaining;
  }, [max, value.length]);

  const addFromLibrary = useCallback(async () => {
    if (!canEdit) return;

    const ok = await ensureLibraryPermission();
    if (!ok) {
      Alert.alert(
        "Zugriff benötigt",
        "Bitte erlaube den Zugriff auf deine Fotos.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit,
    });

    if (result.canceled) return;

    const uris = result.assets.map((a) => a.uri);
    const next = [...value, ...uris].slice(0, max);
    onChange?.(next);
  }, [canEdit, max, onChange, selectionLimit, value]);

  const addFromCamera = useCallback(async () => {
    if (!canEdit) return;

    const ok = await ensureCameraPermission();
    if (!ok) {
      Alert.alert(
        "Zugriff benötigt",
        "Bitte erlaube den Zugriff auf die Kamera.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
    });

    if (result.canceled) return;

    const uri = result.assets?.[0]?.uri;
    if (!uri) return;

    const next = [...value, uri].slice(0, max);
    onChange?.(next);
  }, [canEdit, max, onChange, value]);

  const openAddMenu = useCallback(() => {
    if (!canEdit) return;

    if (!canAddMore) {
      Alert.alert("Limit erreicht", `Maximal ${max} Bilder.`);
      return;
    }

    Alert.alert("Bilder hinzufügen", "Quelle auswählen:", [
      { text: "Galerie", onPress: addFromLibrary },
      { text: "Kamera", onPress: addFromCamera },
      { text: "Abbrechen", style: "cancel" },
    ]);
  }, [addFromCamera, addFromLibrary, canAddMore, canEdit, max]);

  const removeAt = useCallback(
    (index: number) => {
      if (!canEdit) return;
      const next = value.filter((_, i) => i !== index);
      onChange?.(next);
    },
    [canEdit, onChange, value],
  );

  // EMPTY
  if (value.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>

        {canEdit ? (
          <Pressable onPress={openAddMenu} style={styles.addButton}>
            <Text style={styles.addButtonText}>{addButtonLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  // FILLED
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {value.map((uri, idx) => (
        <View
          key={`${uri}-${idx}`}
          style={[styles.thumbWrap, { width: tileSize, height: tileSize }]}
        >
          <Image source={{ uri }} style={styles.thumb} />

          {canEdit ? (
            <Pressable
              onPress={() => removeAt(idx)}
              hitSlop={10}
              style={styles.removeBtn}
            >
              <Feather name="x" size={14} color="#111" />
            </Pressable>
          ) : null}
        </View>
      ))}

      {canEdit ? (
        <Pressable
          onPress={openAddMenu}
          disabled={!canAddMore}
          style={[
            styles.addTile,
            { width: tileSize, height: tileSize },
            !canAddMore && { opacity: 0.5 },
          ]}
        >
          <Feather name="plus" size={22} color={TOKENS.text} />
          <Text style={styles.addTileText}>{addTileLabel}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { gap: 10 },

  emptyTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: TOKENS.text,
  },
  emptySubtitle: {
    marginTop: -5,
    fontSize: 12,
    fontWeight: "600",
    color: TOKENS.muted,
    lineHeight: 16,
  },

  addButton: {
    alignSelf: "flex-start",
    backgroundColor: TOKENS.green,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  row: { gap: 12 },

  thumbWrap: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  thumb: { width: "100%", height: "100%", resizeMode: "cover" },

  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: TOKENS.chipBg,
    alignItems: "center",
    justifyContent: "center",
  },

  addTile: {
    borderRadius: 14,
    backgroundColor: TOKENS.tileBg,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addTileText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(15,23,42,0.75)",
  },
});
