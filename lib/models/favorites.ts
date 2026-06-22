'use client'

import { createClient } from '@/lib/supabase/client'

export type ModelFilter = 'all' | 'general' | 'own' | 'female' | 'male' | 'favorites'

export async function listFavoriteModelIds(): Promise<Set<string>> {
  const s = createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return new Set()
  const { data } = await s.from('model_favorites').select('model_id').eq('user_id', user.id)
  return new Set((data ?? []).map((r) => r.model_id as string))
}

export async function toggleFavoriteModel(modelId: string, makeFav: boolean): Promise<void> {
  const s = createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('not_authenticated')
  if (makeFav) {
    await s.from('model_favorites').insert({ user_id: user.id, model_id: modelId })
  } else {
    await s.from('model_favorites').delete().eq('user_id', user.id).eq('model_id', modelId)
  }
}

export function filterModels<T extends { id: string; scope?: string | null; gender?: string | null }>(
  models: T[],
  filter: ModelFilter,
  favIds: Set<string>,
): T[] {
  switch (filter) {
    case 'general':
      return models.filter((m) => m.scope === 'general')
    case 'own':
      return models.filter((m) => m.scope === 'own')
    case 'female':
      return models.filter((m) => m.gender === 'female')
    case 'male':
      return models.filter((m) => m.gender === 'male')
    case 'favorites':
      return models.filter((m) => favIds.has(m.id))
    default:
      return models
  }
}
