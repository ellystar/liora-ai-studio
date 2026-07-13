'use client'

import { useCallback, useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  countStylesInCategory,
  createAdminStyle,
  createStyleCategory,
  deleteStyle,
  deleteStyleCategory,
  listStyleCategories,
  listStyles,
  resolveStyleSignedUrls,
  updateStyle,
  updateStyleCategory,
  type Style,
  type StyleCategory,
} from '@/lib/admin/styles'

const inputCls =
  'w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600'

const compactInputCls =
  'rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-white outline-none focus:border-neutral-600'

const cardSelectCls =
  'mt-1.5 w-full rounded border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-[10px] text-neutral-300 outline-none focus:border-neutral-600'

type StyleTab = 'admin' | 'user'

export default function StylesAdmin() {
  const [categories, setCategories] = useState<StyleCategory[]>([])
  const [adminStyles, setAdminStyles] = useState<Style[]>([])
  const [userStyles, setUserStyles] = useState<Style[]>([])
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<StyleTab>('admin')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [newCatName, setNewCatName] = useState('')
  const [newCatSort, setNewCatSort] = useState('')

  const [fileKey, setFileKey] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [styleName, setStyleName] = useState('')
  const [styleCategoryId, setStyleCategoryId] = useState('')

  const loadCategories = useCallback(async () => {
    const data = await listStyleCategories()
    setCategories(data)
    return data
  }, [])

  const loadStyles = useCallback(async () => {
    const [admin, user] = await Promise.all([listStyles('admin'), listStyles('user')])
    setAdminStyles(admin)
    setUserStyles(user)
    const urls = await resolveStyleSignedUrls([...admin, ...user])
    setSignedUrls(urls)
  }, [])

  const load = useCallback(async () => {
    await Promise.all([loadCategories(), loadStyles()])
  }, [loadCategories, loadStyles])

  useEffect(() => {
    load().catch((e) => setError('Hata: ' + (e as Error).message))
  }, [load])

  const categoryNameById = Object.fromEntries(categories.map((c) => [c.id, c.name]))

  async function handleAddCategory() {
    setError(null)
    if (!newCatName.trim()) {
      setError('Kategori adı zorunlu.')
      return
    }
    setSaving(true)
    try {
      const sort = newCatSort.trim() ? Number(newCatSort) : (categories.at(-1)?.sort ?? 0) + 10
      await createStyleCategory(newCatName.trim(), sort)
      setNewCatName('')
      setNewCatSort('')
      await loadCategories()
    } catch (e) {
      setError('Hata: ' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCategoryNameBlur(cat: StyleCategory, name: string) {
    if (name.trim() === cat.name) return
    if (!name.trim()) return
    setError(null)
    try {
      await updateStyleCategory(cat.id, { name: name.trim() })
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, name: name.trim() } : c)))
    } catch (e) {
      setError('Hata: ' + (e as Error).message)
    }
  }

  async function handleCategorySortBlur(cat: StyleCategory, raw: string) {
    const sort = Number(raw)
    if (Number.isNaN(sort) || sort === cat.sort) return
    setError(null)
    try {
      await updateStyleCategory(cat.id, { sort })
      setCategories((prev) => [...prev.map((c) => (c.id === cat.id ? { ...c, sort } : c))].sort((a, b) => a.sort - b.sort))
    } catch (e) {
      setError('Hata: ' + (e as Error).message)
    }
  }

  async function handleDeleteCategory(cat: StyleCategory) {
    setError(null)
    try {
      const count = await countStylesInCategory(cat.id)
      const ok = window.confirm(
        count > 0
          ? `Bu kategoride ${count} stil var; silinirse stiller kategorisiz kalır. Devam edilsin mi?`
          : 'Kategoriyi sil?'
      )
      if (!ok) return
      await deleteStyleCategory(cat.id)
      await load()
    } catch (e) {
      setError('Hata: ' + (e as Error).message)
    }
  }

  async function handleAddStyle() {
    setError(null)
    if (!file) {
      setError('Görsel zorunlu.')
      return
    }
    setSaving(true)
    try {
      await createAdminStyle(styleName.trim() || null, styleCategoryId || null, file)
      setStyleName('')
      setStyleCategoryId('')
      setFile(null)
      setFileKey((k) => k + 1)
      await loadStyles()
    } catch (e) {
      setError('Hata: ' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleStyleNameBlur(style: Style, raw: string) {
    const trimmed = raw.trim()
    const next = trimmed || null
    const prev = style.name?.trim() || null
    if (next === prev) return
    setError(null)
    try {
      await updateStyle(style.id, { name: next })
      setAdminStyles((prevList) => prevList.map((s) => (s.id === style.id ? { ...s, name: next } : s)))
      setUserStyles((prevList) => prevList.map((s) => (s.id === style.id ? { ...s, name: next } : s)))
    } catch (e) {
      setError('Hata: ' + (e as Error).message)
    }
  }

  async function handleStyleCategoryChange(style: Style, categoryId: string) {
    const next = categoryId || null
    if (next === style.category_id) return
    setError(null)
    try {
      await updateStyle(style.id, { category_id: next })
      setAdminStyles((prev) => prev.map((s) => (s.id === style.id ? { ...s, category_id: next } : s)))
      setUserStyles((prev) => prev.map((s) => (s.id === style.id ? { ...s, category_id: next } : s)))
    } catch (e) {
      setError('Hata: ' + (e as Error).message)
    }
  }

  async function handleDeleteStyle(style: Style) {
    if (!window.confirm('Stili sil? Görsel storage\'dan da kaldırılır.')) return
    setError(null)
    try {
      await deleteStyle(style)
      await loadStyles()
    } catch (e) {
      setError('Hata: ' + (e as Error).message)
    }
  }

  const visibleStyles = tab === 'admin' ? adminStyles : userStyles

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[#242424] bg-[#141414] p-5">
        <p className="mb-3 text-sm font-medium text-neutral-100">Kategoriler</p>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#101010] px-3 py-2">
              <input
                type="text"
                defaultValue={cat.name}
                onBlur={(e) => handleCategoryNameBlur(cat, e.target.value)}
                className={`${compactInputCls} min-w-[120px] flex-1`}
                aria-label={`Kategori adı: ${cat.name}`}
              />
              <input
                type="number"
                defaultValue={cat.sort}
                onBlur={(e) => handleCategorySortBlur(cat, e.target.value)}
                className={`${compactInputCls} w-16`}
                aria-label={`Sıra: ${cat.name}`}
              />
              <button
                type="button"
                onClick={() => handleDeleteCategory(cat)}
                aria-label={`Kategori sil: ${cat.name}`}
                className="ml-auto text-neutral-500 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-xs text-neutral-500">Henüz kategori yok.</p>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <input
            type="text"
            placeholder="Yeni kategori adı"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className={`${compactInputCls} min-w-[140px] flex-1`}
          />
          <input
            type="number"
            placeholder="Sıra"
            value={newCatSort}
            onChange={(e) => setNewCatSort(e.target.value)}
            className={`${compactInputCls} w-20`}
          />
          <button
            type="button"
            onClick={handleAddCategory}
            disabled={saving}
            className="rounded-lg bg-white px-4 py-1.5 text-xs font-medium text-[#0a0a0a] disabled:opacity-50"
          >
            Kategori ekle
          </button>
        </div>
      </section>

      <section>
        <div className="mb-4 flex gap-1 border-b border-[#222]">
          {(['admin', 'user'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm transition ${
                tab === key ? 'border-b-2 border-white text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {key === 'admin' ? 'Admin stilleri' : 'Kullanıcı stilleri'}
            </button>
          ))}
        </div>

        {tab === 'admin' && (
          <div className="rounded-2xl border border-[#242424] bg-[#141414] p-5">
            <p className="mb-4 text-sm font-medium text-neutral-100">Yeni stil ekle</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                key={fileKey}
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className={inputCls}
              />
              <input
                type="text"
                placeholder="Stil adı (opsiyonel)"
                value={styleName}
                onChange={(e) => setStyleName(e.target.value)}
                className={inputCls}
              />
              <select
                value={styleCategoryId}
                onChange={(e) => setStyleCategoryId(e.target.value)}
                className={inputCls}
              >
                <option value="">Kategori (opsiyonel)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleAddStyle}
              disabled={saving}
              className="mt-4 rounded-lg bg-white px-5 py-2 text-sm font-medium text-[#0a0a0a] disabled:opacity-50"
            >
              {saving ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {visibleStyles.map((s) => {
            const displayName = s.name?.trim() || null
            return (
            <div key={s.id} className="overflow-hidden rounded-xl border border-[#242424] bg-[#141414]">
              {signedUrls[s.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={signedUrls[s.id]} alt="" className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-[#0f0f0f] text-[10px] text-neutral-600">
                  Görsel yükleniyor…
                </div>
              )}
              <div className="p-2">
                <div className="flex items-start justify-between gap-1.5">
                  {tab === 'admin' && displayName ? (
                    <input
                      type="text"
                      defaultValue={displayName}
                      onBlur={(e) => handleStyleNameBlur(s, e.target.value)}
                      className={`${compactInputCls} min-w-0 flex-1`}
                      aria-label="Stil adı (opsiyonel)"
                    />
                  ) : (
                    <span className="min-w-0 flex-1" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteStyle(s)}
                    aria-label="Sil"
                    className="shrink-0 text-neutral-500 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {s.category_id && (
                  <span className="mt-1.5 inline-block rounded border border-neutral-700 px-1 py-0.5 text-[9px] leading-none text-neutral-400">
                    {categoryNameById[s.category_id] ?? '—'}
                  </span>
                )}
                {tab === 'admin' ? (
                  <select
                    value={s.category_id ?? ''}
                    onChange={(e) => handleStyleCategoryChange(s, e.target.value)}
                    className={cardSelectCls}
                    aria-label="Kategori"
                  >
                    <option value="">Kategorisiz</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  s.owner_id && (
                    <p className="mt-1 truncate text-[10px] text-neutral-600" title={s.owner_id}>
                      {s.owner_id.slice(0, 8)}…
                    </p>
                  )
                )}
              </div>
            </div>
            )
          })}
          {visibleStyles.length === 0 && (
            <p className="col-span-full text-sm text-neutral-500">
              {tab === 'admin' ? 'Henüz admin stili yok.' : 'Henüz kullanıcı stili yok.'}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
