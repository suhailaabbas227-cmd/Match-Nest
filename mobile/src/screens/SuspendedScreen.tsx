import { StyleSheet, Text, View } from "react-native";
import { Brand } from "../components/Brand";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { colors, radii, shadow } from "../theme";

export function SuspendedScreen() {
  const { signOut } = useAuth();
  return (
    <Screen>
      <Brand compact />
      <View style={styles.card}>
        <Text style={styles.icon}>!</Text>
        <Text style={styles.title}>Account unavailable</Text>
        <Text style={styles.copy}>This account is currently suspended. Contact MatchNest support if you believe this is a mistake.</Text>
        <Button label="Log out" variant="ghost" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 60, padding: 22, borderRadius: radii.large, backgroundColor: colors.surface, gap: 17, alignItems: "center", ...shadow },
  icon: { width: 58, height: 58, borderRadius: 29, textAlign: "center", textAlignVertical: "center", backgroundColor: colors.dangerSoft, color: colors.danger, fontSize: 27, fontWeight: "900" },
  title: { color: colors.text, fontSize: 27, fontWeight: "900" },
  copy: { color: colors.muted, textAlign: "center", fontSize: 14, lineHeight: 22 },
});
