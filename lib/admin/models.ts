import { createClient } from '@/lib/supabase/client'
import { uploadAsset } from '@/lib/admin/upload'

export type AdminModel = {
  id: string
  name: string
  gender: string | null
  image_url: string | null
  image_path: string | null
  owner_id: string | null
  scope: string | null
  source: string | null
  created_at?: string
}

export class UserNotFoundError extends Error {
  constructor() {
    super('user_not_found')
    this.name = 'UserNotFoundError'
  }
}

const USER_MODELS_BUCKET = 'user-models'

export async function getModelDisplayUrl(
  model: Pick<AdminModel, 'image_url' | 'image_path'>,
  supabase = createClient()
): Promise<string | null> {
  if (model.image_path) {
    const { data } = await supabase.storage
      .from(USER_MODELS_BUCKET)
      .createSignedUrl(model.image_path, 3600)
    return data?.signedUrl ?? null
  }
  return model.image_url
}

export async function lookupUserIdByEmail(email: string): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('admin_user_id_by_email', { p_email: email.trim() })
  if (error) throw error
  return (data as string | null) ?? null
}

export async function lookupEmailByUserId(userId: string): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('admin_email_by_user_id', { p_user_id: userId })
  if (error) throw error
  return (data as string | null) ?? null
}

async function resolveAssignment(assignEmail: string | null): Promise<{ owner_id: string | null; scope: 'general' | 'own' }> {
  if (!assignEmail?.trim()) {
    return { owner_id: null, scope: 'general' }
  }
  const ownerId = await lookupUserIdByEmail(assignEmail)
  if (!ownerId) throw new UserNotFoundError()
  return { owner_id: ownerId, scope: 'own' }
}

export async function uploadPrivateModelFile(ownerId: string, file: File): Promise<string> {
  const supabase = createClient()
  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const path = `${ownerId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(USER_MODELS_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw error
  return path
}

export async function createModel(
  name: string,
  gender: string | null,
  file: File,
  assignEmail: string | null
): Promise<void> {
  const { owner_id, scope } = await resolveAssignment(assignEmail)
  const supabase = createClient()

  if (owner_id) {
    const image_path = await uploadPrivateModelFile(owner_id, file)
    const { error } = await supabase.from('models').insert({
      name,
      gender,
      owner_id,
      scope,
      source: 'admin',
      image_path,
      image_url: null,
    })
    if (error) throw error
    return
  }

  const image_url = await uploadAsset('models', file)
  const { error } = await supabase.from('models').insert({
    name,
    gender,
    owner_id: null,
    scope: 'general',
    source: 'admin',
    image_url,
    image_path: null,
  })
  if (error) throw error
}

export async function updateModel(
  modelId: string,
  opts: { assignEmail: string | null; gender: string | null }
): Promise<void> {
  const { owner_id, scope } = await resolveAssignment(opts.assignEmail)
  const supabase = createClient()
  const { error } = await supabase
    .from('models')
    .update({ gender: opts.gender, owner_id, scope })
    .eq('id', modelId)
  if (error) throw error
}

export async function deleteModel(model: AdminModel): Promise<void> {
  const supabase = createClient()
  if (model.image_path) {
    await supabase.storage.from(USER_MODELS_BUCKET).remove([model.image_path])
  }
  const { error } = await supabase.from('models').delete().eq('id', model.id)
  if (error) throw error
}

export async function listAdminModels(): Promise<AdminModel[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('models')
    .select('id,name,gender,image_url,image_path,owner_id,scope,source,created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as AdminModel[]) ?? []
}

export async function resolveModelDisplayUrls(
  models: AdminModel[]
): Promise<Record<string, string>> {
  const supabase = createClient()
  const urls: Record<string, string> = {}
  await Promise.all(
    models.map(async (m) => {
      const url = await getModelDisplayUrl(m, supabase)
      if (url) urls[m.id] = url
    })
  )
  return urls
}

export async function resolveOwnerEmails(models: AdminModel[]): Promise<Record<string, string>> {
  const emails: Record<string, string> = {}
  await Promise.all(
    models
      .filter((m) => m.owner_id)
      .map(async (m) => {
        const email = await lookupEmailByUserId(m.owner_id!)
        if (email) emails[m.id] = email
      })
  )
  return emails
}
