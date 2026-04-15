# Next Steps

## High Priority

- Remove hardcoded Supabase fallback credentials from `lib/supabase.js`.
  - Production apps should not silently fall back to a live project URL/key when env vars are missing.

- Finalize RevenueCat integration and subscription flow.
  - Verify that iOS and Android API keys are correctly configured in environment variables.
  - Ensure that the entitlement ID matches `EXPO_PUBLIC_REVENUECAT_ACTIVE_ENTITLEMENT_ID`.
  - Validate that subscription status is correctly reflected in the app and synced with the `memberships` table.
  - Test purchase, restore purchase, and entitlement expiration flows on both platforms.
  - Confirm fallback logic between RevenueCat and Supabase membership state behaves as expected.
  - Review UI/UX for subscription modal and ensure consistent gating across features.

- Document RevenueCat setup more explicitly.
  - Include product IDs, entitlement mapping, and expected subscription tiers.
  - Ensure incoming developers can fully reproduce subscription behavior without relying on external knowledge.

- Document and migrate the full database contract into source control.
  - The app depends on RPCs such as `get_threads_with_top_comment` and `delete_user_account`, but their SQL is not present in this repo.
  - Incoming developers will otherwise be blocked by hidden backend state.

- Review and validate all RLS/storage policies against current client behavior.
  - Forum creation, editing, deleting, saving, moderation, settings, storage upload, and admin actions all assume specific policies that are not fully captured in-repo.

- Unify moderation deletion behavior.
  - Most thread deletion uses `delete_forum_thread_cascade`, but `app/admin/ManageReports.jsx` deletes `forum_threads` and `forum_replies` directly.
  - This should be aligned with one backend-safe moderation path.

- Fix or remove legacy screens that still point at the old data model.
  - `app/(stack)/profileDetails.jsx` still uses the old `forums` table and a mismatched `/saveforum` route.

- Add missing server/client validation parity for forum posting.
  - `editThread` enforces title/body limits, but `createThread` currently does not enforce the same limits in the UI.

- Remove raw storage error payloads from user-facing alerts in thread creation.
  - The current upload failure path shows serialized storage error details directly to end users.

## Medium Priority

- Introduce a thin data-access layer for Supabase calls.
  - Most screens query Supabase directly, which makes reuse, testing, and permission changes harder.

- Consolidate forum logic.
  - Thread list, thread detail, saved posts, and older `ForumList` component overlap in responsibility and contain repeated membership gating patterns.

- Clean up route and screen ownership.
  - The app contains both active and retired screens in the route tree, which makes handoff harder than necessary.

- Add linting, formatting, and automated test coverage.
  - There are no visible `lint`, `test`, or CI scripts in the current repo.

- Centralize app copy and support metadata.
  - Support email addresses differ between screens, and some membership copy does not fully match current gated features.

- Revisit push notification implementation end to end.
  - Token registration exists, but full Expo notification app configuration and runtime handling are not present in the repo.

## Low Priority

- Replace placeholder or "coming soon" interactions with real flows or hide them.
  - Examples include parts of `profileDetails` and the extra-library placeholder copy.

- Improve empty/error states for network-dependent screens.
  - Several screens fall back to generic alerts rather than recoverable inline states.

- Standardize back navigation behavior.
  - Some screens use `router.back()` while others force `router.replace(...)`, which can feel inconsistent.

- Review information architecture for account/profile screens.
  - `userProfile`, `profileDetails`, `editProfile`, and `menu` overlap conceptually.

- Add product-level documentation for moderation policy and admin operations.
  - The code supports reporting and admin roles, but not the expected moderation workflow or operational rules.

## Code Cleanup Opportunities

### Likely Safe to Remove (after verification)

- Retired legacy admin/dashboard placeholder screens.
  - This includes screens such as `app/admin/AdminDashboard.jsx` and `app/(stack)/postList.jsx`, which currently read as intentionally retired and do not appear to be part of the active user flow.

- Unused older forum list implementation.
  - `components/ForumList.jsx` appears to be an older forum implementation that overlaps with the active dashboard forum screen.

- Unused hooks tied to older forum flow.
  - `hooks/useMembershipStatus.js` currently appears to exist primarily in support of the older `ForumList` implementation.

### Legacy or Unreachable Screens

- `app/(stack)/profileDetails.jsx`
  - This screen still references the older `forums` schema and a mismatched route target, which makes it a strong legacy candidate.

- `app/(stack)/subscription.jsx`
  - This route may be unused in the active app flow because current screens generally open the shared subscription modal directly.

### Duplicate Logic to Consolidate

- Repeated `timeAgo` helpers across multiple screens.
  - The same small formatting logic appears in forum, saved-post, and profile-related screens.

- Repeated membership gating patterns.
  - Forum-adjacent screens implement similar "members only" modal/state handling independently instead of sharing a common gate abstraction.

- Repeated Supabase/RLS error handling helpers.
  - Similar permission-denied helpers appear in multiple files and could be standardized.

- Forum logic split across multiple screens and older components.
  - Thread list, thread detail, saved posts, and older forum-related components contain overlapping responsibilities and interaction patterns.

### Important Constraints

- Do not remove code purely because it appears unused; verify navigation reachability, route registration, and any indirect dependencies first.

- Prefer gradual cleanup over bulk deletion.
  - For this codebase, safe handoff favors small verified removals and consolidation steps rather than an aggressive cleanup pass.
