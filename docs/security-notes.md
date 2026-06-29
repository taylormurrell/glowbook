# Security notes and design decisions

This is the longer-form companion to the [README](../README.md). The README has the quick architecture and security overview; this doc explains the reasoning and tradeoffs behind each decision in more depth.

## Locking down the database with Row Level Security (RLS)
By default, a database trusts whoever is making the request. Row Level Security moves access control into the database itself, so user-owned rows are scoped by policy even if the app code makes a broader query.

Setting it up had two non-obvious steps:
- **Enabling RLS isn't enough on its own.** You also have to explicitly tell the API layer it's allowed to read the table at all (via `GRANT`). Without that second step, the table silently shows as unavailable, with no helpful error explaining why.
- **Every table needs its own rule, including join tables.** The `outfit_slots` table (which links outfits to items) doesn't have a user ID on it. The rule has to say "only allow access if the outfit this slot belongs to is owned by the current user," which requires one extra join in the policy logic. On a later review pass I tightened this further: writes now also check that the linked wishlist item is owned by the same user, so a slot can't reference someone else's item even if the parent outfit is yours.

The policies use the `(select auth.uid()) = user_id` form rather than a bare `auth.uid()`. This is a Supabase performance recommendation: wrapping the call in a scalar subquery lets Postgres evaluate it once per statement instead of once per row. The access rule is identical; only the evaluation count changes, which matters as row counts grow.

## GRANT: opening the table to the API role
Enabling RLS locks a table down, but it doesn't open it to the Supabase Data API. That's a separate permission system. With "Automatically expose new tables" turned off in the project, a new table has no privileges for the `authenticated` role, so every request fails and the table shows as "API DISABLED" in the dashboard.

The fix is explicit `GRANT` statements giving the `authenticated` role access to the tables. The two layers do different jobs: GRANT is the door (can this role touch the table at all), RLS is the filter (which rows come back). You need both, and they are granted only to `authenticated`, never `anon`, so logged-out requests are denied outright.

## Keeping uploaded images private
The easy approach for image storage is a public bucket, where every image gets a permanent URL that anyone can visit. I used a private bucket instead, which means images are only accessible if the server explicitly authorises the request.

How it works in practice:
- The database stores a file **path** (like `user-id/<uuid>.jpg`), not a URL
- Every time a page loads, the server generates a **temporary signed URL** for each image that expires after 1 hour and swaps it into the response before it reaches the browser
- If someone saved an old URL and tried to use it later, it would already be expired and return nothing

Scraped retailer images from product pages are just normal public URLs and don't need any of this treatment.

## Next.js: knowing when code runs on the server vs the browser
Next.js lets you mix server-rendered and browser-rendered components in the same app, which is powerful but has some sharp edges:

- Some things, like reacting to a broken image loading, can only happen in the browser. Trying to do it in a server component throws a runtime error that isn't immediately obvious to debug.
- Pages that fetch data directly from Supabase (server components) completely bypass the API routes. Any processing you want applied to every response, like swapping in those temporary image URLs, has to be done explicitly in each page rather than once in the API layer.

## Scraping product pages
When you paste a retailer URL into Glowbook, the server fetches that page and extracts the product name, price, brand, and image automatically using a library called Cheerio. It works by reading the structured metadata that most retail sites embed in their pages for SEO purposes.

One limitation: many retailer CDNs block their images from loading on other websites to protect bandwidth and branding. Scraped images sometimes won't display for this reason, so uploading your own photo is the more reliable path.

## Validating everything coming into the API (Zod)
Every API route is a potential entry point for bad data. Early on, the routes took whatever the browser sent and passed it straight to the database, which meant a malicious request could include extra fields like a forged user ID or unexpected data types.

I added a validation layer using a library called Zod. It works like a strict checklist at the door of each API route: the incoming data has to match an exact description of what's expected (right fields, right types, nothing extra). If it doesn't match, the request is rejected immediately with a clear error before it gets anywhere near the database. The database's own security rules catch anything that slips through, but this stops most bad input much earlier.

## Protecting the scrape feature from server-side attacks (SSRF)
SSRF, or Server-Side Request Forgery, is an attack where someone tricks your server into making requests on their behalf to places it shouldn't be talking to.

In this case, the scrape feature takes a URL from the user and fetches it from the server. Without any checks, someone could submit something like `http://169.254.169.254`, an internal cloud address that returns server credentials, and the server would happily fetch it. This matters more because the app runs on cloud infrastructure (Vercel), where that fetch originates from inside a trusted network.

The guard reduces the main SSRF risks in a few layers:
- **Reject non-web URLs immediately.** Only `http://` and `https://` are allowed.
- **Resolve the domain to its real IP address before fetching.** A domain that looks innocent might actually point to an internal address. Checking the URL string isn't enough; you have to check where it actually resolves to.
- **Re-validate on every redirect.** A URL can redirect to a different URL, so each hop is checked independently.
- **Only parse HTML, and cap how much gets read.** The response has to be an HTML content type, and the body is read up to a 2 MB limit so a huge or hostile page can't exhaust server memory.

It reduces these risks rather than eliminating them. One known limitation is DNS rebinding, where a domain resolves to a safe address at check time but switches to an internal one by the time the actual request is made. That can't be fully prevented at the app layer and would require network-level controls. I also haven't added rate limiting. Both are listed under Known limitations in the README as accepted tradeoffs for a personal demo.

## Security response headers
The app sets a Content-Security-Policy plus `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` in `next.config.ts`. These reduce clickjacking, MIME-sniffing, and content-injection risk. HSTS is provided by the host (Vercel).

The CSP uses the documented static approach for Next.js (`'unsafe-inline'` for scripts and styles). A stricter nonce-based policy would block inline injection more completely but requires fully dynamic rendering, which isn't a worthwhile tradeoff for this app. `img-src` allows any `https:` source because scraped product images come from arbitrary retailer CDNs and can't be enumerated ahead of time.

## Why there are two schema files
The database setup lives in two places, and that's deliberate.

`supabase/schema.sql` came first. It's a single file you paste into the Supabase web SQL editor to build the whole database in one go, and it's how the live database was originally set up. The `supabase/migrations/` folder came later. It builds the same schema, restructured into the format Supabase's command-line tool runs automatically with `npx supabase db push`.

So why add migrations if `schema.sql` already worked? A single schema file describes what the database should look like right now, but it keeps no history. The moment the schema needs to change, you're back to hand-editing the file and remembering to re-run it everywhere. Migrations are timestamped, versioned files that a tool applies in order, which turns schema changes into something tracked and repeatable rather than a manual copy-paste.

The migrations are the source of truth. `schema.sql` is a snapshot of the end state those migrations produce, kept only as a convenience for pasting into the web editor. When a migration changes the schema, the snapshot gets updated to match, so the two describe the same final database rather than drifting apart.
