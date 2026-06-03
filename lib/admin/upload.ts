import { createClient } from '@/lib/supabase/client'

export async function uploadAsset(bucket: 'models' | 'poses' | 'backgrounds', file: File): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() || 'png'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
