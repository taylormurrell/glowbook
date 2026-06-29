-- Performance / best-practice update (not a security change).
--
-- Supabase recommends wrapping auth.uid() in a scalar subquery, e.g.
-- (select auth.uid()), inside RLS policies. Postgres then evaluates it once
-- per statement (as an InitPlan) instead of once per row. The access rules are
-- identical; this only changes how often the function is evaluated, which
-- matters as row counts grow.
--
-- This recreates every policy with the wrapped form. No policy logic changes.

-- wishlist_items
DROP POLICY IF EXISTS "Users manage their own wishlist items" ON wishlist_items;
CREATE POLICY "Users manage their own wishlist items"
  ON wishlist_items FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- outfits
DROP POLICY IF EXISTS "Users manage their own outfits" ON outfits;
CREATE POLICY "Users manage their own outfits"
  ON outfits FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- outfit_slots
DROP POLICY IF EXISTS "Users manage slots for their own outfits" ON outfit_slots;
CREATE POLICY "Users manage slots for their own outfits"
  ON outfit_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_slots.outfit_id
      AND outfits.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_slots.outfit_id
      AND outfits.user_id = (select auth.uid())
    )
    AND (
      wishlist_item_id IS NULL
      OR EXISTS (
        SELECT 1 FROM wishlist_items
        WHERE wishlist_items.id = outfit_slots.wishlist_item_id
        AND wishlist_items.user_id = (select auth.uid())
      )
    )
  );

-- storage policies for the item-images bucket
DROP POLICY IF EXISTS "Users upload to own folder" ON storage.objects;
CREATE POLICY "Users upload to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'item-images' AND
    (select auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users read own images" ON storage.objects;
CREATE POLICY "Users read own images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'item-images' AND
    (select auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own images" ON storage.objects;
CREATE POLICY "Users delete own images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'item-images' AND
    (select auth.uid())::text = (storage.foldername(name))[1]
  );
