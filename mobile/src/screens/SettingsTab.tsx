import { Alert, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { switchMode } from "../lib/app";
import { colors, radii } from "../theme";

export function SettingsTab({ onPlans, onAccount }: { onPlans: () => void; onAccount: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const modeLabel = profile?.mode === "marriage" ? "Marriage" : "Dating";
  const changeMode = () => Alert.alert(
    "Switch your path?",
    `Your profile data will stay saved. Switch from ${modeLabel} mode now?`,
    [
      { text: "Cancel", style: "cancel" },
      { text: "Switch", onPress: async () => { try { await switchMode(); await refreshProfile(); } catch (reason) { Alert.alert("Could not switch", reason instanceof Error ? reason.message : "Try again."); } } },
    ],
  );
  return (
    <View>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Membership, account security and privacy controls.</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current path</Text>
        <Text style={styles.mode}>{modeLabel}</Text>
        <Text style={styles.copy}>Switch any time. Your profile information is preserved.</Text>
        <Button label={`Switch to ${modeLabel === "Dating" ? "Marriage" : "Dating"}`} variant="secondary" onPress={changeMode} />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Membership</Text>
        <Text style={styles.copy}>{profile?.membership.isPremium ? `Premium · ${profile.membership.plan || "active"}` : "Free account · Premium unlocks requests and full messaging."}</Text>
        <Button label="View membership plans" onPress={onPlans} />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Privacy and account</Text>
        <Text style={styles.copy}>Reset your password, take a break, permanently delete your data or log out.</Text>
        <Button label="Open account settings" variant="ghost" onPress={onAccount} />
      </View>
      <Text style={styles.privacy}>The Match Nest never displays your exact date of birth or precise GPS location.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 29, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  card: { marginTop: 15, padding: 18, gap: 11, borderRadius: radii.large, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  mode: { color: colors.purpleDark, fontSize: 24, fontWeight: "900" },
  copy: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  privacy: { color: colors.muted, textAlign: "center", fontSize: 11, lineHeight: 17, marginTop: 18 },
});
