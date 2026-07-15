'use client'

import { createClient } from '@/lib/supabase/client'

export const SHOOTS_PAGE_SIZE = 30

export type ShootImage = {
  id: string
  generation_id: string
  tool: string
  model_id: string | null
  storage_path: string
  created_at: string
  expires_at: string | null
  signedUrl: string
}

export type ShootModel = {
  id: string
  name: string
  image_url: string | null
}

export type ShootStats = {
  totalProductions: number
  totalDownloads: number
}

type ImageRow = {
  id: string
  generation_id: string
  tool: string
  model_id: string | null
  storage_path: string
  created_at: string
  expires_at: string | null
}

async function attachSignedUrls(rows: ImageRow[]): Promise<ShootImage[]> {
  if (!rows.length) return []
  const supabase = createClient()
  const paths = rows.map((r) => r.storage_path)
  const { data, error } = await supabase.storage.from('outputs').createSignedUrls(paths, 3600)
  if (error || !data) return []

  const urlByPath = new Map(
    data.filter((d) => d.signedUrl && !d.error).map((d) => [d.path, d.signedUrl] as const)
  )

  return rows
    .map((row) => {
      const signedUrl = urlByPath.get(row.storage_path)
      if (!signedUrl) return null
      return { ...row, signedUrl }
    })
    .filter((r): r is ShootImage => r !== null)
}

export async function fetchShootStats(userId: string): Promise<ShootStats> {
  const supabase = createClient()

  const [gensRes, dlRes] = await Promise.all([
    supabase.from('generations').select('image_count').eq('user_id', userId),
    supabase.from('downloads').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  const totalProductions = (gensRes.data ?? []).reduce(
    (sum, row) => sum + ((row as { image_count?: number }).image_count ?? 0),
    0
  )
  const totalDownloads = dlRes.count ?? 0

  return { totalProductions, totalDownloads }
}

export async function fetchShootImages(
  userId: string,
  opts: { offset: number; limit: number; tool?: string | null; modelId?: string | null }
): Promise<ShootImage[]> {
  const supabase = createClient()

  let query = supabase
    .from('generation_images')
    .select('id, generation_id, tool, model_id, storage_path, created_at, expires_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(opts.offset, opts.offset + opts.limit - 1)

  if (opts.tool) query = query.eq('tool', opts.tool)
  if (opts.modelId) query = query.eq('model_id', opts.modelId)

  const { data, error } = await query
  if (error || !data?.length) return []

  return attachSignedUrls(data as ImageRow[])
}

export async function fetchShootTools(userId: string): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('generation_images')
    .select('tool')
    .eq('user_id', userId)
    .is('deleted_at', null)

  const tools = [...new Set((data ?? []).map((row) => row.tool).filter(Boolean) as string[])]
  return tools.sort()
}

export async function fetchShootModels(userId: string): Promise<ShootModel[]> {
  const supabase = createClient()
  const { data: imgData } = await supabase
    .from('generation_images')
    .select('model_id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .not('model_id', 'is', null)

  const ids = [...new Set((imgData ?? []).map((row) => row.model_id).filter(Boolean) as string[])]
  if (!ids.length) return []

  const { data: models } = await supabase.from('models').select('id, name, image_url').in('id', ids)
  return (models as ShootModel[]) ?? []
}

export async function recordDownload(userId: string, generationImageId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('downloads').insert({
    user_id: userId,
    generation_image_id: generationImageId,
  })
  if (error) console.error('download record failed', error)
}

export function groupShootImages(images: ShootImage[]): { generationId: string; images: ShootImage[] }[] {
  const map = new Map<string, ShootImage[]>()
  const order: string[] = []

  for (const img of images) {
    if (!map.has(img.generation_id)) {
      map.set(img.generation_id, [])
      order.push(img.generation_id)
    }
    map.get(img.generation_id)!.push(img)
  }

  return order.map((generationId) => ({ generationId, images: map.get(generationId)! }))
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function downloadShootImage(url: string, filename: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('download fetch failed')
  const blob = await res.blob()
  triggerBlobDownload(blob, filename.endsWith('.png') ? filename : `${filename}.png`)
}

export async function downloadShootsZip(images: ShootImage[], zipFilename: string): Promise<void> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  for (let i = 0; i < images.length; i++) {
    const img = images[i]
    const res = await fetch(img.signedUrl)
    if (!res.ok) continue
    const blob = await res.blob()
    const date = new Date(img.created_at).toISOString().slice(0, 10)
    zip.file(`liora-${img.tool}-${date}-${i + 1}.png`, blob)
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  triggerBlobDownload(zipBlob, zipFilename.endsWith('.zip') ? zipFilename : `${zipFilename}.zip`)
}

export function shootImageFilename(img: ShootImage, index: number): string {
  const date = new Date(img.created_at).toISOString().slice(0, 10)
  return `liora-${img.tool}-${date}-${index + 1}.png`
}
