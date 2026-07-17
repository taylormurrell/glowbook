import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeRedirectPath } from '@/lib/safe-redirect'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'), '/auth/update-password')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=invalid_reset_link`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=invalid_reset_link`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
