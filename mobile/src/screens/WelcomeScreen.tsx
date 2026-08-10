import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Brand } from "../components/Brand";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { colors, radii, shadow } from "../theme";
import type { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <Screen>
      <Brand centered />

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>ONE APP, TWO MEANINGFUL PATHS</Text>
        <Text style={styles.title}>Meet someone who wants what you want.</Text>
        <Text style={styles.lead}>
          Choose genuine dating or marriage with intent. MatchNest keeps both experiences
          separate, private and focused.
        </Text>
      </View>

      <View style={styles.paths}>
        <View style={[styles.path, styles.dating]}>
          <View style={[styles.icon, styles.datingIcon]}>
            <Text style={styles.iconText}>♥</Text>
          </View>
          <Text style={styles.pathTitle}>Dating</Text>
          <Text style={styles.pathText}>Build a real connection at your own pace.</Text>
        </View>
        <View style={[styles.path, styles.marriage]}>
          <View style={[styles.icon, styles.marriageIcon]}>
            <Text style={styles.ringText}>◇</Text>
          </View>
          <Text style={[styles.pathTitle, styles.marriageTitle]}>Marriage</Text>
          <Text style={styles.pathText}>Find a life partner who shares your values.</Text>
        </View>
      </View>

      <View style={styles.trustRow}>
        <Text style={styles.trust}>18+ only</Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.trust}>Privacy first</Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.trust}>Verified profiles</Text>
      </View>

      <View style={styles.actions}>
        <Button label="Create my account" onPress={() => navigation.navigate("SignUp")} />
        <Pressable onPress={() => navigation.navigate("Login")} style={styles.loginLink}>
          <Text style={styles.loginText}>Already a member? <Text style={styles.loginAccent}>Log in</Text></Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 34, alignItems: "center", gap: 12 },
  eyebrow: { color: colors.pink, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 35, lineHeight: 40, fontWeight: "900", textAlign: "center", letterSpacing: -1.2 },
  lead: { color: colors.muted, textAlign: "center", fontSize: 15, lineHeight: 23, maxWidth: 360 },
  paths: { flexDirection: "row", gap: 12, marginTop: 30 },
  path: { flex: 1, minHeight: 176, borderRadius: radii.large, padding: 16, borderWidth: 1, ...shadow },
  dating: { backgroundColor: "#FFF9FC", borderColor: "#F7CCE0" },
  marriage: { backgroundColor: "#FBF8FF", borderColor: "#DDCAF8" },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 13 },
  datingIcon: { backgroundColor: colors.pink },
  marriageIcon: { backgroundColor: colors.purple },
  iconText: { color: colors.white, fontSize: 22 },
  ringText: { color: colors.white, fontSize: 29, lineHeight: 31, fontWeight: "700" },
  pathTitle: { color: colors.pinkDark, fontSize: 20, fontWeight: "900" },
  marriageTitle: { color: colors.purpleDark },
  pathText: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 7 },
  trustRow: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", marginTop: 20, gap: 7 },
  trust: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  dot: { color: colors.pink },
  actions: { marginTop: "auto", paddingTop: 36, gap: 9 },
  loginLink: { padding: 13, alignItems: "center" },
  loginText: { color: colors.muted, fontSize: 14 },
  loginAccent: { color: colors.pink, fontWeight: "800" },
});
