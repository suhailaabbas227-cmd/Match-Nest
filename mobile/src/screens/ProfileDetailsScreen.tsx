import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { Notice } from "../components/Notice";
import { Screen } from "../components/Screen";
import { blockMember, fetchPublicProfile, reportMember, sendConnection } from "../lib/app";
import type { PublicProfile, RootStackParamList } from "../types";
import { colors, radii, shadow } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "ProfileDetails">;

export function ProfileDetailsScreen({ route, navigation }: Props) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetchPublicProfile(route.params.userId).then(setProfile).catch((reason) => setError(reason.message));
  }, [route.params.userId]);

  const connect = async () => {
    setBusy(true); setError("");
    try { await sendConnection(route.params.userId); setMessage("Connection request sent."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Request could not be sent."); }
    finally { setBusy(false); }
  };

  const submitReport = async (reason: string) => {
    try { await reportMember(route.params.userId, reason); Alert.alert("Report received", "Our safety team will review it."); }
    catch (err) { setError(err instanceof Error ? err.message : "Report could not be sent."); }
  };
  const report = () => Alert.alert("Report this member", "Choose the reason that best describes the problem. Reports are private.", [
    { text: "Cancel", style: "cancel" },
    { text: "Inappropriate content", onPress: () => void submitReport("Inappropriate content") },
    { text: "Harassment or scam", onPress: () => void submitReport("Harassment or scam") },
  ]);
  const block = () => Alert.alert("Block this member?", "They will no longer be able to contact or discover you.", [
    { text: "Cancel", style: "cancel" },
    { text: "Block", style: "destructive", onPress: async () => { try { await blockMember(route.params.userId); navigation.goBack(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not block this member."); } } },
  ]);

  const details = profile?.profile || {};
  return (
    <Screen>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}><Text style={styles.backText}>Back</Text></Pressable>
      {error ? <Notice text={error} /> : null}
      {message ? <Notice kind="success" text={message} /> : null}
      {!profile ? <Text style={styles.loading}>Loading profile...</Text> : (
        <>
          {profile.profilePhoto ? <Image source={{ uri: profile.profilePhoto }} style={styles.hero} /> : <View style={styles.privatePhoto}><Text style={styles.privateText}>{profile.photosBlurred ? "Photos stay private until you match" : "Photo not available"}</Text></View>}
          <View style={styles.card}>
            <View style={styles.nameRow}><Text style={styles.name}>{profile.fullName}</Text>{profile.verified ? <Text style={styles.verified}>Verified</Text> : null}</View>
            <Text style={styles.location}>{[profile.city, profile.country].filter(Boolean).join(", ")}</Text>
            {details.aboutMe || details.bio ? <Text style={styles.bio}>{String(details.aboutMe || details.bio)}</Text> : null}
            <View style={styles.chips}>
              {[details.relationshipGoal, details.education, details.occupation, details.religiosity, details.sect].filter(Boolean).map((value) => <Text key={String(value)} style={styles.chip}>{String(value)}</Text>)}
            </View>
            {Array.isArray(details.interests) && details.interests.length ? <><Text style={styles.section}>Interests</Text><View style={styles.chips}>{details.interests.map((value: unknown) => <Text key={String(value)} style={styles.chip}>{String(value)}</Text>)}</View></> : null}
            <Button label={message ? "Request sent" : "Send connection request"} onPress={connect} loading={busy} disabled={!!message} style={styles.connect} />
            <View style={styles.safety}><Pressable onPress={report}><Text style={styles.safetyText}>Report</Text></Pressable><Pressable onPress={block}><Text style={[styles.safetyText, styles.block]}>Block</Text></Pressable></View>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: "flex-start", paddingHorizontal: 15, paddingVertical: 9, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  backText: { color: colors.pinkDark, fontWeight: "900", fontSize: 12 },
  loading: { color: colors.muted, textAlign: "center", paddingTop: 70 },
  hero: { width: "100%", height: 360, borderRadius: radii.large, marginTop: 15, backgroundColor: colors.pinkSoft },
  privatePhoto: { height: 280, marginTop: 15, alignItems: "center", justifyContent: "center", padding: 30, borderRadius: radii.large, backgroundColor: colors.purpleSoft },
  privateText: { color: colors.purpleDark, fontWeight: "800", textAlign: "center" },
  card: { marginTop: -25, marginHorizontal: 10, padding: 20, borderRadius: radii.large, backgroundColor: colors.surface, ...shadow },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  name: { flex: 1, color: colors.text, fontSize: 28, fontWeight: "900" },
  verified: { color: colors.success, fontWeight: "900", fontSize: 10 },
  location: { color: colors.muted, fontSize: 13, marginTop: 5 },
  bio: { color: colors.text, fontSize: 14, lineHeight: 22, marginTop: 17 },
  section: { color: colors.text, fontWeight: "900", fontSize: 15, marginTop: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  chip: { color: colors.purpleDark, backgroundColor: colors.purpleSoft, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radii.pill, overflow: "hidden", fontSize: 10, fontWeight: "800" },
  connect: { marginTop: 22 },
  safety: { flexDirection: "row", justifyContent: "center", gap: 28, marginTop: 18 },
  safetyText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  block: { color: colors.danger },
});
