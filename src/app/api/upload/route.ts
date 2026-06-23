import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: 'Unsupported file type. Use JPEG, PNG, WebP, or GIF.' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${user.id}/${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('item-images')
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 })

  const { data: signed } = await supabase.storage
    .from('item-images')
    .createSignedUrl(path, 3600)

  return Response.json({ url: path, signedUrl: signed?.signedUrl ?? null })
}
