import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Brand } from "../components/Brand";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Notice } from "../components/Notice";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { PASSWORD_MAX_LENGTH, updatePassword } from "../lib/auth";
import { colors, radii, shadow } from "../theme";

export function ResetPasswordScreen() {
  const { finishRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (password !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      await updatePassword(password);
      finishRecovery();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update your password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Brand compact />
      <View style={styles.heading}>
        <Text style={styles.title}>Choose a new password</Text>
        <Text style={styles.subtitle}>Use 8 to {PASSWORD_MAX_LENGTH} characters and keep it private.</Text>
      </View>
      <View style={styles.card}>
        {error ? <Notice text={error} /> : null}
        <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry />
        <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry />
        <Button label="Update password" onPress={submit} loading={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 42, gap: 8 },
  title: { color: colors.text, fontSize: 30, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 15 },
  card: { marginTop: 24, padding: 18, borderRadius: radii.large, backgroundColor: colors.surface, gap: 17, ...shadow },
});
