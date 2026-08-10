import type { PropsWithChildren, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme";

type Props = PropsWithChildren<{
  footer?: ReactNode;
  scroll?: boolean;
}>;

export function Screen({ children, footer, scroll = true }: Props) {
  const content = (
    <View style={styles.content}>
      <View style={styles.orbPink} />
      <View style={styles.orbPurple} />
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "right", "bottom", "left"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        ) : content}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 28, overflow: "hidden" },
  footer: { padding: 18, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  orbPink: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#FFD6E8",
    opacity: 0.38,
    top: -100,
    right: -95,
  },
  orbPurple: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#E8D5FF",
    opacity: 0.35,
    bottom: -90,
    left: -75,
  },
});
