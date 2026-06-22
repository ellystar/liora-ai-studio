'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  createGeneralModel,
  createPrivateModel,
  deleteModel,
  listAdminModels,
  lookupUserIdByEmail,
  resolveModelDisplayUrls,
  updateModelGender,
  type AdminModel,
} from '@/lib/admin/models'

const inputCls =
  'w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600'

export default function ModelsAdmin() {
  const [items, setItems] = useState<AdminModel[]>([])
  const [displayUrls, setDisplayUrls] = useState<Record<string, string>>({})
  const [fileKey, setFileKey] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [assignment, setAssignment] = useState<'general' | 'private'>('general')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const models = await listAdminModels()
    const urls = await resolveModelDisplayUrls(models)
    setItems(models)
    setDisplayUrls(urls)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd() {
    setError(null)
    if (!file || !name.trim()) {
      setError('Görsel ve isim zorunlu.')
      return
    }
    setSaving(true)
    try {
      const genderVal = gender || null
      if (assignment === 'general') {
        await createGeneralModel(name.trim(), genderVal, file)
      } else {
        if (!ownerEmail.trim()) {
          setError('Kullanıcı e-postası gerekli.')
          setSaving(false)
          return
        }
        const ownerId = await lookupUserIdByEmail(ownerEmail)
        if (!ownerId) {
          setError('Bu e-postayla kullanıcı bulunamadı')
          setSaving(false)
          return
        }
        await createPrivateModel(name.trim(), genderVal, ownerId, file)
      }
      setName('')
      setFile(null)
      setOwnerEmail('')
      setAssignment('general')
      setGender('')
      setFileKey((k) => k + 1)
      await load()
    } catch (e) {
      setError('Hata: ' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleGenderChange(id: string, value: string) {
    const genderVal = value || null
    await updateModelGender(id, genderVal)
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, gender: genderVal } : m)))
  }

  async function handleDelete(model: AdminModel) {
    await deleteModel(model)
    await load()
  }

  return (
    <div>
      <div className="rounded-2xl border border-[#242424] bg-[#141414] p-5">
        <p className="mb-4 text-sm font-medium text-neutral-100">Yeni manken ekle</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            key={fileKey}
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className={inputCls}
          />
          <input
            type="text"
            placeholder="İsim"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
          <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls}>
            <option value="">Cinsiyet (opsiyonel)</option>
            <option value="female">Kadın</option>
            <option value="male">Erkek</option>
          </select>
          <select value={assignment} onChange={(e) => setAssignment(e.target.value as 'general' | 'private')} className={inputCls}>
            <option value="general">Genel (herkes görür)</option>
            <option value="private">Bir kullanıcıya özel</option>
          </select>
          {assignment === 'private' && (
            <input
              type="email"
              placeholder="Kullanıcı e-postası"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              className={`${inputCls} sm:col-span-2`}
            />
          )}
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button
          onClick={handleAdd}
          disabled={saving}
          className="mt-4 rounded-lg bg-white px-5 py-2 text-sm font-medium text-[#0a0a0a] disabled:opacity-50"
        >
          {saving ? 'Ekleniyor...' : 'Ekle'}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((m) => (
          <div key={m.id} className="overflow-hidden rounded-xl border border-[#242424] bg-[#141414]">
            {displayUrls[m.id] ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={displayUrls[m.id]} alt={m.name} className="aspect-[3/4] w-full object-cover" />
            ) : (
              <div className="flex aspect-[3/4] w-full items-center justify-center bg-[#1c1c1c] text-[10px] text-neutral-600">
                Görsel yok
              </div>
            )}
            <div className="p-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-200">{m.name}</p>
                <button
                  onClick={() => handleDelete(m)}
                  aria-label="Sil"
                  className="text-neutral-500 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <select
                value={m.gender ?? ''}
                onChange={(e) => handleGenderChange(m.id, e.target.value)}
                className="mt-1.5 w-full rounded border border-[#333] bg-[#0f0f0f] px-1 py-0.5 text-[10px] text-neutral-300 outline-none"
              >
                <option value="">Cinsiyet yok</option>
                <option value="female">Kadın</option>
                <option value="male">Erkek</option>
              </select>
              <span
                className={`mt-1.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] ${
                  m.owner_id ? 'bg-[#1f3a2c] text-[#7fd6a8]' : 'bg-[#262626] text-neutral-400'
                }`}
              >
                {m.owner_id ? 'Kullanıcıya özel' : 'Genel'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
