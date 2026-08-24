import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Notice } from "../components/Notice";
import { useAuth } from "../context/AuthContext";
import { fetchConversations } from "../lib/app";
import type { ConversationSummary } from "../types";
import { colors, radii } from "../theme";

export function ChatsTab({ onOpen }: { onOpen: (userId: string) => void }) {
  const { profile } = useAuth();
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true); setError("");
    try { setItems(await fetchConversations(profile.id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Chats could not be loaded."); }
    finally { setLoading(false); }
  }, [profile]);
  useEffect(() => { void load(); }, [load]);

  return (
    <View>
      <View style={styles.heading}>
        <View style={styles.headingText}><Text style={styles.title}>Messages</Text><Text style={styles.subtitle}>Private conversations with accepted matches.</Text></View>
        <Pressable onPress={() => void load()}><Text style={styles.refresh}>Refresh</Text></Pressable>
      </View>
      {error ? <Notice text={error} /> : null}
      {loading ? <Text style={styles.state}>Loading chats...</Text> : null}
      {!loading && !items.length ? <Text style={styles.state}>Your conversations will appear here after a match.</Text> : null}
      <View style={styles.list}>
        {items.map((item) => (
          <Pressable key={item.id} onPress={() => onOpen(item.user.id)} style={({ pressed }) => [styles.chat, pressed && styles.pressed]}>
            <View style={styles.avatar}><Text style={styles.initial}>{item.user.fullName[0]?.toUpperCase() || "M"}</Text></View>
            <View style={styles.body}>
              <Text style={styles.name}>{item.user.fullName}</Text>
              <Text style={styles.preview} numberOfLines={1}>{item.lastMessage || "Start the conversation"}</Text>
            </View>
            <Text style={styles.open}>Open</Text>
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
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  refresh: { color: colors.pinkDark, fontSize: 11, fontWeight: "900" },
  state: { color: colors.muted, textAlign: "center", paddingVertical: 35, lineHeight: 20 },
  list: { gap: 10, marginTop: 18 },
  chat: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radii.large, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: .85 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.purpleSoft },
  initial: { color: colors.purpleDark, fontWeight: "900", fontSize: 18 },
  body: { flex: 1 },
  name: { color: colors.text, fontSize: 15, fontWeight: "900" },
  preview: { color: colors.muted, fontSize: 12, marginTop: 4 },
  open: { color: colors.pinkDark, fontSize: 11, fontWeight: "900" },
});
