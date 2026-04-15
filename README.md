# FloatDr Mobile App

## Overview

This repository contains an Expo / React Native mobile app for Float Doctor, a wellness-focused consumer app that combines:

- account creation and email-based authentication
- a members-only community forum
- subscription gating through RevenueCat
- profile management with avatar upload/cropping
- educational video content
- service booking and lab test purchase links
- lightweight admin moderation tools

The codebase appears to have been built as an MVP by a solo developer. The core user flows are present, but a number of architectural and operational details are still implicit in UI code and Supabase configuration.

## Tech Stack

- React Native `0.81`
- Expo `54`
- Expo Router
- Supabase
  - Auth
  - Postgres tables / RPCs
  - Storage buckets
- RevenueCat
- Context API for auth, theme, and membership state
- `react-native-webview` for embedded video playback
- Expo media/image packages for avatars and forum images

## Feature List

Based on the current code, the app includes:

- Email/password login, registration, password reset, and email verification
- Membership-aware routing and access control
- Home dashboard with:
  - intro video
  - forum entry point
  - lab test entry point
  - external links for consultations and supplements
- Forum with categories `Mind`, `Body`, and `Spirit`
- Members-only thread feed with:
  - pagination through a Supabase RPC
  - search by title
  - thread reactions
  - top-comment preview
  - save / report / delete actions
- Thread detail screen with:
  - nested replies
  - reply reactions
  - reporting for threads and replies
  - owner delete for replies
- Thread creation and editing, including optional image upload
- Saved posts screen for members
- Profile viewing and self-service profile editing
- Avatar crop + upload flow
- Library screen with featured and full-screen YouTube playback
- Schedule screen with external booking links
- Lab tests screen with external Stripe payment links
- Settings for:
  - dark mode
  - push notification preference
  - email notification preference
  - password change
  - account deletion
- Admin tools:
  - moderation reports
  - head-admin-only admin role management

## Folder Structure

```text
app/
  (auth)/         Auth screens: login, register, forgot password, verify email
  (dashboard)/    Main tabbed app: home, forum, library, schedule, menu
  (stack)/        Secondary flows: profile, settings, thread creation/editing, admin tools, subscription modal
  admin/          Active moderation UI plus a retired admin landing screen
  forum/          Legacy redirect routes for forum category and thread URLs
  video/          Full-screen video route

components/       Reusable UI building blocks and modal components
contexts/         Global providers for auth, membership, and theme
hooks/            Small wrappers over membership/admin state
lib/              Supabase client, RevenueCat setup, push token registration
constants/        Theme color tokens
supabase/
  migrations/     Partial SQL history for admin roles, moderation reports, and delete cascade RPC
docs/             Manual SQL snippets for RLS/policy work
assets/           Logos, service images, fonts, animation, and intro video
```

## Project Structure

- `/app` -> Expo Router screens
- `/components` -> reusable UI
- `/contexts` -> global state
- `/hooks` -> reusable logic
- `/lib` -> services (Supabase, RevenueCat)
- `/supabase` -> schema / migrations (partial)
- `/docs` -> reference SQL and legacy notes

## Navigation Structure

- Root layout: wraps the app in auth, membership, and theme providers and applies route guarding.
- `(auth)`: public auth routes.
- `(dashboard)`: main tab navigator with `home`, `forum`, `library`, `schedule`, and `menu`.
- `(stack)`: pushed screens and modal flows layered on top of the tab app.
- `forum/[slug]` and `forum/thread/[id]`: redirect legacy URLs into the current forum routes.

## Data Flow

## 1. Auth

- `contexts/SupabaseAuthContext.jsx` loads the current session on boot and listens for auth state changes.
- `app/_layout.jsx` redirects users based on auth state and email verification.
- Auth screens call Supabase directly for login, sign-up, password reset, resend verification, and password change.

## 2. Membership and Roles

- `contexts/MembershipContext.jsx` combines:
  - Supabase auth user
  - `profiles.is_admin` / `profiles.admin_role`
  - RevenueCat customer info
  - fallback lookup to `memberships.status`
- Admin routes are gated by `isAdmin`.
- Head-admin-only actions rely on Supabase RPCs such as `list_admins` and `set_admin_role`.

## 3. Theme and Settings

- `contexts/ThemeContext.jsx` reads and writes `user_settings.theme_preference`.
- `app/(stack)/settings.jsx` reads and updates `user_settings` for notification preferences and dark mode.

## 4. Forum

- The forum list uses the `get_threads_with_top_comment` RPC for paginated thread retrieval.
- Thread detail, reactions, replies, saves, and reports are handled with direct table queries from screen components.
- Thread and avatar images are uploaded from the client to Supabase Storage and then saved as public URLs.

## 5. External Integrations

- RevenueCat is configured in `lib/revenuecat.js`.
- Push token registration writes Expo push tokens to `push_tokens`.
- Some user flows open external URLs for booking, supplements, Stripe checkout, and YouTube fallback playback.

## Supabase Contract Assumed by the App

The current app code expects at least the following tables/buckets/functions to exist:

- Tables:
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
- Storage buckets:
  - `avatars`
  - `post-images`
- RPCs / SQL functions:
  - `get_threads_with_top_comment`
  - `delete_forum_thread_cascade`
  - `delete_user_account`
  - `list_admins`
  - `set_admin_role`

Not all of these are defined inside this repository, so the remote Supabase project is currently part of the app's real source of truth.

## Known Limitations

- Supabase access is mostly embedded directly in screen files instead of a dedicated service/data layer.
- The repository only contains part of the backend SQL contract; some required RPCs are not defined here.
- There are still legacy/retired routes in the app tree, which makes the active architecture harder to understand.
- Forum/business rules rely heavily on RLS and database behavior that are not fully documented in-repo.
- There is no visible automated test suite, lint script, or CI setup in `package.json`.
- Support/contact copy is inconsistent in different screens.
- Push notification registration exists in code, but app-level Expo notification configuration is not documented here.

## Codebase Notes

- The route tree contains a mix of active screens, legacy redirects, and retired placeholder screens. This is manageable, but it means route presence alone does not always indicate a production-relevant flow.
- Some logic is intentionally functional but duplicated across multiple screens, especially in the forum area. Examples include membership gating, small helper utilities, and overlapping forum interaction patterns.
- There are also older components and wrappers that appear to reflect previous iterations of the app rather than the current primary navigation flow.
- Cleanup should be done carefully and incrementally after validating route reachability, screen ownership, and any Supabase-side dependencies. For handoff purposes, it is safest to treat the current codebase as operational first and simplify second.
