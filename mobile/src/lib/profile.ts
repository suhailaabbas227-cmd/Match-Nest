import { supabase } from "./supabase";
import type { MatchMode, Profile } from "../types";

type ProfileRow = Record<string, any>;

export function mapProfile(row: ProfileRow | null, fallbackEmail = ""): Profile | null {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email || fallbackEmail,
    fullName: row.full_name || "",
    dateOfBirth: row.date_of_birth || "",
    mode: row.mode || null,
    gender: row.gender || "",
    city: row.city || "",
    profile: row.profile || {},
    profileComplete: row.profile_complete ?? false,
    suspended: row.suspended ?? false,
    deactivatedAt: row.deactivated_at || "",
    verified: row.verified ?? false,
  };
}

export async function getMyProfile(): Promise<Profile | null> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data, error } = await supabase.rpc("get_my_profile");
  if (error) throw new Error(error.message);

  if (!data) {
    return {
      id: authData.user.id,
      email: authData.user.email || "",
      fullName: "",
      dateOfBirth: "",
      mode: null,
      gender: "",
      city: "",
      profile: {},
      profileComplete: false,
      suspended: false,
      deactivatedAt: "",
      verified: false,
    };
  }

  return mapProfile(data, authData.user.email || "");
}

export async function confirmDateOfBirth(dateOfBirth: string) {
  const { data, error } = await supabase.rpc("confirm_my_date_of_birth", {
    requested_dob: dateOfBirth,
  });
  if (error) throw new Error(error.message);
  return mapProfile(data);
}

export async function setProfileMode(mode: MatchMode) {
  const { data, error } = await supabase.rpc("set_profile_mode", {
    requested_mode: mode,
  });
  if (error) throw new Error(error.message);
  return mapProfile(data);
}

export async function completeBasicProfile(input: {
  gender: string;
  city: string;
  bio: string;
  occupation: string;
  photoPrivacy: boolean;
}) {
  const { data, error } = await supabase.rpc("update_my_profile", {
    profile_data: {
      gender: input.gender,
      city: input.city,
      bio: input.bio,
      occupation: input.occupation,
    },
    requested_photo_privacy: input.photoPrivacy,
  });
  if (error) throw new Error(error.message);
  return mapProfile(data);
}
