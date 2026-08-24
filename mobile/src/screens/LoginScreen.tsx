import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Brand } from "../components/Brand";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Notice } from "../components/Notice";
import { Screen } from "../components/Screen";
import { signIn } from "../lib/auth";
import { colors, radii, shadow } from "../theme";
import type { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Brand compact />
      <View style={styles.heading}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to continue your journey on The Match Nest.</Text>
      </View>

      <View style={styles.card}>
        {error ? <Notice text={error} /> : null}
        <Field
          label="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          onSubmitEditing={submit}
        />
        <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
          <Text style={styles.forgot}>Forgot password?</Text>
        </Pressable>
        <Button label="Log in" onPress={submit} loading={busy} />
      </View>

      <Pressable style={styles.switch} onPress={() => navigation.replace("SignUp")}>
        <Text style={styles.switchText}>New to The Match Nest? <Text style={styles.switchAccent}>Create account</Text></Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 42, gap: 8 },
  title: { color: colors.text, fontSize: 33, fontWeight: "900", letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 15 },
  card: { marginTop: 24, padding: 18, borderRadius: radii.large, backgroundColor: colors.surface, gap: 17, ...shadow },
  forgot: { color: colors.pink, fontWeight: "800", textAlign: "right" },
  switch: { padding: 22, alignItems: "center" },
  switchText: { color: colors.muted },
  switchAccent: { color: colors.pink, fontWeight: "800" },
});
