import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Brand } from "../components/Brand";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { colors, radii, shadow } from "../theme";
import type { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Plans">;

const plans = [
  { id: "silver", name: "Silver", months: 1, copy: "A flexible monthly start." },
  { id: "golden", name: "Golden", months: 3, copy: "More time to build genuine connections.", badge: "Popular" },
  { id: "platinum", name: "Platinum", months: 6, copy: "Created for a serious partner search." },
  { id: "diamond", name: "Diamond", months: 12, copy: "Our longest plan and best long-term value.", badge: "Best value" },
] as const;

export function SubscriptionPlansScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Screen>
      <Brand compact />
      <Text style={styles.eyebrow}>MATCHNEST PREMIUM</Text>
      <Text style={styles.title}>Choose the plan that fits your journey</Text>
      <Text style={styles.subtitle}>Premium supports both Dating and Marriage modes.</Text>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Payment setup is being finalized</Text>
        <Text style={styles.noticeCopy}>
          Prices and payment methods will be shown before payments go live. No charge will be made today.
        </Text>
      </View>

      <View style={styles.list}>
        {plans.map((plan) => {
          const active = selected === plan.id;
          return (
            <View key={plan.id} style={[styles.card, active && styles.cardActive]}>
              <View style={styles.cardTop}>
                <View style={styles.icon}><Text style={styles.iconText}>{plan.id === "diamond" ? "◇" : "♡"}</Text></View>
                {plan.badge ? <Text style={styles.badge}>{plan.badge}</Text> : null}
              </View>
              <Text style={styles.planName}>{plan.name}</Text>
              <View style={styles.durationRow}>
                <Text style={styles.duration}>{plan.months}</Text>
                <Text style={styles.months}>{plan.months === 1 ? "Month" : "Months"}</Text>
              </View>
              <Text style={styles.planCopy}>{plan.copy}</Text>
              <Text style={styles.pricePending}>Price to be added</Text>
              <Button
                label={active ? "Selected" : `Select ${plan.name}`}
                onPress={() => setSelected(plan.id)}
                variant={active ? "secondary" : "primary"}
                style={styles.selectButton}
              />
            </View>
          );
        })}
      </View>

      {selected ? (
        <View style={styles.selectedNotice}>
          <Text style={styles.selectedTitle}>Plan selected</Text>
          <Text style={styles.selectedCopy}>Payment will be available after MatchNest payment setup is connected.</Text>
        </View>
      ) : null}

      <Button label="Back to home" variant="ghost" onPress={() => navigation.goBack()} style={styles.back} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: 30, color: colors.pink, fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  title: { marginTop: 8, color: colors.text, fontSize: 31, lineHeight: 37, fontWeight: "900", letterSpacing: -0.7 },
  subtitle: { marginTop: 9, color: colors.muted, fontSize: 15, lineHeight: 22 },
  notice: { marginTop: 22, padding: 16, borderRadius: radii.medium, borderWidth: 1, borderColor: "#E7CFF7", backgroundColor: colors.purpleSoft },
  noticeTitle: { color: colors.purpleDark, fontWeight: "900" },
  noticeCopy: { marginTop: 5, color: colors.muted, fontSize: 13, lineHeight: 19 },
  list: { marginTop: 18, gap: 14 },
  card: { padding: 20, borderRadius: radii.large, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadow },
  cardActive: { borderWidth: 2, borderColor: colors.purple },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  icon: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.pink },
  iconText: { color: colors.white, fontSize: 24 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, overflow: "hidden", borderRadius: radii.pill, color: colors.white, backgroundColor: colors.purple, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  planName: { marginTop: 16, color: colors.text, fontSize: 22, fontWeight: "900" },
  durationRow: { flexDirection: "row", alignItems: "baseline", gap: 7, marginTop: 5 },
  duration: { color: colors.purple, fontSize: 42, fontWeight: "900" },
  months: { color: colors.muted, fontWeight: "800" },
  planCopy: { marginTop: 8, color: colors.muted, fontSize: 13, lineHeight: 19 },
  pricePending: { marginTop: 15, padding: 10, overflow: "hidden", borderRadius: radii.small, color: colors.purpleDark, backgroundColor: colors.purpleSoft, textAlign: "center", fontSize: 12, fontWeight: "800" },
  selectButton: { marginTop: 12 },
  selectedNotice: { marginTop: 18, padding: 17, borderRadius: radii.medium, backgroundColor: colors.pink },
  selectedTitle: { color: colors.white, fontSize: 16, fontWeight: "900" },
  selectedCopy: { marginTop: 4, color: colors.white, fontSize: 13, lineHeight: 19, opacity: .9 },
  back: { marginTop: 18 },
});
