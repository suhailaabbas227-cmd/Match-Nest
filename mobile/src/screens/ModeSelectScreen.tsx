import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Brand } from "../components/Brand";
import { Button } from "../components/Button";
import { Notice } from "../components/Notice";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { setProfileMode } from "../lib/profile";
import { colors, radii, shadow } from "../theme";
import type { MatchMode } from "../types";

export function ModeSelectScreen() {
  const { setProfile, signOut } = useAuth();
  const [selected, setSelected] = useState<MatchMode | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const continueWithMode = async () => {
    if (!selected) return setError("Choose Dating or Marriage to continue.");
    setError("");
    setBusy(true);
    try {
      setProfile(await setProfileMode(selected));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your choice.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.top}><Brand compact /><Pressable onPress={signOut}><Text style={styles.logout}>Log out</Text></Pressable></View>
      <View style={styles.heading}>
        <Text style={styles.title}>What are you here for?</Text>
        <Text style={styles.subtitle}>Choose your path now. You can switch later from settings.</Text>
      </View>
      {error ? <Notice text={error} /> : null}

      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: selected === "dating" }}
        onPress={() => setSelected("dating")}
        style={[styles.option, styles.dating, selected === "dating" && styles.datingSelected]}
      >
        <View style={[styles.modeIcon, styles.datingIcon]}><Text style={styles.heart}>♥</Text></View>
        <View style={styles.optionText}>
          <Text style={[styles.optionTitle, styles.datingTitle]}>Dating</Text>
          <Text style={styles.optionCopy}>Meet people, take your time and build a genuine connection.</Text>
        </View>
        <View style={[styles.radio, selected === "dating" && styles.radioDating]} />
      </Pressable>

      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: selected === "marriage" }}
        onPress={() => setSelected("marriage")}
        style={[styles.option, styles.marriage, selected === "marriage" && styles.marriageSelected]}
      >
        <View style={[styles.modeIcon, styles.marriageIcon]}><Text style={styles.rings}>◇</Text></View>
        <View style={styles.optionText}>
          <Text style={[styles.optionTitle, styles.marriageTitle]}>Marriage</Text>
          <Text style={styles.optionCopy}>Find a serious life partner with shared values and intentions.</Text>
        </View>
        <View style={[styles.radio, selected === "marriage" && styles.radioMarriage]} />
      </Pressable>

      <Button label="Continue" onPress={continueWithMode} loading={busy} disabled={!selected} style={styles.continue} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logout: { color: colors.muted, fontWeight: "700", padding: 10 },
  heading: { marginTop: 34, marginBottom: 20, gap: 9 },
  title: { color: colors.text, fontSize: 31, fontWeight: "900", letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  option: { flexDirection: "row", alignItems: "center", minHeight: 142, padding: 17, borderRadius: radii.large, borderWidth: 2, marginTop: 15, ...shadow },
  dating: { backgroundColor: "#FFF9FC", borderColor: "#F6D8E6" },
  datingSelected: { borderColor: colors.pink },
  marriage: { backgroundColor: "#FBF8FF", borderColor: "#E3D7F5" },
  marriageSelected: { borderColor: colors.purple },
  modeIcon: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  datingIcon: { backgroundColor: colors.pink },
  marriageIcon: { backgroundColor: colors.purple },
  heart: { color: colors.white, fontSize: 24 },
  rings: { color: colors.white, fontSize: 32, fontWeight: "700" },
  optionText: { flex: 1, marginHorizontal: 14, gap: 6 },
  optionTitle: { fontSize: 22, fontWeight: "900" },
  datingTitle: { color: colors.pinkDark },
  marriageTitle: { color: colors.purpleDark },
  optionCopy: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border },
  radioDating: { borderColor: colors.pink, backgroundColor: colors.pink },
  radioMarriage: { borderColor: colors.purple, backgroundColor: colors.purple },
  continue: { marginTop: 24 },
});
