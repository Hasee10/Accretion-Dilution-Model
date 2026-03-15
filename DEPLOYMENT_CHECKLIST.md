# QuantEdge Deployment Checklist

## Security
- Rotate every exposed secret before production.
- Confirm the frontend uses only public keys and the backend holds service-role and private provider keys.
- Verify Supabase RLS on profiles, organizations, org_members, org_invitations, saved_deals, dcf_models, news_preferences, news_bookmarks, news_cache, and api_quota_log.

## Auth and Entry Flow
- Confirm `/` always opens the public introductory landing page.
- Confirm `/sign-in` and `/sign-up` are separate auth pages.
- Confirm authenticated users hitting `/sign-in` or `/sign-up` are redirected to `/dashboard`.
- Verify sign-up sends a confirmation email through Supabase.
- Verify sign-in after confirmation lands in the intended route or `/dashboard`.

## Workspace Flow
- Create a personal account.
- Confirm email and sign in.
- Create a firm workspace.
- Invite another user.
- Accept the invite and verify membership, role assignment, and current workspace selection.
- Confirm failed workspace creation does not leave orphan organizations.

## Product Verification
- Test DCF ticker import.
- Test Merger Analysis ticker import.
- Test LBO ticker import.
- Test Market News feed, preferences, bookmarks, and YouTube section.
- Test Watchlist search, add, refresh, and persistence.
- Test Deal Tasks, Team Directory, and Analyst Chat in both personal and firm contexts.

## Build and Runtime
- Run a production frontend build.
- Start the backend in production-like mode and verify imports cleanly.
- Verify environment variables are loaded correctly in both frontend and backend.
- Confirm CORS, allowed origins, and API base URLs are correct for the production domain.

## Monitoring and Operations
- Enable frontend error tracking.
- Enable backend exception logging.
- Add uptime checks for backend and public landing page.
- Verify email delivery and external API quotas for market data, news, YouTube, and AI providers.
