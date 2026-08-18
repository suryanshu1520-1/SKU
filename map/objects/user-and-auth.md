---
type: object
status: verified 2026-08-18
universe: live
---

# Object: User & Auth (`profiles`, `bookmarks`, Supabase Auth)

## 1. What It Is
User identity, authentication state, candidate profiles, saved bookmarks, and freemium daily limit counters.

## 2. Why This Shape
- **Token Verification**: Uses Supabase Auth (`supabase.auth.getUser()`) for secure Bearer token resolution across all backend endpoints.
- **Client Security**: Implements `fetchWithAuth()` in the client to automatically inject the Bearer token and handle expiration.

## 3. Shape & Citations
- **Profile Schema**: [`supabase/migrations/20260608040907_user_foundation.sql`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/supabase/migrations/20260608040907_user_foundation.sql)
- **Client Supabase Init**: [`src/lib/supabase.ts:L1-L30`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/lib/supabase.ts#L1-L30)
- **Limit Checker**: [`server-lib/user-limits.ts:L1-L40`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/user-limits.ts#L1-L40)
- **Bookmark Handler**: [`server-lib/bookmark.ts:L1-L40`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/bookmark.ts#L1-L40)

## 4. Connected To
- **Owns**: User bookmarks, session histories, subscription tier status.
- **Joins**: `quiz_sessions`, `training_sessions`, `pending_orders`.

## 5. If You Change This
- **Hits**: [`src/App.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/App.tsx), [`src/components/Login.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Login.tsx), [`src/components/Profile.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Profile.tsx).
- **Does not hit**: Public RSS feed aggregation (`server-lib/cron/rss.ts`).

## 6. Surfaces
- **Written by**: User actions via API and auth callbacks.
- **Read by**: All authenticated client components.

## 7. See
- Source: [`src/lib/supabase.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/lib/supabase.ts)
- Doc: [`docs/database-schema.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/database-schema.md)
