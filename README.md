# MatchNest

MatchNest is a dating and marriage web app with two paths: Dating and Marriage.

## Current production stack

- React, Vite, and React Router
- Supabase Authentication
- Supabase Postgres with Row Level Security
- Supabase Realtime for chat
- Supabase Storage for profile photos
- Netlify hosting

## Local setup

1. Copy `client/.env.example` to `client/.env.local`.
2. Add the Supabase publishable key to `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Start the frontend:

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

## Database setup

For a new Supabase project, run these files in the SQL Editor:

1. `supabase/schema.sql`
2. `supabase/moderation.sql`

The schema creates account profiles, connections, conversations, messages,
reports, secure access policies, realtime chat support, and photo storage.

## Production

The Netlify build uses the root `netlify.toml` file. Configure these environment
variables in Netlify:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The current application is MatchNest. The frontend no longer depends on the
old local JSON authentication service.
