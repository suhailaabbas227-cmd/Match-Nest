import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Image, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Brand } from "../components/Brand";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Notice } from "../components/Notice";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { completeBasicProfile } from "../lib/profile";
import { refreshPhotoStatus, uploadMainPhoto } from "../lib/photo";
import { colors, radii, shadow } from "../theme";

export function ProfileSetupScreen() {
  const { profile, setProfile, signOut } = useAuth();
  const [gender, setGender] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [occupation, setOccupation] = useState("");
  const [education, setEducation] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [photoPrivacy, setPhotoPrivacy] = useState(profile?.mode === "marriage");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoPending, setPhotoPending] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!gender || !lookingFor || !country.trim() || !city.trim() || !education.trim() || !maritalStatus.trim() || bio.trim().length < 20) {
      return setError("Complete every required field and write at least 20 characters about yourself.");
    }
    if (!profile?.profilePhoto) return setError("Add one approved main profile photo before continuing.");
    setBusy(true);
    try {
      setProfile(await completeBasicProfile({ mode: profile?.mode || "dating", gender, lookingFor, country, city, bio, occupation, education, maritalStatus, photoPrivacy }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  };

  const choosePhoto = async () => {
    setError("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setError("Allow photo access to choose your profile picture.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [4, 5], quality: .85 });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return setError("No photo was selected. Please try again.");
    setPhotoUri(asset.uri); setPhotoBusy(true); setPhotoPending(false);
    try {
      const review = await uploadMainPhoto(asset);
      if (review.status === "approved") {
        const updated = await refreshPhotoStatus();
        setProfile(updated); setPhotoPending(false);
      } else {
        setPhotoPending(true); setError(review.reason);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Photo could not be uploaded."); }
    finally { setPhotoBusy(false); }
  };

  const checkPhoto = async () => {
    setPhotoBusy(true); setError("");
    try {
      const updated = await refreshPhotoStatus();
      setProfile(updated);
      if (updated?.profilePhoto) setPhotoPending(false);
      else setError("Your photo is still waiting for safety review.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not check the review."); }
    finally { setPhotoBusy(false); }
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
          {["Woman", "Man"].map((value) => (
            <Pressable key={value} onPress={() => setGender(value.toLowerCase())} style={[styles.choice, gender === value.toLowerCase() && styles.choiceOn]}>
              <Text style={[styles.choiceText, gender === value.toLowerCase() && styles.choiceTextOn]}>{value}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Who are you looking for? *</Text>
        <View style={styles.choices}>
          {["Woman", "Man"].map((value) => (
            <Pressable key={value} onPress={() => setLookingFor(value.toLowerCase())} style={[styles.choice, lookingFor === value.toLowerCase() && styles.choiceOn]}>
              <Text style={[styles.choiceText, lookingFor === value.toLowerCase() && styles.choiceTextOn]}>{value}</Text>
            </Pressable>
          ))}
        </View>
        <Field label="Country *" value={country} onChangeText={setCountry} autoCapitalize="words" placeholder="Your country" />
        <Field label="City *" value={city} onChangeText={setCity} autoCapitalize="words" placeholder="Where do you live?" />
        <Field label="Education *" value={education} onChangeText={setEducation} autoCapitalize="words" placeholder="Highest education" />
        <Field label="Marital status *" value={maritalStatus} onChangeText={setMaritalStatus} autoCapitalize="words" placeholder="Never married, divorced or widowed" />
        <Field label="Occupation" value={occupation} onChangeText={setOccupation} autoCapitalize="words" />
        <Field label="About you *" value={bio} onChangeText={setBio} multiline numberOfLines={4} style={styles.textArea} placeholder="Share your values, interests and what matters to you." />
        <Text style={styles.label}>Main profile photo *</Text>
        <View style={styles.photoRow}>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : <View style={styles.photoPlaceholder}><Text style={styles.photoPlaceholderText}>Add a clear, real photo</Text></View>}
          <View style={styles.photoActions}>
            <Button label={photoBusy ? "Reviewing..." : "Choose photo"} onPress={choosePhoto} disabled={photoBusy} variant="secondary" />
            {photoPending ? <Button label="Check review" onPress={checkPhoto} disabled={photoBusy} variant="ghost" style={styles.checkButton} /> : null}
          </View>
        </View>
        <Text style={styles.photoHint}>Nudity, impersonation and AI-generated profile photos are not allowed.</Text>
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
  photoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  photo: { width: 92, height: 115, borderRadius: radii.medium, backgroundColor: colors.pinkSoft },
  photoPlaceholder: { width: 92, height: 115, padding: 10, alignItems: "center", justifyContent: "center", borderRadius: radii.medium, backgroundColor: colors.purpleSoft },
  photoPlaceholderText: { color: colors.purpleDark, fontSize: 10, lineHeight: 15, fontWeight: "800", textAlign: "center" },
  photoActions: { flex: 1 },
  checkButton: { marginTop: 7 },
  photoHint: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  privacyRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radii.medium, backgroundColor: colors.purpleSoft },
  privacyText: { flex: 1, gap: 3 },
  privacyTitle: { color: colors.purpleDark, fontWeight: "800" },
  privacyCopy: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});
