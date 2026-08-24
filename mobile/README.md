# The Match Nest mobile app

This directory contains the native Android and iOS The Match Nest application built
with React Native and Expo. It connects to the same secured Supabase project as
the existing web client.

## Implemented mobile flow

- Native The Match Nest welcome screen
- Email signup and login
- Private 18+ date-of-birth validation
- Email verification state
- Password reset deep link handling
- Dating or Marriage selection
- Basic profile completion
- Safety-reviewed main profile photo upload
- Discover profiles with transparent compatibility reasons
- Incoming, outgoing and accepted connections
- Premium-aware messaging with locked free-tier messages
- In-app activity notifications
- Report and block member controls
- Membership plans with localized display currencies
- Public Terms, Privacy and account-deletion links on `thematchnest.com`
- Persistent Supabase sessions using device storage
- Suspended-account protection
- Email password reset from login and account settings
- Reversible account deactivation and reactivation
- Confirmed permanent account deletion through a protected Edge Function
- Android and iOS application identifiers

## Local setup

1. Copy `.env.example` to `.env`.
2. Replace the placeholder with the Supabase publishable key.
3. Install packages and start Expo:

```powershell
cd mobile
npm install
npx expo start
```

Install Expo Go on an Android or iPhone and scan the QR code. Android Studio
and Xcode are not required for the first device test.

## Supabase redirect URLs

Add these allowed redirect URLs in Supabase Authentication settings before
testing email confirmation and password recovery:

- `thematchnest://auth/callback`
- `thematchnest://reset-password`

Never add the Supabase service-role key to this directory. Only the public
publishable key belongs in `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

For an EAS production build, add both `EXPO_PUBLIC_` values to the EAS
production environment before running the build. Authentication redirect URLs
must also be allowed in Supabase.

## Account lifecycle backend

Before testing account settings, run `supabase/account_lifecycle.sql` after the
Phase 1 security migration and deploy the `delete-account` Edge Function:

```powershell
supabase functions deploy delete-account
```

Deactivation immediately hides the profile and pauses matching and messaging.
Permanent deletion requires the member to type `DELETE`; the server function
then removes their photos, participant conversations, reports, Auth user, and
all database rows that cascade from their profile.

## Store builds

The `app.json` application IDs are currently:

- Android: `com.thematchnest.app`
- iOS: `com.thematchnest.app`

These must be confirmed before the first Play Store or App Store release,
because changing an application ID after publishing creates a different app.

Generate a Play Store App Bundle with:

```powershell
npx eas-cli build --platform android --profile production
```
