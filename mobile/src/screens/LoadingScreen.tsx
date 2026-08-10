import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Brand } from "../components/Brand";
import { colors } from "../theme";

export function LoadingScreen() {
  return (
    <View style={styles.page}>
      <Brand centered />
      <ActivityIndicator size="large" color={colors.pink} />
      <Text style={styles.text}>Preparing your MatchNest experience…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 24, padding: 24 },
  text: { color: colors.muted, fontSize: 14 },
});
