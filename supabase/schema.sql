-- Convenience snapshot of the full schema for pasting into the Supabase SQL
-- editor in one go. The source of truth is supabase/migrations/. When you add a
-- migration, update this file to match the resulting end state so the two
-- don't drift.

-- Wishlist Items
CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_url TEXT NOT NULL,
  product_name TEXT NOT NULL,
  brand TEXT,
  retailer TEXT,
  price TEXT,
  category TEXT NOT NULL CHECK (
    category IN ('jewelry','top','bottom','dress','outerwear','shoes','bag','other')
  ),
  color TEXT,
  notes TEXT,
  image_url TEXT,
  image_source TEXT NOT NULL DEFAULT 'none' CHECK (
    image_source IN ('scraped_url','uploaded_file','manual_url','none')
  ),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own wishlist items"
  ON wishlist_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Outfits
CREATE TABLE IF NOT EXISTS outfits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own outfits"
  ON outfits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Outfit Slots
CREATE TABLE IF NOT EXISTS outfit_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outfit_id UUID REFERENCES outfits(id) ON DELETE CASCADE NOT NULL,
  slot_type TEXT NOT NULL CHECK (
    slot_type IN ('jewelry','top','bottom','dress','outerwear','shoes','bag','other')
  ),
  wishlist_item_id UUID REFERENCES wishlist_items(id) ON DELETE SET NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (outfit_id, slot_type)
);

ALTER TABLE outfit_slots ENABLE ROW LEVEL SECURITY;

-- Reads: only require that the parent outfit is owned by the user.
-- Writes: additionally require that wishlist_item_id is null or points to an
-- item the user owns, so slots can't reference another user's items.
CREATE POLICY "Users manage slots for their own outfits"
  ON outfit_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_slots.outfit_id
      AND outfits.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_slots.outfit_id
      AND outfits.user_id = auth.uid()
    )
    AND (
      wishlist_item_id IS NULL
      OR EXISTS (
        SELECT 1 FROM wishlist_items
        WHERE wishlist_items.id = outfit_slots.wishlist_item_id
        AND wishlist_items.user_id = auth.uid()
      )
    )
  );

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wishlist_items_updated_at
  BEFORE UPDATE ON wishlist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER outfits_updated_at
  BEFORE UPDATE ON outfits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER outfit_slots_updated_at
  BEFORE UPDATE ON outfit_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Grant Data API access to authenticated users
-- RLS policies above still control which rows each user can access
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON wishlist_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON outfits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON outfit_slots TO authenticated;

-- Storage policies for private item-images bucket
-- Bucket must be created manually in Supabase dashboard (private, not public)
-- Paths are stored as {user.id}/{uuid}.ext; the folder check enforces per-user isolation

DROP POLICY IF EXISTS "Users upload to own folder" ON storage.objects;
CREATE POLICY "Users upload to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'item-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users read own images" ON storage.objects;
CREATE POLICY "Users read own images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'item-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own images" ON storage.objects;
CREATE POLICY "Users delete own images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'item-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
