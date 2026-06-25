import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UploadFileSchema } from '@/lib/schemas'

// Derive the extension from the validated MIME type, not the user-supplied
// filename, so the stored name never carries attacker-controlled input.
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

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
  const ext = EXT_BY_TYPE[file.type] ?? 'bin'
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('item-images')
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('upload: storage error', uploadError)
    return Response.json({ error: 'Unable to upload image.' }, { status: 500 })
  }

  const { data: signed } = await supabase.storage
    .from('item-images')
    .createSignedUrl(path, 3600)

  return Response.json({ url: path, signedUrl: signed?.signedUrl ?? null })
}
