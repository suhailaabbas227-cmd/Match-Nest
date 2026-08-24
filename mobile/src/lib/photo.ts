import { supabase } from "./supabase";
import { getMyProfile } from "./profile";

export async function uploadMainPhoto(asset: { uri: string; mimeType?: string | null; fileSize?: number | null }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in before uploading a photo.");
  if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) throw new Error("Photo must be smaller than 10 MB.");
  const contentType = asset.mimeType === "image/png" || asset.mimeType === "image/webp" ? asset.mimeType : "image/jpeg";
  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const path = `${auth.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const response = await fetch(asset.uri);
  const bytes = await response.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from("photos").upload(path, bytes, {
    contentType, cacheControl: "3600", upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message);
  const { data: review, error: reviewError } = await supabase.functions.invoke("moderate-photo", {
    body: { path, main: true },
  });
  if (reviewError) {
    await supabase.storage.from("photos").remove([path]);
    throw new Error("Photo safety review is unavailable. Please try again shortly.");
  }
  if (review?.status !== "approved") {
    return { status: review?.status || "pending", reason: review?.reason || "Your photo is waiting for safety review.", profile: null };
  }
  const { data, error } = await supabase.rpc("update_my_photos", { main_photo: path, gallery_photos: [] });
  if (error) throw new Error(error.message);
  return { status: "approved", reason: "Photo approved.", profile: data };
}

export async function refreshPhotoStatus() {
  return getMyProfile();
}
