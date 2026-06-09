'use client'

import { createClient } from '@/lib/supabase/client'

const BUCKET = 'user-assets'

export type Asset = {
  id: string
  name: string | null
  category: string | null
  image_path: string
  created_at: string
  signedUrl?: string
}

export async function saveAsset(
  file: File,
  opts?: { name?: string; category?: string }
): Promise<Asset> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not_authenticated')

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type })
  if (upErr) throw upErr

  const { data, error } = await supabase
    .from('assets')
    .insert({
      user_id: user.id,
      name: opts?.name ?? file.name,
      category: opts?.category ?? null,
      image_path: path,
      image_url: null,
    })
    .select()
    .single()
  if (error) throw error
  return data as Asset
}

export async function listAssets(): Promise<Asset[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error

  const assets = (data ?? []) as Asset[]
  await Promise.all(
    assets.map(async (a) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(a.image_path, 3600)
      a.signedUrl = signed?.signedUrl
    })
  )
  return assets
}

export async function deleteAsset(id: string, image_path: string): Promise<void> {
  const supabase = createClient()
  await supabase.storage.from(BUCKET).remove([image_path])
  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) throw error
}
