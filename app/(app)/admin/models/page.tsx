'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uploadAsset } from '@/lib/admin/upload'

type Model = {
  id: string
  name: string
  gender: string | null
  image_url: string
  scope: string
  owner_user_id: string | null
}

const inputCls = 'w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600'

export default function ModelsAdmin() {
  const supabase = createClient()
  const [items, setItems] = useState<Model[]>([])
  const [fileKey, setFileKey] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [gender, setGender] = useState('female')
  const [scope, setScope] = useState('general')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase.from('models').select('*').order('created_at', { ascending: false })
    setItems((data as Model[]) ?? [])
  }
  useEffect(() => {
    load()
  }, [])

  async function handleAdd() {
    setError(null)
    if (!file || !name) {
      setError('Görsel ve isim zorunlu.')
      return
    }
    setSaving(true)
    try {
      let owner_user_id: string | null = null
      if (scope === 'own') {
        if (!ownerEmail) {
          setError('Own manken için kullanıcı e-postası gerekli.')
          setSaving(false)
          return
        }
        const { data: prof } = await supabase.from('profiles').select('id').eq('email', ownerEmail).single()
        if (!prof) {
          setError('Bu e-postaya sahip kullanıcı bulunamadı.')
          setSaving(false)
          return
        }
        owner_user_id = prof.id
      }
      const image_url = await uploadAsset('models', file)
      const { error: insErr } = await supabase.from('models').insert({ name, gender, image_url, scope, owner_user_id })
      if (insErr) throw insErr
      setName('')
      setFile(null)
      setOwnerEmail('')
      setScope('general')
      setGender('female')
      setFileKey((k) => k + 1)
      await load()
    } catch (e) {
      setError('Hata: ' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('models').delete().eq('id', id)
    await load()
  }

  return (
    <div>
      <div className="rounded-2xl border border-[#242424] bg-[#141414] p-5">
        <p className="mb-4 text-sm font-medium text-neutral-100">Yeni manken ekle</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input key={fileKey} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={inputCls} />
          <input type="text" placeholder="İsim" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls}>
            <option value="female">Kadın</option>
            <option value="male">Erkek</option>
            <option value="unisex">Unisex</option>
          </select>
          <select value={scope} onChange={(e) => setScope(e.target.value)} className={inputCls}>
            <option value="general">General (herkes görür)</option>
            <option value="own">Own (kullanıcıya özel)</option>
          </select>
          {scope === 'own' && (
            <input type="email" placeholder="Kullanıcı e-postası" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className={`${inputCls} sm:col-span-2`} />
          )}
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button onClick={handleAdd} disabled={saving} className="mt-4 rounded-lg bg-white px-5 py-2 text-sm font-medium text-[#0a0a0a] disabled:opacity-50">
          {saving ? 'Ekleniyor...' : 'Ekle'}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((m) => (
          <div key={m.id} className="overflow-hidden rounded-xl border border-[#242424] bg-[#141414]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.image_url} alt={m.name} className="aspect-[3/4] w-full object-cover" />
            <div className="p-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-200">{m.name}</p>
                <button onClick={() => handleDelete(m.id)} aria-label="Sil" className="text-neutral-500 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] ${m.scope === 'own' ? 'bg-[#1f3a2c] text-[#7fd6a8]' : 'bg-[#262626] text-neutral-400'}`}>{m.scope}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
