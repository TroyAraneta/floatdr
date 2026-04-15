# Build and Run Guide

## Prerequisites

- Node.js and npm
- Expo CLI via `npx expo`
- Android Studio and/or Xcode if you plan to build native binaries
- Access to the project's Supabase instance
- Access to the project's RevenueCat project if subscriptions are required

## Install

```bash
npm install
```

## Environment Variables

Create a local `.env` file using `.env.example` as the template.

Required variables:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=
EXPO_PUBLIC_REVENUECAT_ACTIVE_ENTITLEMENT_ID=
```

These values are read in `app.config.js` and exposed through `Constants.expoConfig.extra`.

## Supabase Setup Assumptions

The app expects a Supabase project with:

- email/password auth enabled
- email confirmation enabled
- public/protected table policies that support the current client-side queries
- storage buckets:
  - `avatars`
  - `post-images`
- tables used by the app:
  - `profiles`
  - `memberships`
  - `user_settings`
  - `forum_categories`
  - `forum_threads`
  - `forum_replies`
  - `thread_reactions`
  - `reply_reactions`
  - `saved_threads`
  - `moderation_reports`
  - `push_tokens`

The repo includes migrations for:

- admin role support
- `delete_forum_thread_cascade`
- `moderation_reports.reply_id`

The repo does **not** include SQL definitions for every RPC the app calls. At minimum, the following still need to exist in the target database:

- `get_threads_with_top_comment`
- `delete_user_account`

## RevenueCat Setup Assumptions

The app expects:

- a valid iOS API key
- a valid Android API key
- an entitlement ID matching `EXPO_PUBLIC_REVENUECAT_ACTIVE_ENTITLEMENT_ID`

Membership state is derived from RevenueCat first, then falls back to the `memberships` table.

## Run the App

Start Expo:

```bash
npx expo start
```

Useful commands from `package.json`:

```bash
npm run start
npm run android
npm run ios
npm run web
```

## Native Build Notes

- `eas.json` includes `development`, `preview`, and `production` build profiles.
- Expo Router, Expo Video, and Expo Font are configured in `app.json`.
- If push notifications are intended to ship, Expo notification plugin/config verification still needs to be completed because the app registers push tokens in code but notification-specific Expo setup is not captured here.

## Recommended First Verification After Setup

After wiring env vars and Supabase, verify these flows in order:

1. Register a user and confirm email verification flow.
2. Log in and confirm routing to the dashboard.
3. Load the forum as a member.
4. Create a thread with and without an image.
5. Open a thread, react, reply, save, and report it.
6. Edit profile and upload/crop an avatar.
7. Open the subscription modal and verify RevenueCat configuration.
8. Confirm admin report management and admin-role management with seeded admin users.

## Additional Notes

- Some backend behavior depends on Supabase RPCs that are required by the app but not fully documented in this repository.
- Before making structural changes, verify that the target Supabase project contains the expected SQL functions and that RLS/storage policies still match the current client-side access patterns.
