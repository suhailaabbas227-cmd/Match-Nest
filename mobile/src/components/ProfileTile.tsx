import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { PublicProfile } from "../types";
import { colors, radii, shadow } from "../theme";

type Props = {
  profile: PublicProfile;
  onPress: () => void;
  action?: ReactNode;
};

export function ProfileTile({ profile, onPress, action }: Props) {
  const initials = profile.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const details = [profile.city, profile.country].filter(Boolean).join(", ");
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {profile.profilePhoto ? (
        <Image source={{ uri: profile.profilePhoto }} style={styles.photo} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.initials}>{profile.photosBlurred ? "Private" : initials || "MN"}</Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{profile.fullName}</Text>
          {profile.verified ? <Text style={styles.verified}>Verified</Text> : null}
        </View>
        <Text style={styles.meta}>{details || "Location not added"}</Text>
        {profile.matchScore ? (
          <View style={styles.matchRow}>
            <Text style={styles.score}>{profile.matchScore}% match</Text>
            <Text style={styles.reason} numberOfLines={1}>{profile.matchReasons?.join(" · ") || "Shared intentions"}</Text>
          </View>
        ) : null}
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", overflow: "hidden", borderRadius: radii.large, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadow },
  pressed: { opacity: 0.88 },
  photo: { width: 108, minHeight: 132, backgroundColor: colors.pinkSoft },
  placeholder: { width: 108, minHeight: 132, alignItems: "center", justifyContent: "center", backgroundColor: colors.purpleSoft },
  initials: { color: colors.purpleDark, fontWeight: "900", fontSize: 18 },
  body: { flex: 1, padding: 14 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  name: { flex: 1, color: colors.text, fontSize: 17, fontWeight: "900" },
  verified: { color: colors.success, fontSize: 9, fontWeight: "900" },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  matchRow: { marginTop: 10, gap: 3 },
  score: { color: colors.pinkDark, fontSize: 12, fontWeight: "900" },
  reason: { color: colors.muted, fontSize: 10 },
  action: { marginTop: 10 },
});
