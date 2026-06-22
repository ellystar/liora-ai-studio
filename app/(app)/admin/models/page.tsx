'use client'

import { useEffect, useState } from 'react'
import { Trash2, X } from 'lucide-react'
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

const smallInputCls =
  'w-full rounded border border-[#333] bg-[#0f0f0f] px-2 py-1 text-xs text-neutral-200 outline-none focus:border-neutral-600'

type Assignment = 'general' | 'private'

function AssignmentPicker({
  value,
  onChange,
  compact = false,
}: {
  value: Assignment
  onChange: (v: Assignment) => void
  compact?: boolean
}) {
  const btn = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-left transition ${compact ? 'text-[10px]' : 'text-xs'} ${
      active
        ? 'border-white bg-white/10 text-neutral-100'
        : 'border-[#333] text-neutral-400 hover:border-[#444] hover:text-neutral-300'
    }`

  return (
    <div className={`flex flex-col gap-1.5 ${compact ? '' : 'sm:col-span-2'}`}>
      <button type="button" onClick={() => onChange('general')} className={btn(value === 'general')}>
        Genel (herkes görür)
      </button>
      <button type="button" onClick={() => onChange('private')} className={btn(value === 'private')}>
        Bir kullanıcıya özel
      </button>
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

  const [editModel, setEditModel] = useState<AdminModel | null>(null)
  const [editAssignment, setEditAssignment] = useState<Assignment>('general')
  const [editEmail, setEditEmail] = useState('')
  const [editGender, setEditGender] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

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

  async function openEdit(model: AdminModel) {
    setEditModel(model)
    setEditGender(model.gender ?? '')
    setEditError(null)
    setEditLoading(true)
    try {
      if (model.owner_id) {
        setEditAssignment('private')
        const email = await lookupEmailByUserId(model.owner_id)
        setEditEmail(email ?? '')
      } else {
        setEditAssignment('general')
        setEditEmail('')
      }
    } catch (e) {
      setEditError('Hata: ' + (e as Error).message)
    } finally {
      setEditLoading(false)
    }
  }

  function closeEdit() {
    setEditModel(null)
    setEditError(null)
  }

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

  async function handleEditSave() {
    if (!editModel) return
    setEditError(null)
    if (editAssignment === 'private' && !editEmail.trim()) {
      setEditError('Kullanıcı e-postası gerekli.')
      return
    }
    setEditSaving(true)
    try {
      const assignEmail = editAssignment === 'private' ? editEmail.trim() : null
      await updateModel(editModel.id, { assignEmail, gender: editGender || null })
      closeEdit()
      await load()
    } catch (e) {
      if (e instanceof UserNotFoundError) {
        setEditError('Bu e-postayla kullanıcı bulunamadı')
      } else {
        setEditError('Hata: ' + (e as Error).message)
      }
    } finally {
      setEditSaving(false)
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
              <p className="mt-1 text-[10px] text-neutral-500">
                {m.gender === 'female' ? 'Kadın' : m.gender === 'male' ? 'Erkek' : 'Cinsiyet yok'}
              </p>
              <span
                className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] ${
                  m.owner_id ? 'bg-[#1f3a2c] text-[#7fd6a8]' : 'bg-[#262626] text-neutral-400'
                }`}
              >
                {m.owner_id ? 'Kullanıcıya özel' : 'Genel'}
              </span>
              {m.owner_id && ownerEmails[m.id] && (
                <p className="mt-0.5 truncate text-[9px] text-neutral-500">{ownerEmails[m.id]}</p>
              )}
              <button
                type="button"
                onClick={() => openEdit(m)}
                className="mt-2 w-full rounded border border-[#333] px-2 py-0.5 text-[10px] text-neutral-400 transition hover:border-[#444] hover:text-neutral-200"
              >
                Atamayı değiştir
              </button>
            </div>
          </div>
        ))}
      </div>

      {editModel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={closeEdit} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#242424] bg-[#141414] p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-100">Atamayı değiştir</p>
              <button type="button" onClick={closeEdit} className="text-neutral-500 hover:text-neutral-300">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-xs text-neutral-500">{editModel.name}</p>
            {editLoading ? (
              <p className="text-xs text-neutral-500">Yükleniyor...</p>
            ) : (
              <div className="space-y-3">
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className={smallInputCls}
                >
                  <option value="">Cinsiyet (opsiyonel)</option>
                  <option value="female">Kadın</option>
                  <option value="male">Erkek</option>
                </select>
                <AssignmentPicker value={editAssignment} onChange={setEditAssignment} compact />
                {editAssignment === 'private' && (
                  <input
                    type="email"
                    placeholder="kullanici@ornek.com"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className={smallInputCls}
                  />
                )}
                {editError && <p className="text-xs text-red-400">{editError}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="flex-1 rounded-lg border border-[#333] py-1.5 text-xs text-neutral-400 hover:text-neutral-200"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleEditSave}
                    disabled={editSaving}
                    className="flex-1 rounded-lg bg-white py-1.5 text-xs font-medium text-[#0a0a0a] disabled:opacity-50"
                  >
                    {editSaving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
