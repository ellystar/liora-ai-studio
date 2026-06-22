'use client'

import { createClient } from '@/lib/supabase/client'

export type PoseFilter = 'all' | 'full_body' | 'medium_shot' | 'close_up' | 'favorites'

export async function listFavoritePoseIds(): Promise<Set<string>> {
  const s = createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) return new Set()
  const { data } = await s.from('pose_favorites').select('pose_id').eq('user_id', user.id)
  return new Set((data ?? []).map((r) => r.pose_id as string))
}

export async function toggleFavoritePose(poseId: string, makeFav: boolean): Promise<void> {
  const s = createClient()
  const { data: { user } } = await s.auth.getUser()
  if (!user) throw new Error('not_authenticated')
  if (makeFav) {
    await s.from('pose_favorites').insert({ user_id: user.id, pose_id: poseId })
  } else {
    await s.from('pose_favorites').delete().eq('user_id', user.id).eq('pose_id', poseId)
  }
}

export function filterPoses<T extends { id: string; shot_type?: string | null }>(
  poses: T[],
  filter: PoseFilter,
  favIds: Set<string>
): T[] {
  if (filter === 'all') return poses
  if (filter === 'favorites') return poses.filter((p) => favIds.has(p.id))
  return poses.filter((p) => p.shot_type === filter)
}
