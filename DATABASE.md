# Database Guide

## Overview

This app uses Supabase (Postgres + Auth + Storage) as its backend for:

- authentication
- relational data storage
- file storage for user-generated media
- access control through Row Level Security (RLS)

The database is a core part of the system. In practice, some business rules are enforced in SQL, RLS policies, and helper functions rather than in the React Native codebase alone. As a result, the live Supabase project is part of the application's operational source of truth.

## Confirmed App Usage

Based on the current repository, the app directly references the following areas of the database:

- Auth
  - Supabase email/password authentication
- Public schema tables
  - `profiles`
  - `forum_categories`
  - `forum_threads`
  - `forum_replies`
  - `thread_reactions`
  - `reply_reactions`
  - `saved_threads`
  - `moderation_reports`
  - `user_settings`
  - `memberships`
  - `push_tokens`
- Storage buckets
  - `avatars`
  - `post-images`
- RPCs / SQL functions
  - `get_threads_with_top_comment`
  - `delete_forum_thread_cascade`
  - `delete_user_account`
  - `list_admins`
  - `set_admin_role`

## Known or Expected Database Objects

The following objects were included in prior project notes but are not clearly referenced by the active app code in this repository:

- `forum_reports`
- `subscriptions`
- helper functions such as `is_member()` and `is_admin()`

These may still exist in the live Supabase project and may still influence RLS behavior or historical data flows. They should be verified directly in Supabase before any cleanup or schema changes are made.

## Tables

The active app appears to rely on these public tables:

- `profiles`
- `forum_categories`
- `forum_threads`
- `forum_replies`
- `thread_reactions`
- `reply_reactions`
- `saved_threads`
- `moderation_reports`
- `user_settings`
- `memberships`
- `push_tokens`

Additional tables that may exist in the live project and should be verified:

- `forum_reports` (legacy candidate)
- `subscriptions`

## Storage Buckets

### `avatars`

- Stores user profile images
- Current client code uploads files using a user-owned path such as `user_id/avatar.jpg`
- Public URLs are used for rendering profile images in the app

### `post-images`

- Stores images attached to forum threads
- Current client code uploads images into a thread-specific path
- Public URLs are used when rendering forum posts

## Access Control (RLS)

The app is strongly coupled to RLS and policy behavior. Client code assumes that the database enforces who can read, create, update, and delete content.

### Key Patterns

### Membership-Based Access

Forum access appears to depend on membership/admin checks. In the client, this is modeled through:

- RevenueCat membership status
- fallback lookup to `memberships.status`
- admin role checks from `profiles`

Project notes also reference helper functions such as `is_member(auth.uid())` and `is_admin(auth.uid())`. These functions are not defined in this repository, so they should be confirmed in the live Supabase project before relying on them.

### Ownership Rules

The client assumes users can only modify their own records in several areas:

- threads via `author_id = auth.uid()`
- replies via `author_id = auth.uid()`
- reactions via `user_id = auth.uid()`
- settings via `user_id = auth.uid()`
- saved threads via `user_id = auth.uid()`

This ownership model should be reflected in both table policies and storage policies.

### Admin Privileges

Admin and head-admin behavior appears to be enforced through:

- `profiles.is_admin`
- `profiles.admin_role`
- Supabase RPCs such as `list_admins` and `set_admin_role`

Current admin capabilities in the app include:

- reading moderation reports
- deleting reported content
- managing admin roles
- bypassing some member-only restrictions

## Storage Policies

### `avatars`

Expected behavior:

- users can upload/update/delete only their own avatar files
- public read access is enabled so avatars can render throughout the app

### `post-images`

Expected behavior:

- authenticated users can upload images only for threads they own
- public read access is enabled so thread images can render in feeds and detail views

The repository includes a manual SQL policy snippet in [docs/rls_edit_thread_policies.sql](/d:/dev/floatdr/docs/rls_edit_thread_policies.sql) that reflects this direction, but it should not be treated as a complete picture of the live storage policy set.

## Moderation System

The active moderation flow uses:

- `moderation_reports`
- admin review UI in the app
- deletion paths for reported threads and replies

There are also signals of legacy moderation/history in project notes:

- `forum_reports` is likely an older reporting table if it still exists

This should be verified directly in Supabase before removing or merging moderation tables.

## Important Notes

- Several database behaviors assumed by the app are not fully documented in this repository.
- Some critical helper functions and RPCs are not defined here even though the client depends on them.
- RLS and storage policies are part of the practical backend contract and should be reviewed before any frontend refactor that changes access patterns.
- The database schema, RLS policies, and RPCs should be treated as part of the handoff package, even when they are not yet fully versioned in source control.

## Known Considerations

- The live Supabase project likely contains more backend logic than this repository currently documents.
- Some moderation behavior is mixed between RPC-driven deletes and direct table deletes.
- Frontend assumptions are tightly coupled to backend authorization behavior.
- Legacy tables or helper functions may still exist even if they are not part of the active UI flow.

## Recommendation for Incoming Developers

Before making structural changes to the database or forum flows:

1. Review all active RLS policies.
2. Inspect helper functions such as `is_member()` and `is_admin()` if they exist in the target Supabase project.
3. Validate all RPCs used by the app, especially `get_threads_with_top_comment`, `delete_user_account`, `delete_forum_thread_cascade`, `list_admins`, and `set_admin_role`.
4. Confirm storage bucket policies for `avatars` and `post-images`.
5. Align any backend changes with the implementation notes in [NEXT_STEPS.md](/d:/dev/floatdr/NEXT_STEPS.md).

## Summary

This database supports a membership-aware forum application with user profiles, media uploads, moderation, and admin role management. It is functional, but part of its behavior currently lives outside this repository in the configured Supabase project, so safe handoff depends on validating both code and backend configuration together.
