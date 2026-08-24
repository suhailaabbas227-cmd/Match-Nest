import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Notice } from "../components/Notice";
import { ProfileTile } from "../components/ProfileTile";
import { useAuth } from "../context/AuthContext";
import { fetchBrowse } from "../lib/app";
import type { PublicProfile } from "../types";
import { colors, radii } from "../theme";

export function DiscoverTab({ onOpen }: { onOpen: (id: string) => void }) {
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true); setError("");
    try { setProfiles(await fetchBrowse(profile)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Profiles could not be loaded."); }
    finally { setLoading(false); }
  }, [profile]);

  useEffect(() => { void load(); }, [load]);

  return (
    <View>
      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.subtitle}>Profiles ranked by your shared preferences.</Text>
        </View>
        <Pressable onPress={() => void load()} style={styles.refresh}><Text style={styles.refreshText}>Refresh</Text></Pressable>
      </View>
      {error ? <Notice text={error} /> : null}
      {loading ? <Text style={styles.state}>Finding thoughtful matches...</Text> : null}
      {!loading && !profiles.length ? <Text style={styles.state}>No matching profiles yet. Check back soon.</Text> : null}
      <View style={styles.list}>
        {profiles.map((item) => <ProfileTile key={item.id} profile={item} onPress={() => onOpen(item.id)} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  headingText: { flex: 1 },
  title: { color: colors.text, fontSize: 29, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  refresh: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.pinkSoft },
  refreshText: { color: colors.pinkDark, fontWeight: "800", fontSize: 11 },
  state: { color: colors.muted, textAlign: "center", paddingVertical: 35 },
  list: { gap: 12, marginTop: 18 },
});
