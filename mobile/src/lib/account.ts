import { supabase } from "./supabase";
import { mapProfile } from "./profile";

export async function deactivateMyAccount() {
  const { data, error } = await supabase.rpc("deactivate_my_account");
  if (error) throw new Error(error.message);
  return mapProfile(data);
}

export async function reactivateMyAccount() {
  const { data, error } = await supabase.rpc("reactivate_my_account");
  if (error) throw new Error(error.message);
  return mapProfile(data);
}

export async function permanentlyDeleteMyAccount() {
  const { data, error } = await supabase.functions.invoke<{ deleted?: boolean; error?: string }>(
    "delete-account",
    { body: { confirmation: "DELETE" } },
  );

  if (error) throw new Error(error.message || "Could not delete the account.");
  if (!data?.deleted) throw new Error(data?.error || "Could not delete the account.");
}
