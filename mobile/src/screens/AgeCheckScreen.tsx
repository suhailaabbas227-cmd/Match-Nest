import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Brand } from "../components/Brand";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Notice } from "../components/Notice";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { ageFromDateOfBirth } from "../lib/auth";
import { confirmDateOfBirth } from "../lib/profile";
import { colors, radii, shadow } from "../theme";

export function AgeCheckScreen() {
  const { setProfile, signOut } = useAuth();
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    const age = ageFromDateOfBirth(dateOfBirth);
    if (age === null || age < 18 || age > 120) {
      setError("You must be at least 18 years old to use The Match Nest.");
      return;
    }
    setBusy(true);
    try {
      setProfile(await confirmDateOfBirth(dateOfBirth));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not confirm your age.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Brand compact />
      <View style={styles.card}>
        <View style={styles.badge}><Text style={styles.badgeText}>18+</Text></View>
        <Text style={styles.title}>Confirm you are an adult</Text>
        <Text style={styles.copy}>
          The Match Nest is only for people aged 18 and over. Your full date of birth is private and
          will not appear on your public profile.
        </Text>
        {error ? <Notice text={error} /> : null}
        <Field
          label="Date of birth"
          placeholder="YYYY-MM-DD"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
        <Button label="Confirm and continue" onPress={submit} loading={busy} />
        <Button label="Log out" variant="ghost" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 45, padding: 22, borderRadius: radii.large, backgroundColor: colors.surface, gap: 17, ...shadow },
  badge: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.pinkSoft, alignItems: "center", justifyContent: "center" },
  badgeText: { color: colors.pink, fontWeight: "900", fontSize: 21 },
  title: { color: colors.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 22 },
});
