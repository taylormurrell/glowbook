import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdateItemSchema, UuidParamSchema } from '@/lib/schemas'

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
    .from('wishlist_items')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 404 })
  return Response.json(data)
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

  const parsed = UpdateItemSchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('wishlist_items')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
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
    .from('wishlist_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return new Response(null, { status: 204 })
}
