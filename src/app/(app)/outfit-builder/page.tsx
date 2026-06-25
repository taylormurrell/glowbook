import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OutfitBuilder from '@/components/OutfitBuilder'
import type { WishlistItem } from '@/lib/types'
import { resolveItemImages } from '@/lib/resolve-images'

export default async function NewOutfitPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawItems } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('user_id', user.id)
    .order('category')

  const items = await resolveItemImages(supabase, (rawItems ?? []) as WishlistItem[])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Create outfit</h1>
        <p className="text-sm text-gray-400 mt-0.5">Build a head-to-toe look from your wishlist</p>
      </div>
      <OutfitBuilder wishlistItems={items} />
    </div>
  )
}
