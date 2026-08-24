import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Brand } from "../components/Brand";
import { Screen } from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { AlertsTab } from "./AlertsTab";
import { ChatsTab } from "./ChatsTab";
import { DiscoverTab } from "./DiscoverTab";
import { MatchesTab } from "./MatchesTab";
import { SettingsTab } from "./SettingsTab";
import { colors, radii } from "../theme";
import type { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;
type Tab = "discover" | "matches" | "messages" | "alerts" | "settings";

const tabs: { id: Tab; label: string }[] = [
  { id: "discover", label: "Discover" },
  { id: "matches", label: "Matches" },
  { id: "messages", label: "Messages" },
  { id: "alerts", label: "Alerts" },
  { id: "settings", label: "Settings" },
];

export function HomeScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>("discover");
  const openChat = (userId: string) => navigation.navigate("Conversation", { userId });
  return (
    <Screen>
      <View style={styles.top}>
        <Brand compact />
        <View style={styles.member}>
          <Text style={styles.memberText}>{profile?.membership.isPremium ? "Premium" : "Free"}</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {tabs.map((item) => (
          <Pressable key={item.id} onPress={() => setTab(item.id)} style={[styles.tab, tab === item.id && styles.tabOn]}>
            <Text style={[styles.tabText, tab === item.id && styles.tabTextOn]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.content}>
        {tab === "discover" ? <DiscoverTab onOpen={(userId) => navigation.navigate("ProfileDetails", { userId })} /> : null}
        {tab === "matches" ? <MatchesTab onChat={openChat} onPlans={() => navigation.navigate("Plans")} /> : null}
        {tab === "messages" ? <ChatsTab onOpen={openChat} /> : null}
        {tab === "alerts" ? <AlertsTab onPlans={() => navigation.navigate("Plans")} /> : null}
        {tab === "settings" ? <SettingsTab onPlans={() => navigation.navigate("Plans")} onAccount={() => navigation.navigate("AccountSettings")} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  member: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: colors.purpleSoft },
  memberText: { color: colors.purpleDark, fontSize: 10, fontWeight: "900" },
  tabs: { gap: 7, paddingVertical: 18 },
  tab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  tabOn: { backgroundColor: colors.pink, borderColor: colors.pink },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  tabTextOn: { color: colors.white },
  content: { paddingBottom: 20 },
});
