import { StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../theme";

export function Notice({ text, kind = "error" }: { text: string; kind?: "error" | "success" }) {
  return (
    <View style={[styles.box, kind === "success" && styles.successBox]}>
      <Text style={[styles.text, kind === "success" && styles.successText]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 13, borderRadius: radii.small, backgroundColor: colors.dangerSoft },
  successBox: { backgroundColor: colors.successSoft },
  text: { color: colors.danger, fontSize: 13, lineHeight: 19, fontWeight: "600" },
  successText: { color: colors.success },
});
