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

For a new Supabase project, run these files in the SQL Editor in this order
before connecting the public frontend:

1. `supabase/schema.sql`
2. `supabase/moderation.sql`
3. `supabase/phase1_security.sql`

The Phase 1 migration is required. It separates private account data, enforces
18+ access, protects matching and chat actions with database functions, and
makes profile photos private. It is additive and preserves existing accounts.

Existing accounts that did not previously save a date of birth are sent to a
one-time private age-confirmation screen.

## Required production controls

Before public launch, configure these settings in Supabase:

- Require email confirmation.
- Configure a custom SMTP provider and branded sender domain.
- Enable CAPTCHA for signup, login, and password reset.
- Enable leaked-password protection and MFA for project administrators.
- Upgrade to a paid plan with backups before accepting real customer data.

Do not place a Supabase service-role key, SMTP password, payment key, or any
other secret in `client/` or in a `VITE_` environment variable.

## Production

The Netlify build uses the root `netlify.toml` file. Configure these environment
variables in Netlify:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The current application is MatchNest. The frontend no longer depends on the
old local JSON authentication service.
