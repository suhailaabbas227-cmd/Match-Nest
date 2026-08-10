import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Brand } from "../components/Brand";
import { Button } from "../components/Button";
import { DeleteAccountModal } from "../components/DeleteAccountModal";
import { Notice } from "../components/Notice";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { deactivateMyAccount } from "../lib/account";
import { requestPasswordReset } from "../lib/auth";
import { colors, radii, shadow } from "../theme";
import type { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "AccountSettings">;

export function AccountSettingsScreen({ navigation }: Props) {
  const { profile, setProfile, signOut } = useAuth();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [deactivateBusy, setDeactivateBusy] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);

  const sendReset = async () => {
    setError("");
    setMessage("");
    if (!profile?.email) return setError("No email address is attached to this account.");

    setResetBusy(true);
    try {
      await requestPasswordReset(profile.email);
      setMessage("Password reset link sent. Check your inbox and spam folder.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send the reset link.");
    } finally {
      setResetBusy(false);
    }
  };

  const deactivate = async () => {
    setError("");
    setMessage("");
    setDeactivateBusy(true);
    try {
      const updated = await deactivateMyAccount();
      if (!updated) throw new Error("Could not deactivate the account.");
      setProfile(updated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not deactivate the account.");
    } finally {
      setDeactivateBusy(false);
    }
  };

  const confirmDeactivate = () => {
    Alert.alert(
      "Deactivate your account?",
      "Your profile will be hidden and matching and messaging will pause. You can reactivate after logging in.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Deactivate", style: "destructive", onPress: () => void deactivate() },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.topRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Brand compact />
      </View>

      <View style={styles.heading}>
        <Text style={styles.title}>Account settings</Text>
        <Text style={styles.subtitle}>Manage your sign-in and account availability.</Text>
      </View>

      {error ? <Notice text={error} /> : null}
      {message ? <Notice kind="success" text={message} /> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Password and security</Text>
        <Text style={styles.email}>{profile?.email || "No email available"}</Text>
        <Text style={styles.copy}>
          We will email you a secure link so you can choose a new password.
        </Text>
        <Button
          label="Send password reset email"
          variant="secondary"
          onPress={sendReset}
          loading={resetBusy}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Take a break</Text>
        <Text style={styles.copy}>
          Deactivation hides your profile and pauses new matches and messages without deleting your data.
        </Text>
        <Button
          label="Deactivate account"
          variant="ghost"
          onPress={confirmDeactivate}
          loading={deactivateBusy}
        />
      </View>

      <View style={[styles.card, styles.dangerCard]}>
        <Text style={[styles.cardTitle, styles.dangerTitle]}>Delete account</Text>
        <Text style={styles.copy}>
          Permanently remove your MatchNest account and personal data. This action cannot be undone.
        </Text>
        <Button
          label="Permanently delete account"
          variant="danger"
          onPress={() => setDeleteVisible(true)}
        />
      </View>

      <Button label="Log out" variant="ghost" onPress={signOut} style={styles.logout} />

      <DeleteAccountModal
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onDeleted={signOut}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", gap: 15 },
  back: {
    minWidth: 58,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  backText: { color: colors.pinkDark, fontSize: 13, fontWeight: "800" },
  heading: { marginTop: 32, marginBottom: 20, gap: 7 },
  title: { color: colors.text, fontSize: 31, fontWeight: "900", letterSpacing: -0.7 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  card: {
    marginTop: 15,
    padding: 18,
    borderRadius: radii.large,
    backgroundColor: colors.surface,
    gap: 13,
    ...shadow,
  },
  dangerCard: { borderWidth: 1, borderColor: "#F4B9CA" },
  cardTitle: { color: colors.text, fontSize: 19, fontWeight: "900" },
  dangerTitle: { color: colors.danger },
  email: { color: colors.pinkDark, fontSize: 14, fontWeight: "700" },
  copy: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  logout: { marginTop: 25 },
});
