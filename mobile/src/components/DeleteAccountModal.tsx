import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { permanentlyDeleteMyAccount } from "../lib/account";
import { colors, radii, shadow } from "../theme";
import { Button } from "./Button";
import { Field } from "./Field";
import { Notice } from "./Notice";

type Props = {
  visible: boolean;
  onClose: () => void;
  onDeleted: () => Promise<void> | void;
};

export function DeleteAccountModal({ visible, onClose, onDeleted }: Props) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) {
      setConfirmation("");
      setError("");
      setBusy(false);
    }
  }, [visible]);

  const remove = async () => {
    setError("");
    if (confirmation.trim() !== "DELETE") {
      setError("Type DELETE exactly to confirm permanent account deletion.");
      return;
    }

    setBusy(true);
    try {
      await permanentlyDeleteMyAccount();
      await onDeleted();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete the account.");
      setBusy(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={() => !busy && onClose()}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Pressable
          accessibilityLabel="Close delete account dialog"
          disabled={busy}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.icon}>
            <Text style={styles.iconText}>!</Text>
          </View>
          <Text style={styles.title}>Permanently delete account?</Text>
          <Text style={styles.copy}>
            Your profile, photos, matches, and messages will be removed. This cannot be undone.
          </Text>
          {error ? <Notice text={error} /> : null}
          <Field
            label="Type DELETE to confirm"
            value={confirmation}
            onChangeText={setConfirmation}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!busy}
          />
          <Button
            label="Permanently delete account"
            variant="danger"
            onPress={remove}
            loading={busy}
            disabled={confirmation.trim() !== "DELETE"}
          />
          <Button label="Keep my account" variant="ghost" onPress={onClose} disabled={busy} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
    backgroundColor: "rgba(23, 21, 37, 0.62)",
  },
  card: {
    padding: 22,
    borderRadius: radii.large,
    backgroundColor: colors.surface,
    gap: 16,
    ...shadow,
  },
  icon: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 27,
    backgroundColor: colors.dangerSoft,
  },
  iconText: { color: colors.danger, fontSize: 25, fontWeight: "900" },
  title: { color: colors.text, fontSize: 24, fontWeight: "900" },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 21 },
});
