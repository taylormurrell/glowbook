import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateItemSchema } from '@/lib/schemas'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('items GET: db error', error)
    return Response.json({ error: 'Unable to load items.' }, { status: 500 })
  }

  const resolved = await Promise.all(data.map(async (item) => {
    if (item.image_source === 'uploaded_file' && item.image_url) {
      const { data: signed } = await supabase.storage
        .from('item-images')
        .createSignedUrl(item.image_url, 3600)
      return { ...item, image_url: signed?.signedUrl ?? null }
    }
    return item
  }))
  return Response.json(resolved)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = CreateItemSchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('wishlist_items')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) {
    console.error('items POST: db error', error)
    return Response.json({ error: 'Unable to save item.' }, { status: 500 })
  }
  return Response.json(data, { status: 201 })
}
