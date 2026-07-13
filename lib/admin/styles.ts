import { createClient } from '@/lib/supabase/client'

export const STYLES_BUCKET = 'styles'

export type StyleCategory = { id: string; name: string; sort: number }

export type Style = {
  id: string
  name: string
  category_id: string | null
  image_path: string
  owner_id: string | null
  source: string
}

export async function listStyleCategories(): Promise<StyleCategory[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('style_categories')
    .select('id,name,sort')
    .order('sort', { ascending: true })
  if (error) throw error
  return (data as StyleCategory[]) ?? []
}

export async function createStyleCategory(name: string, sort: number): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('style_categories').insert({ name, sort })
  if (error) throw error
}

export async function updateStyleCategory(id: string, patch: { name?: string; sort?: number }): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('style_categories').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteStyleCategory(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('style_categories').delete().eq('id', id)
  if (error) throw error
}

export async function countStylesInCategory(categoryId: string): Promise<number> {
  const supabase = createClient()
  const { count, error } = await supabase
    .from('styles')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId)
  if (error) throw error
  return count ?? 0
}

export async function uploadAdminStyleImage(file: File): Promise<string> {
  const supabase = createClient()
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `admin/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(STYLES_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw error
  return path
}

export async function getStyleSignedUrl(imagePath: string): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.storage.from(STYLES_BUCKET).createSignedUrl(imagePath, 3600)
  return data?.signedUrl ?? null
}

export async function resolveStyleSignedUrls(styles: Style[]): Promise<Record<string, string>> {
  const urls: Record<string, string> = {}
  await Promise.all(
    styles.map(async (s) => {
      const url = await getStyleSignedUrl(s.image_path)
      if (url) urls[s.id] = url
    })
  )
  return urls
}

export async function listStyles(source: 'admin' | 'user'): Promise<Style[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('styles')
    .select('id,name,category_id,image_path,owner_id,source')
    .eq('source', source)
    .order('name', { ascending: true })
  if (error) throw error
  return (data as Style[]) ?? []
}

export async function createAdminStyle(name: string, categoryId: string | null, file: File): Promise<void> {
  const image_path = await uploadAdminStyleImage(file)
  const supabase = createClient()
  const { error } = await supabase.from('styles').insert({
    name,
    category_id: categoryId,
    image_path,
    owner_id: null,
    source: 'admin',
  })
  if (error) throw error
}

export async function updateStyle(id: string, patch: { name?: string; category_id?: string | null }): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('styles').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteStyle(style: Style): Promise<void> {
  const supabase = createClient()
  if (style.image_path) {
    await supabase.storage.from(STYLES_BUCKET).remove([style.image_path])
  }
  const { error } = await supabase.from('styles').delete().eq('id', style.id)
  if (error) throw error
}
