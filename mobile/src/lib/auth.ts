import { supabase } from "./supabase";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

export function validateNewPassword(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return "Password must be at least " + PASSWORD_MIN_LENGTH + " characters.";
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return "Password cannot exceed " + PASSWORD_MAX_LENGTH + " characters.";
  }
  return null;
}

export function ageFromDateOfBirth(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dob = new Date(year, month - 1, day);
  if (
    Number.isNaN(dob.getTime()) ||
    dob.getFullYear() !== year ||
    dob.getMonth() !== month - 1 ||
    dob.getDate() !== day
  ) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  if (
    today.getMonth() < month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() < day)
  ) age -= 1;
  return age;
}

export async function signUp(input: {
  fullName: string;
  email: string;
  password: string;
  dateOfBirth: string;
}) {
  const age = ageFromDateOfBirth(input.dateOfBirth);
  if (age === null || age > 120) throw new Error("Enter your date of birth as YYYY-MM-DD.");
  if (age < 18) throw new Error("You must be at least 18 years old to use The Match Nest.");
  const passwordError = validateNewPassword(input.password);
  if (passwordError) throw new Error(passwordError);

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      emailRedirectTo: "thematchnest://auth/callback",
      data: {
        full_name: input.fullName.trim(),
        date_of_birth: input.dateOfBirth,
        mode: "",
      },
    },
  });
  if (error) throw new Error(error.message);
  return { needsEmailConfirmation: !data.session };
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new Error(error.message);
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: "thematchnest://reset-password" },
  );
  if (error) throw new Error(error.message);
}

export async function updatePassword(password: string) {
  const passwordError = validateNewPassword(password);
  if (passwordError) throw new Error(passwordError);
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}
