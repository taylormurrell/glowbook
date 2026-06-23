# Glowbook — Supabase Setup Playbook

## 1. Project context

- Product name: Glowbook
- Scope: Wardrobe & Beauty app
- MVP focus: wardrobe wishlist and outfit builder
- Local repo may still be named `outfit-builder` — do not rename unless explicitly approved
- Stack: Next.js 16, TypeScript, Supabase Auth, Supabase Postgres, Supabase Storage, Tailwind

## 2. Supabase project setup

- Fresh Supabase project named **Glowbook**
- Personal organization/workspace controlled by owner
- Do not use any old paused Glowbook project
- Do not use Placeholder org unless explicitly confirmed as safe
- Region: Americas
- Postgres type: default Postgres (not OrioleDB)
- Enable Data API: **on**
- Automatically expose new tables: **off**
- Enable automatic RLS: **on**

## 3. Environment variables

- Add Supabase Project URL to `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`
- Add Supabase publishable/anon key to `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Confirm `.env.local` exists
- Confirm `.env.local` is ignored by Git via `.env*` in `.gitignore`
- Never print `.env.local` contents in chat
- Never use `service_role` key in browser code
- After changing `.env.local`, restart the dev server

## 4. Database setup

- Run `supabase/schema.sql` in Supabase SQL Editor
- Expected result: `Success, no rows returned`
- Tables created:
  - `wishlist_items`
  - `outfits`
  - `outfit_slots`
- RLS enabled on all three tables
- Policies restrict access to the authenticated owner
- Core policy pattern: `auth.uid() = user_id` applies directly to tables that have a `user_id` column
- For `outfit_slots`, ownership is checked through the parent `outfits` table, since `outfit_slots` does not have its own `user_id` column

## 5. Data API access fix

- With "Automatically expose new tables" off, tables initially show **API DISABLED**
- Fix: add explicit GRANT statements (already added to `supabase/schema.sql`)
- Run the following in Supabase SQL Editor on any existing database:

```sql
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON wishlist_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON outfits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON outfit_slots TO authenticated;
```

- The GRANT opens table access to the Data API for authenticated users
- RLS still controls which rows each user can access — both layers are required
- Do not grant these private tables to `anon`

## 6. Storage setup

- Create a Supabase Storage bucket named `item-images`
- Public bucket: **off** (private)
- Restrict file size: off for now
- Restrict MIME types: off for now
- Uploaded replacement images go into `item-images`
- Scraped retailer images remain as external URLs — no bucket needed

## 7. Private image handling

- Do not use `getPublicUrl()` for uploaded images — it does not work with a private bucket
- `src/app/api/upload/route.ts`: returns the storage path (e.g. `user-id/timestamp.jpg`), not a public URL
- Uploaded image storage path is stored in `image_url` in the database
- `image_source` field distinguishes `uploaded_file` from `scraped_url`
- `src/app/api/items/route.ts`: uses `createSignedUrl()` for `uploaded_file` images when fetching items
- Signed URLs are generated server-side (1 hour TTL) and are not stored in the database
- Signed URLs are temporary and may expire after the TTL
- If an uploaded image stops displaying after expiration, the fix is to regenerate a signed URL when fetching items, not to store signed URLs in the database
- Scraped image URLs pass through untouched

## 8. Verification checklist

- [ ] `.env.local` exists
- [ ] `.env.local` ignored by Git
- [ ] Schema and GRANTs ran successfully in Supabase
- [ ] `item-images` private bucket created
- [ ] `upload/route.ts` has no `getPublicUrl`
- [ ] `items/route.ts` has `createSignedUrl` present
- [ ] `npm run build` completes cleanly
- [ ] `wishlist_items`, `outfits`, and `outfit_slots` no longer show API DISABLED
- [ ] `wishlist_items`, `outfits`, and `outfit_slots` still show RLS enabled

## 9. Security rules to preserve

- Never commit `.env.local`
- Never print env values in chat
- Never expose `service_role` key
- Keep RLS enabled on all user-owned tables
- Keep `item-images` private
- Do not store signed URLs in the database
- Do not grant private tables to `anon`
- Use `authenticated` grants plus RLS policies
- Use the publishable/anon key only with RLS enforced
- Do not disable auth proxy or protected routes

## 10. Local testing steps

Run `npm run dev`, then test in order:

- [ ] Login page loads at `http://localhost:3000`
- [ ] Unauthenticated users redirect to `/login`
- [ ] Account creation or login works
- [ ] Dashboard loads after login
- [ ] Can add a wishlist item via URL (scraping)
- [ ] Scraped image displays correctly
- [ ] Can upload a replacement image (drag-and-drop)
- [ ] Uploaded image displays correctly from private bucket
- [ ] Can create an outfit and assign items to slots
- [ ] Outfit appears on the outfit board
- [ ] Can edit and delete wishlist items
- [ ] Can edit and delete outfits

If anything fails, stop and debug one issue at a time.
