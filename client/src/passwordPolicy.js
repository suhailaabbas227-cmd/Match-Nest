export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

export function validateNewPassword(password) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return "Password must be at least " + PASSWORD_MIN_LENGTH + " characters.";
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return "Password cannot exceed " + PASSWORD_MAX_LENGTH + " characters.";
  }
  return "";
}
