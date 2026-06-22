'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  createModel,
  deleteModel,
  listAdminModels,
  lookupEmailByUserId,
  resolveModelDisplayUrls,
  resolveOwnerEmails,
  updateModel,
  UserNotFoundError,
  type AdminModel,
} from '@/lib/admin/models'

const inputCls =
  'w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600'

const cardSelectCls =
  'mt-1.5 w-full rounded border border-[#333] bg-[#0f0f0f] px-1 py-0.5 text-[10px] text-neutral-300 outline-none'

type Assignment = 'general' | 'private'

function AssignmentPicker({
  value,
  onChange,
}: {
  value: Assignment
  onChange: (v: Assignment) => void
}) {
  const btn = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-left text-xs transition ${
      active
        ? 'border-white bg-white/10 text-neutral-100'
        : 'border-[#333] text-neutral-400 hover:border-[#444] hover:text-neutral-300'
    }`

  return (
    <div className="flex flex-col gap-1.5 sm:col-span-2">
      <button type="button" onClick={() => onChange('general')} className={btn(value === 'general')}>
        Genel (herkes görür)
      </button>
      <button type="button" onClick={() => onChange('private')} className={btn(value === 'private')}>
        Bir kullanıcıya özel
      </button>
    </div>
  )
}

function ModelCard({
  model,
  displayUrl,
  initialEmail,
  onDelete,
  onUpdated,
}: {
  model: AdminModel
  displayUrl?: string
  initialEmail?: string
  onDelete: () => void
  onUpdated: () => void
}) {
  const savedAssignment: Assignment = model.owner_id ? 'private' : 'general'
  const [assignment, setAssignment] = useState<Assignment>(savedAssignment)
  const [email, setEmail] = useState(initialEmail ?? '')
  const [emailLoading, setEmailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)

  useEffect(() => {
    setAssignment(savedAssignment)
    setCardError(null)
    if (model.owner_id) {
      if (initialEmail) {
        setEmail(initialEmail)
      } else {
        setEmailLoading(true)
        lookupEmailByUserId(model.owner_id)
          .then((e) => setEmail(e ?? ''))
          .catch((err) => setCardError('Hata: ' + (err as Error).message))
          .finally(() => setEmailLoading(false))
      }
    } else {
      setEmail('')
    }
  }, [model.id, model.owner_id, initialEmail, savedAssignment])

  async function resolveAssignEmailForGender(): Promise<string | null> {
    if (!model.owner_id) return null
    const em = (initialEmail ?? email).trim()
    if (em) return em
    return lookupEmailByUserId(model.owner_id)
  }

  async function handleGenderChange(value: string) {
    setCardError(null)
    try {
      const assignEmail = await resolveAssignEmailForGender()
      await updateModel(model.id, { assignEmail, gender: value || null })
      onUpdated()
    } catch (e) {
      if (e instanceof UserNotFoundError) {
        setCardError('Bu e-postayla kullanıcı bulunamadı')
      } else {
        setCardError('Hata: ' + (e as Error).message)
      }
    }
  }

  async function handleAssignmentSave() {
    setCardError(null)
    if (assignment === 'private' && !email.trim()) {
      setCardError('Kullanıcı e-postası gerekli.')
      return
    }
    setSaving(true)
    try {
      const assignEmail = assignment === 'private' ? email.trim() : null
      await updateModel(model.id, { assignEmail, gender: model.gender })
      onUpdated()
    } catch (e) {
      if (e instanceof UserNotFoundError) {
        setCardError('Bu e-postayla kullanıcı bulunamadı')
      } else {
        setCardError('Hata: ' + (e as Error).message)
      }
    } finally {
      setSaving(false)
    }
  }

  const showSave =
    assignment === 'private' || (assignment === 'general' && savedAssignment === 'private')

  return (
    <div className="overflow-hidden rounded-xl border border-[#242424] bg-[#141414]">
      {displayUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={displayUrl} alt={model.name} className="aspect-[3/4] w-full object-cover" />
      ) : (
        <div className="flex aspect-[3/4] w-full items-center justify-center bg-[#1c1c1c] text-[10px] text-neutral-600">
          Görsel yok
        </div>
      )}
      <div className="p-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-200">{model.name}</p>
          <button
            onClick={onDelete}
            aria-label="Sil"
            className="text-neutral-500 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <select
          value={model.gender ?? ''}
          onChange={(e) => handleGenderChange(e.target.value)}
          className={cardSelectCls}
        >
          <option value="">Cinsiyet yok</option>
          <option value="female">Kadın</option>
          <option value="male">Erkek</option>
        </select>

        <select
          value={assignment}
          onChange={(e) => {
            setAssignment(e.target.value as Assignment)
            setCardError(null)
          }}
          className={cardSelectCls}
        >
          <option value="general">Genel</option>
          <option value="private">Bir kullanıcıya özel</option>
        </select>

        {assignment === 'private' && (
          <div className="mt-1 space-y-1">
            <input
              type="email"
              placeholder="kullanici@ornek.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={emailLoading}
              className="w-full rounded border border-[#333] bg-[#0f0f0f] px-1 py-0.5 text-[10px] text-neutral-300 outline-none focus:border-neutral-600 disabled:opacity-50"
            />
            {emailLoading && (
              <p className="text-[9px] text-neutral-600">E-posta yükleniyor...</p>
            )}
          </div>
        )}

        {showSave && (
          <button
            type="button"
            onClick={handleAssignmentSave}
            disabled={saving || emailLoading}
            className="mt-1.5 w-full rounded border border-[#333] px-2 py-0.5 text-[10px] text-neutral-300 transition hover:border-[#444] hover:text-neutral-100 disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        )}

        {cardError && <p className="mt-1 text-[9px] text-red-400">{cardError}</p>}
      </div>
    </div>
  )
}

export default function ModelsAdmin() {
  const [items, setItems] = useState<AdminModel[]>([])
  const [displayUrls, setDisplayUrls] = useState<Record<string, string>>({})
  const [ownerEmails, setOwnerEmails] = useState<Record<string, string>>({})

  const [fileKey, setFileKey] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [assignment, setAssignment] = useState<Assignment>('general')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const models = await listAdminModels()
    const [urls, emails] = await Promise.all([
      resolveModelDisplayUrls(models),
      resolveOwnerEmails(models),
    ])
    setItems(models)
    setDisplayUrls(urls)
    setOwnerEmails(emails)
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
    if (assignment === 'private' && !ownerEmail.trim()) {
      setError('Kullanıcı e-postası gerekli.')
      return
    }
    setSaving(true)
    try {
      const assignEmail = assignment === 'private' ? ownerEmail.trim() : null
      await createModel(name.trim(), gender || null, file, assignEmail)
      setName('')
      setFile(null)
      setOwnerEmail('')
      setAssignment('general')
      setGender('')
      setFileKey((k) => k + 1)
      await load()
    } catch (e) {
      if (e instanceof UserNotFoundError) {
        setError('Bu e-postayla kullanıcı bulunamadı')
      } else {
        setError('Hata: ' + (e as Error).message)
      }
    } finally {
      setSaving(false)
    }
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
          <AssignmentPicker value={assignment} onChange={setAssignment} />
          {assignment === 'private' && (
            <input
              type="email"
              placeholder="kullanici@ornek.com"
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
          <ModelCard
            key={m.id}
            model={m}
            displayUrl={displayUrls[m.id]}
            initialEmail={ownerEmails[m.id]}
            onDelete={() => handleDelete(m)}
            onUpdated={load}
          />
        ))}
      </div>
    </div>
  )
}
