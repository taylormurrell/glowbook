import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateOutfitSchema, type CreateOutfitInput } from '@/lib/schemas'
import { resolveOutfitSlotImages } from '@/lib/resolve-images'
import type { Outfit } from '@/lib/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('outfits')
    .select('*, slots:outfit_slots(*, wishlist_item:wishlist_items(*))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('outfits GET: db error', error)
    return Response.json({ error: 'Unable to load outfits.' }, { status: 500 })
  }

  const resolved = await Promise.all((data ?? []).map(o => resolveOutfitSlotImages(supabase, o as Outfit)))
  return Response.json(resolved)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = CreateOutfitSchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, notes, slots } = parsed.data as CreateOutfitInput

  const { data: outfit, error: outfitError } = await supabase
    .from('outfits')
    .insert({ name, notes, user_id: user.id })
    .select()
    .single()

  if (outfitError) {
    console.error('outfits POST: db error', outfitError)
    return Response.json({ error: 'Unable to save outfit.' }, { status: 500 })
  }

  const slotRows = slots
    .filter((s) => s.wishlist_item_id)
    .map((s) => ({
      outfit_id: outfit.id,
      slot_type: s.slot_type,
      wishlist_item_id: s.wishlist_item_id,
      display_order: s.display_order,
    }))

  if (slotRows.length > 0) {
    const { error: slotsError } = await supabase.from('outfit_slots').insert(slotRows)
    if (slotsError) {
      console.error('outfits POST: slots db error', slotsError)
      return Response.json({ error: 'Unable to save outfit.' }, { status: 500 })
    }
  }

  return Response.json(outfit, { status: 201 })
}
