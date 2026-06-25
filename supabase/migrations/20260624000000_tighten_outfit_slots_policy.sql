-- Tighten the outfit_slots write policy.
--
-- The original policy only verified that the parent outfit belongs to the
-- current user. It did not check that the linked wishlist_item_id is also owned
-- by that user, so a user could insert a slot pointing at another user's item id.
--
-- Reads were already constrained by the wishlist_items RLS policy (the joined
-- item comes back null for items you don't own), so this is mainly an integrity
-- fix: it stops slots from referencing items you don't own and avoids leaking
-- whether a given item id exists. The USING clause (reads) is unchanged.

DROP POLICY IF EXISTS "Users manage slots for their own outfits" ON outfit_slots;

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
