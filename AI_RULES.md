# AI Rules for Glowbook

## Product identity
- The product is called **Glowbook**.
- The local repo/folder is named `outfit-builder`. Do not rename it unless explicitly approved.
- Do not rename package, database tables, routes, or internal identifiers unless explicitly approved.
- If any user-facing text still says "outfit-builder", suggest changing it to Glowbook — but do not change it without approval.
- Internal table names (`wishlist_items`, `outfits`, `outfit_slots`) are intentional — keep them.

## Scope
- MVP is wardrobe-only: saving fashion wishlist links and building visual outfit cards.
- Do **not** build beauty-specific features unless explicitly asked.
- Do not add features beyond what is requested. No speculative abstractions.

## Security rules
- Never commit `.env.local` (it is covered by `.gitignore` via `.env*`).
- Never print real secrets (URLs, keys) into chat unless absolutely necessary.
- Never put `service_role` keys in browser code or `.env.local`.
- Do not disable RLS on any user-owned table.
- Do not make the `item-images` storage bucket public.
- Do not store signed URLs in the database — they are temporary.
- Store uploaded image **storage paths** in the database; generate signed URLs at display time.
- Scraped retailer image URLs (stored in `image_url` when `image_source = 'scraped_url'`) can be displayed directly.

## Supabase conventions
- Auth: Supabase SSR (`@supabase/ssr`). No service role key in the browser.
- Database: use only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
- RLS must be enabled on all user-owned tables. Core policy pattern: `auth.uid() = user_id`.
- Storage bucket `item-images` is **private**. Use `createSignedUrl()` for uploaded images, not `getPublicUrl()`.
- Do not expose or request the service role key.

## Code style
- Keep changes small and reversible.
- Do not do broad refactors unless asked.
- Explain anything security-related in plain English before making changes.
- Do not add comments explaining what code does — only add comments for non-obvious WHY.

## Commit style
- Do not include `Co-Authored-By` trailers in commit messages.
