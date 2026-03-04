import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import Screen from "@/src/components/ui/Screen";
import TextField from "@/src/components/ui/TextField";
import AppButton from "@/src/components/ui/AppButton";
import { supabase } from "@/src/lib/supabase";

function extractInvokeError(err: any) {
  const msg =
    err?.context?.body?.error ??
    err?.context?.body ??
    err?.message ??
    "Unbekannter Fehler";
  return typeof msg === "string" ? msg : JSON.stringify(msg);
}

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 3 &&
      pw.trim().length >= 6 &&
      pw2.trim().length >= 6 &&
      code.trim().length >= 4
    );
  }, [email, pw, pw2, code]);

  const onRegister = useCallback(async () => {
    const e = email.trim().toLowerCase();
    const p = pw.trim();
    const p2 = pw2.trim();
    const c = code.trim();

    if (!e || !p || !p2 || !c) {
      Alert.alert("Fehlt etwas", "Bitte alle Felder ausfüllen.");
      return;
    }
    if (p !== p2) {
      Alert.alert("Passwort", "Passwörter stimmen nicht überein.");
      return;
    }

    setLoading(true);
    try {
      // 1) Create user + bind to employee via invite
      const { error: fnErr } = await supabase.functions.invoke(
        "register-with-invite",
        {
          body: { email: e, password: p, code: c },
        },
      );
      if (fnErr) throw new Error(extractInvokeError(fnErr));

      // 2) Login
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: e,
        password: p,
      });
      if (signErr) throw signErr;

      router.replace("/");
    } catch (err: any) {
      Alert.alert(
        "Registrierung fehlgeschlagen",
        err?.message ?? "Unbekannter Fehler",
      );
    } finally {
      setLoading(false);
    }
  }, [code, email, pw, pw2]);

  return (
    <Screen variant="scroll" bottomSpace={120}>
      <View style={styles.wrap}>
        <Text style={styles.title}>T und A Autoshop</Text>

        <View style={styles.form}>
          <TextField
            label="E-Mail"
            value={email}
            onChangeText={setEmail}
            placeholder="e-mail eingeben"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextField
            label="Passwort"
            value={pw}
            onChangeText={setPw}
            placeholder="passwort eingeben"
            secureTextEntry
            autoCapitalize="none"
          />

          <TextField
            label="Passwort bestätigen"
            value={pw2}
            onChangeText={setPw2}
            placeholder="passwort wiederholen"
            secureTextEntry
            autoCapitalize="none"
          />

          <TextField
            label="Einladungscode"
            value={code}
            onChangeText={setCode}
            placeholder="code eingeben"
            autoCapitalize="none"
          />

          <AppButton
            title={loading ? "Registrieren…" : "Registrieren"}
            onPress={onRegister}
            disabled={loading || !canSubmit}
          />

          <Pressable
            onPress={() => router.replace("/(auth)/login")}
            style={styles.linkBtn}
          >
            <Text style={styles.linkText}>Bereits ein Konto vorhanden</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 26, paddingTop: 110, gap: 26 },
  title: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: "#000",
  },
  form: { gap: 16 },
  linkBtn: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  linkText: { color: "#000", fontWeight: "800", fontSize: 13 },
});
