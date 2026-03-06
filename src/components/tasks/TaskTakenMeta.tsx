// src/components/tasks/TaskTakenMeta.tsx
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  takenByName?: string | null;
  takenAt?: string | null;
};

function formatDateTimeISO(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  // lightweight formatting; i18n later
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

export default function TaskTakenMeta({ takenByName, takenAt }: Props) {
  const dateStr = useMemo(() => formatDateTimeISO(takenAt), [takenAt]);

  if (!takenByName && !dateStr) return null;

  return (
    <View style={styles.row}>
      {takenByName ? (
        <Text style={styles.text}>Übernommen von {takenByName}</Text>
      ) : null}
      {dateStr ? <Text style={styles.text}>• {dateStr}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  text: { fontSize: 12, fontWeight: "700", color: "rgba(0,0,0,0.55)" },
});
