import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Brand } from "../components/Brand";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Notice } from "../components/Notice";
import { Screen } from "../components/Screen";
import { requestPasswordReset } from "../lib/auth";
import { colors, radii, shadow } from "../theme";
import type { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!email.trim()) return setError("Enter your email address.");
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send the reset link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Brand compact />
      <View style={styles.heading}>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>We will send a secure reset link to your email.</Text>
      </View>
      <View style={styles.card}>
        {error ? <Notice text={error} /> : null}
        {sent ? <Notice kind="success" text="Reset link sent. Check your inbox and spam folder." /> : null}
        <Field
          label="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button label={sent ? "Send again" : "Send reset link"} onPress={submit} loading={busy} />
        <Button label="Back to login" variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 42, gap: 8 },
  title: { color: colors.text, fontSize: 31, fontWeight: "900", letterSpacing: -0.7 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  card: { marginTop: 24, padding: 18, borderRadius: radii.large, backgroundColor: colors.surface, gap: 17, ...shadow },
});
