# MatchNest

MatchNest is a dating and marriage web app with two paths: Dating and Marriage.

The repository now also contains a native React Native/Expo app in `mobile/`
for Android and iPhone. It reuses the same Supabase authentication, database,
security functions, and MatchNest branding. See `mobile/README.md` for setup.

## Current production stack

- React, Vite, and React Router
- Supabase Authentication
- Supabase Postgres with Row Level Security
- Supabase-backed secure chat with server-side message access controls
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
4. `supabase/account_lifecycle.sql`
5. `supabase/freemium_access.sql`

The Phase 1 migration is required. It separates private account data, enforces
18+ access, protects matching and chat actions with database functions, and
makes profile photos private. It is additive and preserves existing accounts.

The account lifecycle migration adds reversible deactivation. Deploy the
authenticated account-deletion function from the repository root after linking
the Supabase CLI to the production project:

```powershell
supabase functions deploy delete-account
```

The function uses Supabase's server-managed service-role environment variable;
never copy that key into the web or mobile frontend.

The freemium migration adds subscription state and enforces free-account
limits at the database boundary: browsing remains available, new connection
requests require Premium, free members may send two messages total, and only
the first incoming message in each conversation is returned unmasked. Direct
message-table reads are removed so locked text cannot be recovered from the
browser.

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

## Mobile app

The initial mobile milestone includes native signup/login, 18+ validation,
password recovery, Dating/Marriage selection, basic profile completion,
secure persistent Supabase sessions, account deactivation/reactivation, and
protected permanent account deletion.

```powershell
cd mobile
Copy-Item .env.example .env
npm install
npx expo start
```

The native app uses `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The service-role key must never be
placed in the mobile app.
