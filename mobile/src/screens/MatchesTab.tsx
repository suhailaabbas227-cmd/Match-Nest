import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../components/Button";
import { Notice } from "../components/Notice";
import { ProfileTile } from "../components/ProfileTile";
import { getConnections, respondConnection } from "../lib/app";
import { colors, radii } from "../theme";

type Kind = "accepted" | "incoming" | "outgoing";
type Connection = Awaited<ReturnType<typeof getConnections>>[number];

export function MatchesTab({ onChat, onPlans }: { onChat: (id: string) => void; onPlans: () => void }) {
  const [kind, setKind] = useState<Kind>("accepted");
  const [items, setItems] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems(await getConnections(kind)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Connections could not be loaded."); }
    finally { setLoading(false); }
  }, [kind]);
  useEffect(() => { void load(); }, [load]);

  const respond = async (id: string, action: "accept" | "decline") => {
    try { await respondConnection(id, action); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Request could not be updated."); }
  };

  return (
    <View>
      <Text style={styles.title}>Connections</Text>
      <Text style={styles.subtitle}>Requests, accepted matches and your outgoing interest.</Text>
      <View style={styles.tabs}>
        {(["accepted", "incoming", "outgoing"] as Kind[]).map((value) => (
          <Pressable key={value} onPress={() => setKind(value)} style={[styles.tab, kind === value && styles.tabOn]}>
            <Text style={[styles.tabText, kind === value && styles.tabTextOn]}>{value === "accepted" ? "Matches" : value === "incoming" ? "Likes" : "Sent"}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Notice text={error} /> : null}
      {loading ? <Text style={styles.state}>Loading...</Text> : null}
      {!loading && !items.length ? <Text style={styles.state}>Nothing here yet.</Text> : null}
      <View style={styles.list}>
        {items.map((item) => item.locked ? (
          <View key={item.connectionId} style={styles.locked}>
            <Text style={styles.lockedTitle}>Someone is interested in you</Text>
            <Text style={styles.lockedCopy}>Upgrade to reveal their profile and respond.</Text>
            <Button label="View Premium" onPress={onPlans} style={styles.smallButton} />
          </View>
        ) : item.user ? (
          <ProfileTile key={item.connectionId} profile={item.user} onPress={() => item.userId && (kind === "accepted" ? onChat(item.userId) : undefined)} action={
            kind === "accepted" ? <Button label="Open chat" onPress={() => item.userId && onChat(item.userId)} style={styles.smallButton} />
              : kind === "incoming" ? <View style={styles.actions}><Button label="Accept" onPress={() => void respond(item.connectionId, "accept")} style={styles.actionButton} /><Button label="Decline" variant="ghost" onPress={() => void respond(item.connectionId, "decline")} style={styles.actionButton} /></View>
                : <Text style={styles.status}>Status: {item.status}</Text>
          } />
        ) : null)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 29, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  tabs: { flexDirection: "row", gap: 7, marginTop: 17 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  tabOn: { backgroundColor: colors.pink, borderColor: colors.pink },
  tabText: { color: colors.muted, fontWeight: "800", fontSize: 11 },
  tabTextOn: { color: colors.white },
  state: { color: colors.muted, textAlign: "center", paddingVertical: 35 },
  list: { gap: 12, marginTop: 18 },
  locked: { padding: 20, borderRadius: radii.large, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.purpleSoft },
  lockedTitle: { color: colors.purpleDark, fontSize: 17, fontWeight: "900" },
  lockedCopy: { color: colors.muted, marginTop: 5, fontSize: 12 },
  smallButton: { minHeight: 42, marginTop: 10 },
  actions: { flexDirection: "row", gap: 8 },
  actionButton: { flex: 1, minHeight: 42 },
  status: { color: colors.muted, fontSize: 12, fontWeight: "700" },
});
