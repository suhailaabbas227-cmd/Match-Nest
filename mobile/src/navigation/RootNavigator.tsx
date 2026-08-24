import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { AccountSettingsScreen } from "../screens/AccountSettingsScreen";
import { AgeCheckScreen } from "../screens/AgeCheckScreen";
import { DeactivatedScreen } from "../screens/DeactivatedScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LoadingScreen } from "../screens/LoadingScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { ModeSelectScreen } from "../screens/ModeSelectScreen";
import { ProfileSetupScreen } from "../screens/ProfileSetupScreen";
import { ResetPasswordScreen } from "../screens/ResetPasswordScreen";
import { SignUpScreen } from "../screens/SignUpScreen";
import { SuspendedScreen } from "../screens/SuspendedScreen";
import { SubscriptionPlansScreen } from "../screens/SubscriptionPlansScreen";
import { ProfileDetailsScreen } from "../screens/ProfileDetailsScreen";
import { ConversationScreen } from "../screens/ConversationScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import type { RootStackParamList } from "../types";
import { colors } from "../theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

function PublicNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Welcome">
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function MemberNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ProfileDetails" component={ProfileDetailsScreen} />
      <Stack.Screen name="Conversation" component={ConversationScreen} />
      <Stack.Screen name="Plans" component={SubscriptionPlansScreen} />
      <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  const { session, profile, loading, recoveryMode } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: colors.pink,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.purple,
        },
        fonts: {
          regular: { fontFamily: "System", fontWeight: "400" },
          medium: { fontFamily: "System", fontWeight: "500" },
          bold: { fontFamily: "System", fontWeight: "700" },
          heavy: { fontFamily: "System", fontWeight: "900" },
        },
      }}
    >
      {recoveryMode ? <ResetPasswordScreen /> : null}
      {!recoveryMode && !session ? <PublicNavigator /> : null}
      {!recoveryMode && session && profile?.suspended ? <SuspendedScreen /> : null}
      {!recoveryMode && session && !profile?.suspended && profile?.deactivatedAt ? <DeactivatedScreen /> : null}
      {!recoveryMode && session && !profile?.suspended && !profile?.deactivatedAt && !profile?.dateOfBirth ? <AgeCheckScreen /> : null}
      {!recoveryMode && session && !profile?.suspended && !profile?.deactivatedAt && profile?.dateOfBirth && !profile.mode ? <ModeSelectScreen /> : null}
      {!recoveryMode && session && !profile?.suspended && !profile?.deactivatedAt && profile?.dateOfBirth && profile.mode && !profile.profileComplete ? <ProfileSetupScreen /> : null}
      {!recoveryMode && session && !profile?.suspended && !profile?.deactivatedAt && profile?.dateOfBirth && profile.mode && profile.profileComplete ? <MemberNavigator /> : null}
    </NavigationContainer>
  );
}
