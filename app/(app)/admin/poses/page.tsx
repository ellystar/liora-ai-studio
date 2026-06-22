'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uploadAsset } from '@/lib/admin/upload'

type ShotType = 'full_body' | 'medium_shot' | 'close_up'
type PoseCategory = 'general' | 'shoe'
type Pose = {
  id: string
  name: string
  thumbnail_url: string
  prompt: string
  shot_type: ShotType | null
  category: PoseCategory
}

const SHOT_TYPE_OPTIONS: { value: '' | ShotType; label: string }[] = [
  { value: '', label: '—' },
  { value: 'full_body', label: 'Tam boy' },
  { value: 'medium_shot', label: 'Orta plan' },
  { value: 'close_up', label: 'Yakın çekim' },
]

const CATEGORY_OPTIONS: { value: PoseCategory; label: string }[] = [
  { value: 'general', label: 'Genel' },
  { value: 'shoe', label: 'Ayakkabı' },
]

const inputCls = 'w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600'

export default function PosesAdmin() {
  const supabase = createClient()
  const [items, setItems] = useState<Pose[]>([])
  const [fileKey, setFileKey] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [shotType, setShotType] = useState<'' | ShotType>('')
  const [category, setCategory] = useState<PoseCategory>('general')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase.from('poses').select('*').order('created_at', { ascending: false })
    setItems((data as Pose[]) ?? [])
  }
  useEffect(() => {
    load()
  }, [])

  async function handleAdd() {
    setError(null)
    if (!file || !name || !prompt) {
      setError('Görsel, isim ve prompt zorunlu.')
      return
    }
    setSaving(true)
    try {
      const thumbnail_url = await uploadAsset('poses', file)
      const { error: insErr } = await supabase.from('poses').insert({
        name,
        thumbnail_url,
        prompt,
        shot_type: shotType || null,
        category,
      })
      if (insErr) throw insErr
      setName('')
      setPrompt('')
      setShotType('')
      setCategory('general')
      setFile(null)
      setFileKey((k) => k + 1)
      await load()
    } catch (e) {
      setError('Hata: ' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleShotTypeChange(id: string, value: string) {
    const next = (value || null) as ShotType | null
    const { error: updErr } = await supabase.from('poses').update({ shot_type: next }).eq('id', id)
    if (updErr) {
      setError('Hata: ' + updErr.message)
      return
    }
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, shot_type: next } : p)))
  }

  async function handleCategoryChange(id: string, value: PoseCategory) {
    const { error: updErr } = await supabase.from('poses').update({ category: value }).eq('id', id)
    if (updErr) {
      setError('Hata: ' + updErr.message)
      return
    }
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, category: value } : p)))
  }

  async function handleDelete(id: string) {
    await supabase.from('poses').delete().eq('id', id)
    await load()
  }

  return (
    <div>
      <div className="rounded-2xl border border-[#242424] bg-[#141414] p-5">
        <p className="mb-4 text-sm font-medium text-neutral-100">Yeni poz ekle</p>
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input key={fileKey} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={inputCls} title="Thumbnail görseli" />
            <input type="text" placeholder="Poz adı" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs text-neutral-500">Çekim tipi</p>
              <select
                value={shotType}
                onChange={(e) => setShotType(e.target.value as '' | ShotType)}
                className={inputCls}
              >
                {SHOT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value || 'none'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="mb-1.5 text-xs text-neutral-500">Kategori</p>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PoseCategory)}
                className={inputCls}
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <textarea placeholder="Prompt (Gemini'a gönderilecek)" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className={inputCls} />
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button onClick={handleAdd} disabled={saving} className="mt-4 rounded-lg bg-white px-5 py-2 text-sm font-medium text-[#0a0a0a] disabled:opacity-50">
          {saving ? 'Ekleniyor...' : 'Ekle'}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((p) => (
          <div key={p.id} className="overflow-hidden rounded-xl border border-[#242424] bg-[#141414]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumbnail_url} alt={p.name} className="aspect-[3/4] w-full object-cover" />
            <div className="p-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-200">{p.name}</p>
                <button onClick={() => handleDelete(p.id)} aria-label="Sil" className="text-neutral-500 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <select
                value={p.shot_type ?? ''}
                onChange={(e) => handleShotTypeChange(p.id, e.target.value)}
                className="mt-1.5 w-full rounded border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-[10px] text-neutral-300 outline-none focus:border-neutral-600"
                aria-label={`Çekim tipi: ${p.name}`}
              >
                {SHOT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value || 'none'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                value={p.category ?? 'general'}
                onChange={(e) => handleCategoryChange(p.id, e.target.value as PoseCategory)}
                className="mt-1 w-full rounded border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-[10px] text-neutral-300 outline-none focus:border-neutral-600"
                aria-label={`Kategori: ${p.name}`}
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 line-clamp-2 text-[10px] text-neutral-500">{p.prompt}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
