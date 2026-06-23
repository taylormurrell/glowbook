# Glowbook

A personal wardrobe and outfit-planning app. Save fashion wishlist items from any retailer URL, upload your own photos, and build visual outfit cards by combining items into named looks.

> **Why I built this:** I wanted a real project to learn Supabase end-to-end — auth, Postgres with row-level security, and private file storage — while building something I'd actually use. This is a solo side project, not a startup.

---

## Screenshots

**Wishlist** — save items from any retailer URL with auto-scraped images, names, and prices
![Wishlist](docs/screenshots/wishlist.png)

**Outfit builder** — assign wishlist items to category slots with a live visual preview
![Outfit builder](docs/screenshots/outfit-builder.png)

**Outfit detail** — view a finished outfit card alongside the full item list
![Outfit detail](docs/screenshots/outfit-detail.png)

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript |
| Styling | Tailwind CSS v4 |
| Auth | Supabase Auth (SSR, cookie-based sessions) |
| Database | Supabase Postgres with Row Level Security |
| Storage | Supabase Storage (private bucket, signed URLs) |
| Scraping | Cheerio (server-side product data extraction) |
| Testing | Vitest (unit tests for security and validation logic) |

---

## Features

- **Wishlist** — paste a retailer URL and auto-scrape product name, brand, price, and image; manually edit any field; categorize by type (top, bottom, dress, shoes, bag, jewelry, etc.)
- **Image handling** — upload your own photo via drag-and-drop, or use the scraped retailer image
- **Outfit builder** — create named outfits by assigning wishlist items to category slots; live visual preview as you build
- **Outfit board** — browse all saved outfits as visual cards; click through to detail view with full item list

---

## What I learned building this

### Supabase setup from scratch
This was my first time configuring Supabase end-to-end rather than using a starter template. Key things I had to figure out:

- **RLS requires two layers.** Enabling Row Level Security locks a table, but you also need explicit `GRANT` statements for PostgREST (the Data API) to see the table at all — especially when "Automatically expose new tables" is turned off. Without the grants, tables show as "API DISABLED" even with RLS enabled.
- **Policy pattern for user-scoped data:** `auth.uid() = user_id` on insert and select. For join tables like `outfit_slots` (which don't have their own `user_id`), ownership is verified through the parent `outfits` table.
- **Storage policies are separate from table policies.** A private bucket with no policies denies everything by default — uploads, reads, and deletes all fail with RLS errors until you add explicit per-bucket policies.

### Private file storage with signed URLs
Most tutorials use public buckets and `getPublicUrl()`. I deliberately chose a private bucket, which required a different approach:

- Uploaded image **paths** are stored in the database (e.g. `user-id/1234567890.jpg`), not URLs
- **Signed URLs** (1-hour TTL) are generated server-side at fetch time using `createSignedUrl()` and swapped in before the response reaches the client
- Scraped retailer image URLs are stored and displayed directly — no signing needed
- A shared `resolveItemImages` / `resolveOutfitSlotImages` helper handles the conversion across all server pages that embed wishlist items

### Next.js App Router: Server vs Client Components
A few things that caught me out:

- Event handlers like `onError` on `<img>` tags can only live in Client Components. A Server Component that renders `<img onError={...}>` throws at runtime — the fix is either `'use client'` or extracting a tiny wrapper component.
- Pages that fetch data via Supabase directly (Server Components) bypass any API route logic — so signed URL resolution has to be applied explicitly in each page, not just in the API route.

### URL scraping
Used Cheerio server-side to extract `og:image`, `og:title`, and JSON-LD structured product data from retailer pages. Works well for structured sites; falls back gracefully when scraping fails. Note: many retailer CDNs block hotlinking, so scraped images may not display on external domains — uploading your own photo is the reliable path.

---

## Running locally

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier is enough)

### 1. Clone and install
```bash
git clone https://github.com/taylormurrell/glowbook.git
cd glowbook
npm install
```

### 2. Create a Supabase project
1. Create a new project at [supabase.com](https://supabase.com)
2. In **Project Settings → API**, copy your **Project URL** and **anon public key**
3. Create `.env.local` in the project root:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the database schema
In Supabase **SQL Editor**, paste and run the contents of `supabase/schema.sql`. This creates the tables, enables RLS, adds policies, and grants Data API access.

### 4. Create the storage bucket
In Supabase **Storage**, create a bucket named `item-images` with **Public bucket turned off**.

### 5. Start the dev server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000), create an account, and start adding items.

---

## Project structure

```
src/
  app/
    (app)/              # Authenticated routes (dashboard, wishlist, outfits, outfit-builder)
    api/                # Route handlers (items, outfits, scrape, upload)
    login/              # Public auth page
  components/           # Shared UI components
  lib/
    supabase/           # Server and client Supabase instances
    resolve-images.ts   # Signed URL resolution for uploaded images
    types.ts            # Shared TypeScript types
supabase/
  schema.sql            # Full database schema with RLS policies and grants
```

---

## What I'd build next

- **Tagging and filtering** — tag outfits by occasion, season, or mood; filter wishlist by multiple categories
- **Outfit sharing** — generate a public shareable link for a single outfit (opt-in, not default)
- **Price tracking** — alert when a wishlist item drops in price
- **Mobile polish** — responsive styles are in place but the app targets desktop; a mobile pass would verify layouts and tap targets on small screens
- **Beauty section** — the app is named Glowbook and scoped for eventual expansion into skincare and makeup routines

---

## Security notes

- All database tables use Row Level Security — users can only access their own data
- Uploaded images are in a private Supabase Storage bucket; access requires a short-lived signed URL generated server-side
- No service role key is used in browser code
- `.env.local` is git-ignored
- **SSRF protection on the scrape endpoint:** the server-side scrape route validates every URL before fetching — non-http(s) schemes are rejected, and the hostname is resolved to its IP address(es) before the request is made. Any IP in a private, loopback, link-local, or reserved range (RFC 1918, 127/8, 169.254/16, etc.) causes a 400. Redirects are followed manually, and each redirect target is re-validated before the next hop. **Residual risk:** DNS rebinding can bypass IP validation at the app layer — the hostname resolves to a public IP at validation time but switches to a private one by the time the actual connection is made. Fully closing that gap requires OS-level or network-layer controls (e.g. egress firewall rules blocking internal CIDRs from the app server). For a personal app running locally this is an acceptable residual risk.

---

## Tests

Unit tests cover the two layers most likely to have subtle bugs: the SSRF guard and the API input schemas.

```bash
npm test
```

| File | What it covers |
|---|---|
| `src/lib/__tests__/ssrf-guard.test.ts` | `isPrivateAddress` (IPv4 and IPv6 ranges), scheme rejection, private-IP-in-URL rejection, malformed URLs |
| `src/lib/__tests__/schemas.test.ts` | Every zod schema — required fields, enum validation, partial updates, slot UUID checks, file type/size rules |

API route integration tests (routes that call Supabase) are not yet written — those require a live database and will be added once the migration workflow is in place.

---

## Developer notes

`CLAUDE.md`, `AGENTS.md`, and `AI_RULES.md` are Claude Code configuration files. They provide context and rules to AI coding assistants working on this project and have no effect on the app itself.

## License

MIT
