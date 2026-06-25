import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateOutfitSchema, UuidParamSchema, type UpdateOutfitInput } from '@/lib/schemas'
import { resolveOutfitSlotImages } from '@/lib/resolve-images'
import type { Outfit } from '@/lib/types'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const paramParsed = UuidParamSchema.safeParse(await params)
  if (!paramParsed.success) {
    return Response.json({ error: paramParsed.error.flatten() }, { status: 400 })
  }
  const { id } = paramParsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('outfits')
    .select('*, slots:outfit_slots(*, wishlist_item:wishlist_items(*))')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) return Response.json({ error: 'Outfit not found.' }, { status: 404 })

  const resolved = await resolveOutfitSlotImages(supabase, data as Outfit)
  return Response.json(resolved)
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const paramParsed = UuidParamSchema.safeParse(await params)
  if (!paramParsed.success) {
    return Response.json({ error: paramParsed.error.flatten() }, { status: 400 })
  }
  const { id } = paramParsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = UpdateOutfitSchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, notes, slots } = parsed.data as UpdateOutfitInput

  const { data: outfit, error: outfitError } = await supabase
    .from('outfits')
    .update({ name, notes })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (outfitError) {
    console.error('outfits PUT: db error', outfitError)
    return Response.json({ error: 'Unable to update outfit.' }, { status: 500 })
  }

  // Replace all slots. Note: this is not atomic (see README "Known
  // limitations"); a failed insert after a successful delete can leave the
  // outfit with no slots. We at least surface either failure rather than
  // swallowing it.
  const { error: deleteError } = await supabase.from('outfit_slots').delete().eq('outfit_id', id)
  if (deleteError) {
    console.error('outfits PUT: slot delete error', deleteError)
    return Response.json({ error: 'Unable to update outfit.' }, { status: 500 })
  }

  const slotRows = slots
    .filter((s) => s.wishlist_item_id)
    .map((s) => ({
      outfit_id: id,
      slot_type: s.slot_type,
      wishlist_item_id: s.wishlist_item_id,
      display_order: s.display_order,
    }))

  if (slotRows.length > 0) {
    const { error: slotsError } = await supabase.from('outfit_slots').insert(slotRows)
    if (slotsError) {
      console.error('outfits PUT: slot insert error', slotsError)
      return Response.json({ error: 'Unable to update outfit.' }, { status: 500 })
    }
  }

  return Response.json(outfit)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const paramParsed = UuidParamSchema.safeParse(await params)
  if (!paramParsed.success) {
    return Response.json({ error: paramParsed.error.flatten() }, { status: 400 })
  }
  const { id } = paramParsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('outfits')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('outfits DELETE: db error', error)
    return Response.json({ error: 'Unable to delete outfit.' }, { status: 500 })
  }
  return new Response(null, { status: 204 })
}
