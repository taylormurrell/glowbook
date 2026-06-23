import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('outfits')
    .select('*, slots:outfit_slots(*, wishlist_item:wishlist_items(*))')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 404 })
  return Response.json(data)
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, notes, slots } = await request.json()

  const { data: outfit, error: outfitError } = await supabase
    .from('outfits')
    .update({ name, notes })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (outfitError) return Response.json({ error: outfitError.message }, { status: 500 })

  // Replace all slots
  await supabase.from('outfit_slots').delete().eq('outfit_id', id)

  if (slots && slots.length > 0) {
    const slotRows = slots
      .filter((s: { wishlist_item_id: string | null }) => s.wishlist_item_id)
      .map((s: { slot_type: string; wishlist_item_id: string; display_order: number }) => ({
        outfit_id: id,
        slot_type: s.slot_type,
        wishlist_item_id: s.wishlist_item_id,
        display_order: s.display_order ?? 0,
      }))

    if (slotRows.length > 0) {
      await supabase.from('outfit_slots').insert(slotRows)
    }
  }

  return Response.json(outfit)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('outfits')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return new Response(null, { status: 204 })
}
