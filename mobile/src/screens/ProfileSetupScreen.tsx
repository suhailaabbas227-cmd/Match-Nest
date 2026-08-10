import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Brand } from "../components/Brand";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Notice } from "../components/Notice";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { completeBasicProfile } from "../lib/profile";
import { colors, radii, shadow } from "../theme";

export function ProfileSetupScreen() {
  const { profile, setProfile, signOut } = useAuth();
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [occupation, setOccupation] = useState("");
  const [photoPrivacy, setPhotoPrivacy] = useState(profile?.mode === "marriage");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!gender || !city.trim() || !bio.trim()) {
      return setError("Choose your gender and add your city and introduction.");
    }
    setBusy(true);
    try {
      setProfile(await completeBasicProfile({ gender, city, bio, occupation, photoPrivacy }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.top}><Brand compact /><Pressable onPress={signOut}><Text style={styles.logout}>Log out</Text></Pressable></View>
      <View style={styles.heading}>
        <Text style={styles.step}>FINAL STEP</Text>
        <Text style={styles.title}>Build your profile</Text>
        <Text style={styles.subtitle}>A thoughtful profile creates better matches.</Text>
      </View>
      <View style={styles.card}>
        {error ? <Notice text={error} /> : null}
        <Text style={styles.label}>Gender *</Text>
        <View style={styles.choices}>
          {["Woman", "Man", "Other"].map((value) => (
            <Pressable key={value} onPress={() => setGender(value.toLowerCase())} style={[styles.choice, gender === value.toLowerCase() && styles.choiceOn]}>
              <Text style={[styles.choiceText, gender === value.toLowerCase() && styles.choiceTextOn]}>{value}</Text>
            </Pressable>
          ))}
        </View>
        <Field label="City *" value={city} onChangeText={setCity} autoCapitalize="words" placeholder="Where do you live?" />
        <Field label="Occupation" value={occupation} onChangeText={setOccupation} autoCapitalize="words" />
        <Field label="About you *" value={bio} onChangeText={setBio} multiline numberOfLines={4} style={styles.textArea} placeholder="Share your values, interests and what matters to you." />
        {profile?.mode === "marriage" && (
          <View style={styles.privacyRow}>
            <View style={styles.privacyText}>
              <Text style={styles.privacyTitle}>Private photos</Text>
              <Text style={styles.privacyCopy}>Hide photos until you accept a connection.</Text>
            </View>
            <Switch value={photoPrivacy} onValueChange={setPhotoPrivacy} trackColor={{ false: colors.border, true: colors.purple }} thumbColor={colors.white} />
          </View>
        )}
        <Button label="Save profile" onPress={submit} loading={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logout: { color: colors.muted, fontWeight: "700", padding: 10 },
  heading: { marginTop: 30, gap: 7 },
  step: { color: colors.pink, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 31, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 15 },
  card: { marginTop: 20, padding: 18, borderRadius: radii.large, backgroundColor: colors.surface, gap: 16, ...shadow },
  label: { color: colors.text, fontSize: 14, fontWeight: "700" },
  choices: { flexDirection: "row", gap: 8 },
  choice: { flex: 1, minHeight: 45, borderRadius: radii.small, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  choiceOn: { backgroundColor: colors.pinkSoft, borderColor: colors.pink },
  choiceText: { color: colors.muted, fontWeight: "700" },
  choiceTextOn: { color: colors.pinkDark },
  textArea: { minHeight: 104, paddingTop: 14, textAlignVertical: "top" },
  privacyRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radii.medium, backgroundColor: colors.purpleSoft },
  privacyText: { flex: 1, gap: 3 },
  privacyTitle: { color: colors.purpleDark, fontWeight: "800" },
  privacyCopy: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});
