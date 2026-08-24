import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Notice } from "../components/Notice";
import { useAuth } from "../context/AuthContext";
import { openConversation, sendMessage } from "../lib/app";
import type { ChatMessage, PublicProfile, RootStackParamList } from "../types";
import { colors, radii } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Conversation">;

export function ConversationScreen({ route, navigation }: Props) {
  const { profile } = useAuth();
  const [other, setOther] = useState<PublicProfile | null>(null);
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const data = await openConversation(route.params.userId);
      setOther(data.user); setConversationId(data.conversation.id); setMessages(data.messages);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Conversation could not be opened."); }
  }, [route.params.userId]);
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 7000); return () => clearInterval(timer); }, [load]);

  const send = async () => {
    const clean = text.trim();
    if (!clean || !conversationId) return;
    setBusy(true); setError("");
    try { const message = await sendMessage(conversationId, clean); setMessages((current) => [...current, message]); setText(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Message could not be sent."); }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>Back</Text></Pressable>
          <View style={styles.headerText}><Text style={styles.name}>{other?.fullName || "Conversation"}</Text><Text style={styles.private}>Private matched chat</Text></View>
        </View>
        {error ? <View style={styles.notice}><Notice text={error} /></View> : null}
        <ScrollView contentContainerStyle={styles.messages}>
          {!messages.length ? <Text style={styles.empty}>Say hello and start a respectful conversation.</Text> : null}
          {messages.map((message) => {
            const mine = message.from === profile?.id;
            return <View key={message.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}><Text style={[styles.message, mine && styles.mineText]}>{message.locked ? "This message is available with Premium" : message.text}</Text><Text style={[styles.time, mine && styles.mineTime]}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text></View>;
          })}
        </ScrollView>
        <View style={styles.composer}>
          <TextInput value={text} onChangeText={setText} placeholder="Write a respectful message..." placeholderTextColor={colors.muted} multiline maxLength={2000} style={styles.input} />
          <Pressable disabled={busy || !text.trim()} onPress={() => void send()} style={[styles.send, (busy || !text.trim()) && styles.sendDisabled]}><Text style={styles.sendText}>{busy ? "..." : "Send"}</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 15, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  back: { color: colors.pinkDark, fontSize: 12, fontWeight: "900" }, headerText: { flex: 1 },
  name: { color: colors.text, fontSize: 17, fontWeight: "900" }, private: { color: colors.muted, fontSize: 10, marginTop: 2 },
  notice: { paddingHorizontal: 15 },
  messages: { flexGrow: 1, padding: 16, gap: 9, justifyContent: "flex-end" },
  empty: { color: colors.muted, textAlign: "center", marginBottom: 40 },
  bubble: { maxWidth: "82%", paddingHorizontal: 13, paddingVertical: 10, borderRadius: 17 },
  mine: { alignSelf: "flex-end", backgroundColor: colors.pink }, theirs: { alignSelf: "flex-start", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  message: { color: colors.text, fontSize: 13, lineHeight: 19 }, mineText: { color: colors.white },
  time: { color: colors.muted, fontSize: 8, marginTop: 4 }, mineTime: { color: "#FFE5F1" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  input: { flex: 1, maxHeight: 110, minHeight: 46, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, borderRadius: radii.medium, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  send: { minHeight: 46, justifyContent: "center", paddingHorizontal: 17, borderRadius: radii.medium, backgroundColor: colors.pink }, sendDisabled: { opacity: .5 }, sendText: { color: colors.white, fontWeight: "900" },
});
