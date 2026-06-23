import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UploadFileSchema } from '@/lib/schemas'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const parsed = UploadFileSchema.safeParse({ file: formData.get('file') })
  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten()
    const message = fieldErrors.file?.[0] ?? 'Invalid file'
    return Response.json({ error: message }, { status: 400 })
  }

  const file = parsed.data.file as File
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
