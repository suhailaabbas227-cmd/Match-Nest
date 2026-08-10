import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

type Props = {
  compact?: boolean;
  centered?: boolean;
};

export function Brand({ compact = false, centered = false }: Props) {
  return (
    <View style={[styles.row, centered && styles.centered]}>
      <Image
        source={require("../../assets/matchnest-logo.png")}
        style={[styles.logo, compact && styles.logoCompact]}
        resizeMode="contain"
        accessibilityLabel="MatchNest logo"
      />
      <View>
        <Text style={[styles.name, compact && styles.nameCompact]}>
          <Text style={styles.pink}>Match</Text>Nest
        </Text>
        {!compact && <Text style={styles.tagline}>Dating & Marriage, Your Way</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  centered: { justifyContent: "center" },
  logo: { width: 68, height: 68, borderRadius: 18 },
  logoCompact: { width: 44, height: 44, borderRadius: 12 },
  name: { color: colors.purpleDark, fontSize: 30, fontWeight: "800", letterSpacing: -1 },
  nameCompact: { fontSize: 23 },
  pink: { color: colors.pink },
  tagline: { color: colors.muted, fontSize: 12, marginTop: -2 },
});
