import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect } from "expo-router";

import { supabase } from "@/src/lib/supabase";
import { useSessionRequirement } from "@/src/features/session";

export default function LoginScreen() {
  const { requirement, href } = useSessionRequirement();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  useEffect(() => {
    if (errorText) {
      setErrorText(null);
    }
  }, [email, password, errorText]);

  const onSubmit = useCallback(async () => {
    if (!normalizedEmail || !password) {
      setErrorText("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    setSubmitting(true);
    setErrorText(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      setErrorText(err?.message ?? "Login fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }, [normalizedEmail, password]);

  if (requirement === "ready" && href) {
    return <Redirect href={href} />;
  }

  if (requirement === "select-employee") {
    return <Redirect href="/(auth)/select-employee" />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Autohaus System</Text>
          <Text style={styles.title}>Anmelden</Text>
          <Text style={styles.subtitle}>
            Melde dich mit deinem Konto an, um fortzufahren.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>E-Mail</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="name@firma.com"
              placeholderTextColor="rgba(0,0,0,0.35)"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Passwort</Text>
            <TextInput
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="rgba(0,0,0,0.35)"
              style={styles.input}
            />
          </View>

          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

          <Pressable
            onPress={() => {
              void onSubmit();
            }}
            disabled={submitting}
            style={({ pressed }) => [
              styles.button,
              submitting ? styles.buttonDisabled : null,
              pressed ? { opacity: 0.9 } : null,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Einloggen</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 32,
    backgroundColor: "#fff",
  },
  hero: {
    gap: 8,
    marginBottom: 32,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    color: "#145437",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#000",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: "rgba(0,0,0,0.55)",
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: "#000",
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(0,0,0,0.04)",
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B42318",
  },
  button: {
    marginTop: 4,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#145437",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
});
