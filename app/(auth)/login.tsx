import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import Screen from "@/src/components/ui/Screen";
import TextField from "@/src/components/ui/TextField";
import AppButton from "@/src/components/ui/AppButton";
import { supabase } from "@/src/lib/supabase";

const UI = {
  green: "#145437",
  text: "#000",
  muted: "rgba(0,0,0,0.55)",
} as const;

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    const e = email.trim();
    return e.length > 3 && pw.trim().length >= 6;
  }, [email, pw]);

  const onLogin = useCallback(async () => {
    const e = email.trim();
    const p = pw.trim();

    if (!e || !p) {
      Alert.alert("Fehlt etwas", "Bitte E-Mail und Passwort eingeben.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: e,
        password: p,
      });
      if (error) throw error;

      // App index gate übernimmt routing
      router.replace("/");
    } catch (err: any) {
      Alert.alert("Login fehlgeschlagen", err?.message ?? "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [email, pw]);

  const onForgot = useCallback(async () => {
    const e = email.trim();
    if (!e) {
      Alert.alert("E-Mail fehlt", "Bitte zuerst deine E-Mail eingeben.");
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(e);
      if (error) throw error;
      Alert.alert("E-Mail gesendet", "Bitte Postfach prüfen (Reset-Link).");
    } catch (err: any) {
      Alert.alert("Fehler", err?.message ?? "Konnte Reset nicht starten.");
    }
  }, [email]);

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

          <Pressable
            onPress={onForgot}
            style={({ pressed }) => [
              styles.forgot,
              pressed ? { opacity: 0.8 } : null,
            ]}
          >
            <Text style={styles.forgotText}>Passwort vergessen?</Text>
          </Pressable>

          <AppButton
            title={loading ? "Anmelden…" : "Anmelden"}
            onPress={onLogin}
            disabled={loading || !canSubmit}
          />

          <Pressable
            onPress={() => router.push("/(auth)/register")}
            style={({ pressed }) => [
              styles.linkBtn,
              pressed ? { opacity: 0.85 } : null,
            ]}
          >
            <Text style={styles.linkText}>Neues Konto erstellen</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 26,
    paddingTop: 120,
    gap: 26,
  },
  title: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: UI.text,
  },
  form: {
    gap: 16,
  },
  forgot: {
    alignSelf: "flex-end",
    marginTop: -2,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  forgotText: {
    color: UI.muted,
    fontWeight: "700",
    fontSize: 12,
  },
  linkBtn: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  linkText: {
    color: UI.text,
    fontWeight: "800",
    fontSize: 13,
  },
});
