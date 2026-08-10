import type { TextInputProps } from "react-native";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii } from "../theme";

type Props = TextInputProps & {
  label: string;
  hint?: string;
};

export function Field({ label, hint, style, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#A19AAA"
        selectionColor={colors.pink}
        style={[styles.input, style]}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  label: { color: colors.text, fontSize: 14, fontWeight: "700" },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 16,
  },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});
