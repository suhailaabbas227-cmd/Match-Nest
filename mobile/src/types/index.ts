export type MatchMode = "dating" | "marriage";

export type Membership = {
  isPremium: boolean;
  status: "free" | "active" | "inactive" | "expired" | "cancelled";
  plan: "silver" | "gold" | "platinum" | "diamond" | null;
  freeMessagesSent: number;
  freeMessagesRemaining: number | null;
};

export type Profile = {
  id: string;
  email: string;
  fullName: string;
  dateOfBirth: string;
  mode: MatchMode | null;
  gender: string;
  country: string;
  city: string;
  profile: Record<string, unknown>;
  profileComplete: boolean;
  suspended: boolean;
  deactivatedAt: string;
  verified: boolean;
  membership: Membership;
};

export type RootStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  Home: undefined;
  Plans: undefined;
  AccountSettings: undefined;
};
