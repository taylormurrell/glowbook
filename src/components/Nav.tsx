'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function Nav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [signing, setSigning] = useState(false)

  async function signOut() {
    setSigning(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${
        pathname.startsWith(href)
          ? 'text-gray-900'
          : 'text-gray-400 hover:text-gray-700'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-gray-900">
            Glowbook
          </Link>
          <nav className="flex items-center gap-6">
            {link('/wishlist', 'Wishlist')}
            {link('/outfits', 'Outfits')}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 hidden sm:block">{userEmail}</span>
          <button
            onClick={signOut}
            disabled={signing}
            className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
