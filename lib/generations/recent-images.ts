'use client'

import { createClient } from '@/lib/supabase/client'

export type RecentGenerationImage = {
  id: string
  signedUrl: string
}

export async function listRecentGenerationImages(limit = 6): Promise<RecentGenerationImage[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('generation_images')
    .select('id, storage_path')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data?.length) return []

  const rows = await Promise.all(
    data.map(async (row) => {
      const { data: signed } = await supabase.storage
        .from('outputs')
        .createSignedUrl(row.storage_path, 3600)
      if (!signed?.signedUrl) return null
      return { id: row.id, signedUrl: signed.signedUrl }
    })
  )

  return rows.filter((r): r is RecentGenerationImage => r !== null)
}
