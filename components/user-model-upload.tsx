'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import { uploadUserModel, type NewUserModel } from '@/lib/models/user-models'

export function UserModelUpload({ open, onClose, onAdded }: {
  open: boolean
  onClose: () => void
  onAdded: (model: NewUserModel) => void
}) {
  const { t } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'female' | 'male' | ''>('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!open) return null

  async function submit() {
    if (!file || !name.trim()) return
    setBusy(true)
    setErr(null)
    try {
      const m = await uploadUserModel(file, { name: name.trim(), gender: gender || null })
      onAdded(m)
      setFile(null)
      setName('')
      setGender('')
      onClose()
    } catch {
      setErr(t('models.upload.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-[#242424] bg-[#141414] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-100">{t('models.upload.title')}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-xs text-neutral-300 file:mr-3 file:rounded-lg file:border file:border-[#2a2a2a] file:bg-[#1c1c1c] file:px-3 file:py-1.5 file:text-xs file:text-neutral-200"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('models.upload.namePlaceholder')}
            className="w-full rounded-lg border border-[#242424] bg-[#141414] px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-[#3a3a3a]"
          />
          <div className="flex gap-2">
            {(['female', 'male'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(gender === g ? '' : g)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${gender === g ? 'border-white text-neutral-100' : 'border-[#2a2a2a] text-neutral-400 hover:text-neutral-200'}`}
              >
                {g === 'female' ? t('models.filter.female') : t('models.filter.male')}
              </button>
            ))}
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
          <button
            onClick={submit}
            disabled={!file || !name.trim() || busy}
            className="w-full rounded-lg bg-white py-2.5 text-sm font-medium text-[#0a0a0a] disabled:opacity-40"
          >
            {busy ? t('models.upload.uploading') : t('models.upload.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
