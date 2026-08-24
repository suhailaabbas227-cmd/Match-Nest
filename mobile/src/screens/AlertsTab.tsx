import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Notice } from "../components/Notice";
import { fetchNotifications, markNotificationsRead } from "../lib/app";
import type { NotificationItem } from "../types";
import { colors, radii } from "../theme";

export function AlertsTab({ onPlans }: { onPlans: () => void }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems(await fetchNotifications()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Alerts could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const readAll = async () => {
    try { await markNotificationsRead(); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Alerts could not be updated."); }
  };

  return (
    <View>
      <View style={styles.heading}>
        <View style={styles.headingText}><Text style={styles.title}>Alerts</Text><Text style={styles.subtitle}>Matches, messages and safety updates.</Text></View>
        <Pressable onPress={() => void readAll()}><Text style={styles.read}>Mark read</Text></Pressable>
      </View>
      {error ? <Notice text={error} /> : null}
      {loading ? <Text style={styles.state}>Loading alerts...</Text> : null}
      {!loading && !items.length ? <Text style={styles.state}>No new activity yet.</Text> : null}
      <View style={styles.list}>
        {items.map((item) => (
          <Pressable key={item.id} onPress={item.locked ? onPlans : undefined} style={[styles.alert, !item.read_at && styles.unread]}>
            <View style={[styles.dot, item.read_at && styles.dotRead]} />
            <View style={styles.body}>
              <Text style={styles.alertTitle}>{item.locked ? "Someone is interested in you" : item.title}</Text>
              <Text style={styles.copy}>{item.locked ? "Upgrade to reveal this activity." : item.body}</Text>
              <Text style={styles.time}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "center", gap: 10 },
  headingText: { flex: 1 },
  title: { color: colors.text, fontSize: 29, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  read: { color: colors.pinkDark, fontSize: 11, fontWeight: "900" },
  state: { color: colors.muted, textAlign: "center", paddingVertical: 35 },
  list: { gap: 10, marginTop: 18 },
  alert: { flexDirection: "row", gap: 11, padding: 15, borderRadius: radii.large, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  unread: { borderColor: "#F4B9D2", backgroundColor: colors.pinkSoft },
  dot: { width: 9, height: 9, marginTop: 5, borderRadius: 5, backgroundColor: colors.pink },
  dotRead: { backgroundColor: colors.border },
  body: { flex: 1 },
  alertTitle: { color: colors.text, fontWeight: "900", fontSize: 14 },
  copy: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  time: { color: colors.muted, fontSize: 10, marginTop: 7 },
});
