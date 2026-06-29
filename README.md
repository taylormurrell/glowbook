# Glowbook

[![CI](https://github.com/taylormurrell/glowbook/actions/workflows/ci.yml/badge.svg)](https://github.com/taylormurrell/glowbook/actions/workflows/ci.yml)

Glowbook is a personal wardrobe and outfit-planning app. It lets users save fashion wishlist items from retailer URLs, upload their own photos, and build visual outfit cards from saved items.

> **Why I built this:** to learn Supabase end-to-end, especially Auth, Postgres with Row Level Security, private storage, and secure server-side scraping, while building something I'd actually use.

🔗 **Live:** [glowbook-self.vercel.app](https://glowbook-self.vercel.app)

---

## Screenshots

**Wishlist:** save items from any retailer URL with auto-scraped images, names, and prices
![Wishlist](docs/screenshots/wishlist.png)

**Outfit builder:** assign wishlist items to category slots with a live visual preview
![Outfit builder](docs/screenshots/outfit-builder.png)

**Outfit detail:** view a finished outfit card alongside the full item list
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
| Validation | Zod (schema validation on every API route) |
| Testing | Vitest (unit tests for security and validation logic) |
| Hosting | Vercel (auto-deploys from `main`) |

---

## Core features

- Save wishlist items from retailer URLs (auto-scrape name, brand, price, image)
- Upload personal item photos, or use the scraped retailer image
- Build named outfits by assigning items to category slots, with a live preview
- Browse saved outfits as visual cards and view item details

---

## Architecture

- **Frontend:** Next.js App Router (a mix of server and client components)
- **Auth:** Supabase Auth with SSR cookie sessions, protected in `src/proxy.ts` and re-checked in the authenticated layout
- **Data:** Supabase Postgres, with all user-owned data protected by Row Level Security
- **Storage:** Supabase Storage (private `item-images` bucket) for uploaded photos, served via signed URLs
- **Server logic:** API routes handle scraping, uploads, and writes; server components read from Supabase directly

---

## Security architecture

Glowbook uses layered controls rather than relying on one setting:

| Layer | Implementation | Why it matters |
|---|---|---|
| Authentication | Supabase Auth with SSR cookie sessions | Identifies the user before any access rule is applied |
| Authorization | RLS policies using `(select auth.uid()) = user_id` | Enforces user-owned data access in the database itself |
| Table access | `GRANT` to the `authenticated` role only | Controls whether API roles can reach a table at all; blocks anonymous access |
| Input validation | Zod schemas on every API route (request bodies and route params) | Rejects malformed or unexpected input before it reaches the database |
| Secrets | anon key only in the browser; `service_role` never client-side; `.env.local` git-ignored | The public key is safe because RLS protects the data; the privileged key stays server-side |
| Image storage | Private `item-images` bucket with short-lived signed URLs | Avoids permanent public links for uploaded images |
| Scraper protection | SSRF guard on user-submitted URLs | Blocks non-http(s), internal/private IPs, redirect bypasses, and oversized responses |
| Browser hardening | Security headers in `next.config.ts` (CSP, X-Frame-Options, etc.) | Reduces clickjacking, MIME-sniffing, and content-injection risk |
| Error handling | Generic client errors with server-side logging | Avoids exposing backend details while preserving debugging information |

For the reasoning and tradeoffs behind each decision, see [`docs/security-notes.md`](docs/security-notes.md).

---

## Known limitations

This is a personal app, and I've been deliberate about what I did and didn't harden. Things a production version would need that this doesn't have:

- **No rate limiting** on any endpoint, including the scraper.
- **Residual DNS rebinding risk** on the scrape endpoint. Fully closing it needs network-level egress controls, not application code.
- **Upload validation checks MIME type and size, not file contents.** The MIME type comes from the browser and isn't independently verified (e.g. by inspecting magic bytes), so it shouldn't be treated as strong file-type validation. Files are stored under a random UUID name.
- **No API route integration tests yet.** Unit tests cover validation and the SSRF guard; end-to-end route tests need a live test database, which I haven't set up.
- **The SSRF guard blocks the common private ranges, not every special-use range.** It covers RFC 1918, loopback, and link-local; ranges like carrier-grade NAT (`100.64/8`) are out of scope. The guard targets internal-network access, not every non-public address.
- **The CSP uses `'unsafe-inline'` for scripts and styles** (the documented static-CSP approach for Next.js). A stricter nonce-based policy would require fully dynamic rendering, which isn't a worthwhile tradeoff here.
- **Outfit updates are not atomic.** Editing an outfit deletes and re-inserts its slots as separate statements; both failures are surfaced, but a production version would wrap this in a Postgres RPC transaction.

---

## Tests

```bash
npm test
```

Unit tests (Vitest) cover the two layers most likely to hide subtle bugs: the SSRF guard (`isPrivateAddress` across IPv4, IPv6, and IPv4-mapped IPv6 ranges, plus scheme, private-IP, and redirect-target rejection) and the Zod input schemas (required fields, enums, file type/size rules). CI runs lint, typecheck, and tests on every push.

---

## Running locally

### Prerequisites
- Node.js 20+ (required by the test runner)
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
3. Copy `.env.example` to `.env.local` and fill in your values:
```bash
cp .env.example .env.local
```
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Apply the database schema
```bash
npx supabase link   # connect the CLI to your Supabase project
npx supabase db push
```
This creates the tables, enables RLS, adds policies, and grants Data API access. (No CLI? Paste `supabase/schema.sql` into the Supabase SQL editor instead.)

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
    __tests__/          # Unit tests (ssrf-guard, schemas)
    supabase/           # Server and client Supabase instances
    resolve-images.ts   # Signed URL resolution for uploaded images
    schemas.ts          # Zod schemas for all API route inputs
    ssrf-guard.ts       # URL validation to prevent SSRF on the scrape endpoint
  proxy.ts              # Auth middleware: protects routes and refreshes the session
supabase/
  migrations/           # Versioned schema migrations (source of truth)
  schema.sql            # Convenience snapshot for pasting into the Supabase SQL editor
```

`supabase/migrations/` is the source of truth for database setup; `supabase/schema.sql` is a snapshot of the same end state, kept for one-step pasting into the SQL editor.

---

## What I'd build next

- **Tagging and filtering:** tag outfits by occasion or season; filter the wishlist by multiple categories
- **Outfit sharing:** generate an opt-in public link for a single outfit
- **Price tracking:** alert when a wishlist item drops in price
- **Mobile polish:** responsive styles are in place but the app targets desktop; a proper mobile pass would verify layouts and tap targets
- **Beauty section:** Glowbook is scoped for eventual expansion into skincare and makeup routines

---

## License

MIT
