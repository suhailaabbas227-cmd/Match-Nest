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
  badge?: boolean;
  profilePhoto?: string | null;
  photos?: string[];
  photoPrivacy?: boolean;
  membership: Membership;
};

export type PublicProfile = {
  id: string;
  fullName: string;
  gender: string;
  country: string;
  city: string;
  mode: MatchMode | null;
  profile: Record<string, any>;
  profilePhoto: string | null;
  photos: string[];
  verified: boolean;
  badge: boolean;
  photosBlurred: boolean;
  matchScore?: number;
  matchReasons?: string[];
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  from: string;
  fromName?: string;
  text: string | null;
  locked: boolean;
  createdAt: string;
};

export type ConversationSummary = {
  id: string;
  user: PublicProfile;
  lastMessage: string | null;
  lastAt: string;
};

export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  actor_id?: string | null;
  actor_name?: string | null;
  locked?: boolean;
  read_at?: string | null;
  created_at: string;
};

export type RootStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  Home: undefined;
  ProfileDetails: { userId: string };
  Conversation: { userId: string };
  Plans: undefined;
  AccountSettings: undefined;
};
