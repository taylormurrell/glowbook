# Glowbook — Product Requirements (MVP)

## What is Glowbook?
Glowbook is a personal Wardrobe & Beauty app. The first MVP is focused entirely on wardrobe.

## MVP scope: Wardrobe
- Save fashion wishlist items from retailer URLs (scrape name, brand, price, image automatically)
- Manually add items or upload images when scraping fails
- Categorize items (top, bottom, dress, outerwear, shoes, bag, jewelry, other)
- Build visual outfit cards by combining wishlist items into named outfits
- View, edit, and delete saved outfits

## Out of scope (for now)
- Beauty features (skincare, makeup, etc.) — may be added in a future phase
- Social and sharing features
- Native mobile app (responsive styles are in place; a dedicated mobile app is out of scope)

## Stack
- Framework: Next.js 16 (App Router), TypeScript
- Styling: Tailwind CSS v4
- Auth: Supabase Auth (SSR)
- Database: Supabase Postgres with RLS
- Storage: Supabase Storage (`item-images` bucket, private)
- Validation: Zod (schema validation on all API routes)
- Security: custom SSRF guard on the scrape endpoint
- Testing: Vitest (unit tests for validation and security logic)
- Hosting: Vercel (auto-deploys from `main`), available at https://glowbook-self.vercel.app

## Key data model
- `wishlist_items` — saved fashion items with metadata and image
- `outfits` — named outfit collections owned by a user
- `outfit_slots` — links an outfit to specific wishlist items by category slot

## Image handling
- Scraped retailer images: stored as external URLs, displayed directly
- Uploaded images: stored in Supabase Storage (`item-images`), path saved in DB, signed URLs generated at display time

## User
- Single personal user (the owner). No multi-tenancy needed, but RLS is still enforced for security.
