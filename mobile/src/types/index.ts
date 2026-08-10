export type MatchMode = "dating" | "marriage";

export type Profile = {
  id: string;
  email: string;
  fullName: string;
  dateOfBirth: string;
  mode: MatchMode | null;
  gender: string;
  city: string;
  profile: Record<string, unknown>;
  profileComplete: boolean;
  suspended: boolean;
  deactivatedAt: string;
  verified: boolean;
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
