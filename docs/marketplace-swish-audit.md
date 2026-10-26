# Marketplace-Swish audit — 2026-09-07

## Existing architecture

- Frontend: Next.js 16.3 App Router, React 19, TypeScript, Tailwind. Public pages use server `fetch` with Next revalidation; interactive pages use client components and local state.
- API: `frontend/lib/api/client.ts` is the shared authenticated REST client. It attaches the stored Bearer token and clears auth state on 401/403.
- Authentication: JWT and user identity are stored in browser local storage and exposed through `useAuth`; `umx:auth-change` signals login/logout changes.
- State: there is no global query/cache library. Cart is a mutation-driven React context with optimistic quantity/remove updates.
- Backend: Express + Prisma/PostgreSQL. Existing models cover orders, cart, notifications, wishlist, promotions, store configuration/draft, seller verification, and admin data.

## Existing synchronization and caching

- Server-rendered public categories/products/stores use Next fetch revalidation (60–300 seconds).
- Client marketplace pages fetch on navigation/filter changes and do not have data polling.
- The dashboard notification page had a 30-second unread-count interval; it is now a Swish notification resource.
- The admin dashboard had a 30-second overview interval; it is now a Swish admin-overview resource.
- The StoreStudio debounce and StoreAvailabilityBadge clock interval are UI/editor/time calculations, not data synchronization, and are intentionally retained.

## Backend capability findings

- Health endpoints exist at `/health` and `/api/health/db`; neither reports capacity, recommended poll floors, nor realtime availability.
- The rate-limit middleware returns a JSON `retryAfter` value on 429, but does not currently add an HTTP `Retry-After` header.
- An authenticated WebSocket transport is now available at `/ws`. It validates the existing JWT during the upgrade and emits only to the authenticated user or role. Swish reconnects with bounded exponential backoff and revalidates only the event's resource. REST adaptive polling remains the resilient fallback.
- API responses do not currently provide ETag/Last-Modified conditional-request support.

## Initial implementation decisions

- Swish uses the existing REST client through callers' existing API functions; it does not create a second API client.
- A single browser provider owns cache entries, deduplicated requests, cancellation, a priority-aware scheduler, jitter, backoff, visibility/network handling, and protected-cache identity isolation.
- Resource policies are centralized in `frontend/lib/swish/registry.ts`; pages name resources instead of owning refresh intervals.
- Migrated consumers: admin overview activity, seller dashboard, seller notification unread count, follower data, cart, buyer orders and order detail, marketplace explore, products, and stores. Further migrations should use the same `useSwishResource` hook and preserve StoreStudio draft isolation.
