import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { Brand } from "../components/Brand";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { colors, radii, shadow } from "../theme";
import type { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const { profile, signOut } = useAuth();
  const modeLabel = profile?.mode === "marriage" ? "Marriage" : "Dating";
  return (
    <Screen>
      <Brand compact />
      <View style={styles.greeting}>
        <Text style={styles.hello}>Hello{profile?.fullName ? `, ${profile.fullName.split(" ")[0]}` : ""}</Text>
        <Text style={styles.subtitle}>Your {modeLabel} experience is ready.</Text>
      </View>
      <View style={styles.modeCard}>
        <Text style={styles.modeIcon}>{profile?.mode === "marriage" ? "◇" : "♥"}</Text>
        <View style={styles.modeText}>
          <Text style={styles.modeEyebrow}>CURRENT PATH</Text>
          <Text style={styles.modeTitle}>{modeLabel}</Text>
        </View>
        <Text style={styles.verified}>{profile?.verified ? "Verified" : "Verification pending"}</Text>
      </View>
      <Text style={styles.sectionTitle}>Mobile app foundation complete</Text>
      <View style={styles.grid}>
        {[
          ["Discover", "Browse compatible profiles"],
          ["Matches", "Manage accepted connections"],
          ["Messages", "Private realtime conversations"],
          ["Safety", "Block and report controls"],
        ].map(([title, copy]) => (
          <View key={title} style={styles.feature}>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureCopy}>{copy}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.nextCopy}>These four native sections are the next MatchNest mobile milestone.</Text>
      <Button
        label="Account settings"
        variant="secondary"
        onPress={() => navigation.navigate("AccountSettings")}
        style={styles.settings}
      />
      <Button label="Log out" variant="ghost" onPress={signOut} style={styles.logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { marginTop: 35, gap: 6 },
  hello: { color: colors.text, fontSize: 32, fontWeight: "900", letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 15 },
  modeCard: { marginTop: 22, flexDirection: "row", alignItems: "center", padding: 17, borderRadius: radii.large, backgroundColor: colors.surface, ...shadow },
  modeIcon: { width: 52, height: 52, borderRadius: 26, textAlign: "center", textAlignVertical: "center", backgroundColor: colors.pink, color: colors.white, fontSize: 27 },
  modeText: { flex: 1, marginLeft: 13 },
  modeEyebrow: { color: colors.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  modeTitle: { color: colors.text, fontSize: 21, fontWeight: "900", marginTop: 3 },
  verified: { color: colors.pinkDark, backgroundColor: colors.pinkSoft, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radii.pill, fontSize: 10, fontWeight: "800" },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 30, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  feature: { width: "48%", minHeight: 112, padding: 14, borderRadius: radii.medium, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  featureTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  featureCopy: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  nextCopy: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 18 },
  settings: { marginTop: 26 },
  logout: { marginTop: 10 },
});
