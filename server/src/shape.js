// Helpers that decide what user data is exposed to the client.

// The full account object minus secrets — returned to the owner.
export function selfView(u) {
  if (!u) return null;
  const { password, otp, otpExpires, ...rest } = u;
  return rest;
}

// What another user sees when browsing. Respects photo-blur privacy:
// in marriage mode, photos are blurred until the two users are matched.
export function publicView(u, { matched = false } = {}) {
  if (!u) return null;
  const {
    password, otp, otpExpires, email, phone,
    blockedUsers, wali, fatherName, motherBackground,
    ...rest
  } = u;

  const blurPhotos = u.mode === "marriage" && u.photoPrivacy && !matched;
  return {
    ...rest,
    photosBlurred: blurPhotos,
    photos: blurPhotos ? [] : rest.photos || [],
    profilePhoto: blurPhotos ? null : rest.profilePhoto || null,
    // Wali/family contact only revealed once matched (marriage mode).
    wali: matched ? wali : undefined,
  };
}
