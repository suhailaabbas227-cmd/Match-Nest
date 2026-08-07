import { createClient } from "@supabase/supabase-js";


// Reads the project URL + public key from environment (client/.env locally,
// Netlify env vars in production). Safe to expose — Row Level Security on the
// database is what actually protects the data.
const url = import.meta.env.VITE_SUPABASE_URL;
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;


if (!url || !key) {
  // Helpful message if the env vars are missing on a deploy.
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY"
  );
}


export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});
