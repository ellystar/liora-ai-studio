'use client'

import { createClient } from '@/lib/supabase/client'

export type NewUserModel = { id: string; name: string; gender: string | null; image_url: string; scope: string }

export async function uploadUserModel(
  file: File,
  opts: { name: string; gender: 'female' | 'male' | null },
): Promise<NewUserModel> {
  const s = createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('not_authenticated')

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `user/${user.id}/${crypto.randomUUID()}.${ext}`

  const { error: upErr } = await s.storage.from('models').upload(path, file, { upsert: false, contentType: file.type })
  if (upErr) throw upErr

  const { data: pub } = s.storage.from('models').getPublicUrl(path)

  const { data, error } = await s.from('models').insert({
    owner_id: user.id,
    source: 'user',
    scope: 'own',
    name: opts.name || file.name,
    gender: opts.gender,
    image_url: pub.publicUrl,
  }).select('id,name,gender,image_url,scope').single()
  if (error) throw error
  return data as NewUserModel
}
