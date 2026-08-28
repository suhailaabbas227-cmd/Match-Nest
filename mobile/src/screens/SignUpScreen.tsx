import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Brand } from "../components/Brand";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Notice } from "../components/Notice";
import { Screen } from "../components/Screen";
import { PASSWORD_MAX_LENGTH, signUp } from "../lib/auth";
import { colors, radii, shadow } from "../theme";
import type { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "SignUp">;

export function SignUpScreen({ navigation }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!firstName.trim() || !email.trim() || !password || !dateOfBirth.trim()) {
      setError("Please complete every required field.");
      return;
    }
    setBusy(true);
    try {
      const result = await signUp({
        fullName: `${firstName} ${lastName}`.trim(),
        email,
        password,
        dateOfBirth,
      });
      if (result.needsEmailConfirmation) setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create your account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Brand compact />
      <View style={styles.heading}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Create an account first, then choose Dating or Marriage.</Text>
      </View>

      <View style={styles.card}>
        {sent ? (
          <View style={styles.sentWrap}>
            <Text style={styles.sentIcon}>✓</Text>
            <Text style={styles.sentTitle}>Check your email</Text>
            <Text style={styles.sentText}>
              We sent a secure verification link to {email.trim().toLowerCase()}.
            </Text>
            <Button label="Go to login" onPress={() => navigation.replace("Login")} />
          </View>
        ) : (
          <>
            {error ? <Notice text={error} /> : null}
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Field label="First name *" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
              </View>
              <View style={styles.nameField}>
                <Field label="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
              </View>
            </View>
            <Field
              label="Email address *"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
            />
            <Field
              label="Password *"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="newPassword"
              hint={"Use 8 to " + PASSWORD_MAX_LENGTH + " characters."}
            />
            <Field
              label="Date of birth *"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              hint="The Match Nest is strictly for adults aged 18 and over. Your date of birth stays private."
            />
            <Button label="Create Account" onPress={submit} loading={busy} />
            <Text style={styles.terms}>By signing up, you agree to the </Text>
            <View style={styles.legalRow}>
              <Pressable onPress={() => void Linking.openURL("https://thematchnest.com/terms")}>
                <Text style={styles.legalLink}>Terms of Service</Text>
              </Pressable>
              <Text style={styles.terms}> and </Text>
              <Pressable onPress={() => void Linking.openURL("https://thematchnest.com/privacy")}>
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </Pressable>
              <Text style={styles.terms}>.</Text>
            </View>
          </>
        )}
      </View>

      {!sent && (
        <Pressable style={styles.switch} onPress={() => navigation.replace("Login")}>
          <Text style={styles.switchText}>Already have an account? <Text style={styles.switchAccent}>Log in</Text></Text>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 28, gap: 8 },
  title: { color: colors.text, fontSize: 31, fontWeight: "900", letterSpacing: -0.7 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  card: { marginTop: 22, padding: 18, borderRadius: radii.large, backgroundColor: colors.surface, gap: 16, ...shadow },
  nameRow: { flexDirection: "row", gap: 10 },
  nameField: { flex: 1 },
  terms: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center" },
  legalRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", marginTop: -13 },
  legalLink: { color: colors.pinkDark, fontSize: 11, lineHeight: 17, fontWeight: "800" },
  switch: { padding: 20, alignItems: "center" },
  switchText: { color: colors.muted },
  switchAccent: { color: colors.pink, fontWeight: "800" },
  sentWrap: { gap: 16, alignItems: "center", paddingVertical: 10 },
  sentIcon: { width: 58, height: 58, borderRadius: 29, textAlign: "center", textAlignVertical: "center", backgroundColor: colors.successSoft, color: colors.success, fontSize: 27, fontWeight: "900" },
  sentTitle: { color: colors.text, fontSize: 25, fontWeight: "900" },
  sentText: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center" },
});
