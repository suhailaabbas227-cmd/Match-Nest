import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Brand } from "../components/Brand";
import { Button } from "../components/Button";
import { DeleteAccountModal } from "../components/DeleteAccountModal";
import { Notice } from "../components/Notice";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { reactivateMyAccount } from "../lib/account";
import { colors, radii, shadow } from "../theme";

export function DeactivatedScreen() {
  const { setProfile, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleteVisible, setDeleteVisible] = useState(false);

  const reactivate = async () => {
    setError("");
    setBusy(true);
    try {
      const updated = await reactivateMyAccount();
      if (!updated) throw new Error("Could not reactivate the account.");
      setProfile(updated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not reactivate the account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Brand compact />
      <View style={styles.card}>
        <Text style={styles.icon}>zZ</Text>
        <Text style={styles.title}>Your account is deactivated</Text>
        <Text style={styles.copy}>
          Your profile is hidden and matching and messaging are paused. Your data is still saved.
        </Text>
        {error ? <Notice text={error} /> : null}
        <Button label="Reactivate my account" onPress={reactivate} loading={busy} />
        <Button label="Log out" variant="ghost" onPress={signOut} disabled={busy} />
        <Button
          label="Permanently delete account"
          variant="danger"
          onPress={() => setDeleteVisible(true)}
          disabled={busy}
        />
      </View>
      <DeleteAccountModal
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onDeleted={signOut}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 60,
    padding: 22,
    borderRadius: radii.large,
    backgroundColor: colors.surface,
    gap: 17,
    alignItems: "stretch",
    ...shadow,
  },
  icon: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: colors.purpleSoft,
    color: colors.purpleDark,
    fontSize: 19,
    fontWeight: "900",
  },
  title: { color: colors.text, fontSize: 26, fontWeight: "900", textAlign: "center" },
  copy: { color: colors.muted, textAlign: "center", fontSize: 14, lineHeight: 22 },
});
