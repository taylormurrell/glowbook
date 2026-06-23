import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('outfits')
    .select('*, slots:outfit_slots(*, wishlist_item:wishlist_items(*))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, notes, slots } = await request.json()

  const { data: outfit, error: outfitError } = await supabase
    .from('outfits')
    .insert({ name, notes, user_id: user.id })
    .select()
    .single()

  if (outfitError) return Response.json({ error: outfitError.message }, { status: 500 })

  if (slots && slots.length > 0) {
    const slotRows = slots
      .filter((s: { wishlist_item_id: string | null }) => s.wishlist_item_id)
      .map((s: { slot_type: string; wishlist_item_id: string; display_order: number }) => ({
        outfit_id: outfit.id,
        slot_type: s.slot_type,
        wishlist_item_id: s.wishlist_item_id,
        display_order: s.display_order ?? 0,
      }))

    if (slotRows.length > 0) {
      const { error: slotsError } = await supabase.from('outfit_slots').insert(slotRows)
      if (slotsError) return Response.json({ error: slotsError.message }, { status: 500 })
    }
  }

  return Response.json(outfit, { status: 201 })
}
