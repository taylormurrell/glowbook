-- Initial schema for Glowbook
-- Note: existing deployments already have this schema applied manually.
-- This migration exists so future fresh databases can be built with a single command.

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
  );

-- Grant Data API access to authenticated users
-- RLS policies above still control which rows each user can access
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON wishlist_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON outfits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON outfit_slots TO authenticated;

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

-- Storage policies for private item-images bucket
-- Bucket must be created manually in Supabase dashboard (private, not public)
-- Paths are stored as {user.id}/{timestamp}.ext — folder check enforces per-user isolation

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
