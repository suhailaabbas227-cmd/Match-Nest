import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors, radii } from "../theme";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  style,
}: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !inactive && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" || variant === "danger" ? colors.white : colors.pink}
        />
      ) : (
        <Text
          style={[
            styles.label,
            (variant === "secondary" || variant === "ghost") && styles.altLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    paddingHorizontal: 22,
    borderRadius: radii.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.pink },
  danger: { backgroundColor: colors.danger },
  secondary: { backgroundColor: colors.pinkSoft, borderWidth: 1, borderColor: "#F7C7DE" },
  ghost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
  label: { color: colors.white, fontSize: 16, fontWeight: "800" },
  altLabel: { color: colors.pinkDark },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  disabled: { opacity: 0.55 },
});
