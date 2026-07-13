'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { STYLES_BUCKET } from '@/lib/admin/styles'
import { useI18n } from '@/lib/i18n/language-provider'

type StyleCategory = { id: string; name: string; sort: number }

type Style = {
  id: string
  name: string | null
  category_id: string | null
  image_path: string
  owner_id: string | null
  source: string
  signedUrl?: string
}

const inputCls =
  'w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-neutral-600'

async function attachSignedUrls(styles: Style[]): Promise<Style[]> {
  const supabase = createClient()
  return Promise.all(
    styles.map(async (s) => {
      const { data } = await supabase.storage.from(STYLES_BUCKET).createSignedUrl(s.image_path, 3600)
      return { ...s, signedUrl: data?.signedUrl }
    })
  )
}

export default function StyleTransferPage() {
  const { t } = useI18n()

  const [selectedStyle, setSelectedStyle] = useState<Style | null>(null)
  const [categories, setCategories] = useState<StyleCategory[]>([])
  const [styles, setStyles] = useState<Style[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [addFileKey, setAddFileKey] = useState(0)
  const [addFile, setAddFile] = useState<File | null>(null)
  const [addCategoryId, setAddCategoryId] = useState('')
  const [addSaving, setAddSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)

    const [catRes, stylesRes] = await Promise.all([
      supabase.from('style_categories').select('id,name,sort').order('sort'),
      supabase
        .from('styles')
        .select('id,name,category_id,image_path,owner_id,source')
        .order('created_at', { ascending: false }),
    ])

    if (catRes.error) throw catRes.error
    if (stylesRes.error) throw stylesRes.error

    setCategories((catRes.data as StyleCategory[]) ?? [])
    const withUrls = await attachSignedUrls((stylesRes.data as Style[]) ?? [])
    setStyles(withUrls)
    setLoading(false)
  }, [])

  useEffect(() => {
    load().catch((e) => {
      setError((e as Error).message)
      setLoading(false)
    })
  }, [load])

  useEffect(() => {
    if (!addOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setAddOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [addOpen])

  const filteredStyles = filterCategoryId
    ? styles.filter((s) => s.category_id === filterCategoryId)
    : styles

  function toggleCategoryFilter(id: string) {
    setFilterCategoryId((prev) => (prev === id ? null : id))
  }

  async function handleAddOwnStyle() {
    if (!addFile || !userId) return
    setAddSaving(true)
    setError(null)
    const supabase = createClient()
    try {
      const ext = (addFile.name.split('.').pop() || 'jpg').toLowerCase()
      const image_path = `user/${userId}/${crypto.randomUUID()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from(STYLES_BUCKET)
        .upload(image_path, addFile, { upsert: false, contentType: addFile.type })
      if (uploadErr) throw uploadErr

      const { data: inserted, error: insErr } = await supabase
        .from('styles')
        .insert({
          owner_id: userId,
          source: 'user',
          category_id: addCategoryId || null,
          image_path,
          name: null,
        })
        .select('id,name,category_id,image_path,owner_id,source')
        .single()
      if (insErr) throw insErr

      const { data: signed } = await supabase.storage.from(STYLES_BUCKET).createSignedUrl(image_path, 3600)
      const row = { ...(inserted as Style), signedUrl: signed?.signedUrl }
      setStyles((prev) => [row, ...prev])
      setAddOpen(false)
      setAddFile(null)
      setAddCategoryId('')
      setAddFileKey((k) => k + 1)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAddSaving(false)
    }
  }

  async function handleDeleteOwnStyle(style: Style, e: React.MouseEvent) {
    e.stopPropagation()
    if (style.source !== 'user' || style.owner_id !== userId) return
    if (!window.confirm('Stilin silinsin mi?')) return
    setError(null)
    const supabase = createClient()
    try {
      if (style.image_path) {
        await supabase.storage.from(STYLES_BUCKET).remove([style.image_path])
      }
      const { error: delErr } = await supabase.from('styles').delete().eq('id', style.id)
      if (delErr) throw delErr
      setStyles((prev) => prev.filter((s) => s.id !== style.id))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (selectedStyle) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <button
          type="button"
          onClick={() => setSelectedStyle(null)}
          className="inline-flex items-center gap-2 text-sm text-neutral-400 transition hover:text-neutral-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </button>
        <p className="mt-8 text-center text-sm text-neutral-500">{t('style.productionSoon')}</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-neutral-100">{t('style.galleryTitle')}</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-neutral-500">{t('style.gallerySubtitle')}</p>
      </div>

      {categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((cat) => {
            const active = filterCategoryId === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategoryFilter(cat.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? 'border-white bg-white text-[#0a0a0a]'
                    : 'border-[#333] text-neutral-400 hover:border-[#444] hover:text-neutral-200'
                }`}
              >
                {cat.name}
              </button>
            )
          })}
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-sm text-neutral-500">…</p>
      ) : (
        <>
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="mb-3 flex w-full break-inside-avoid flex-col items-center justify-center rounded-xl border border-dashed border-[#333] bg-[#141414] px-4 py-12 text-sm text-neutral-400 transition hover:border-[#444] hover:text-neutral-200"
            >
              <Plus className="mb-2 h-5 w-5" />
              {t('style.addOwn')}
            </button>

            {filteredStyles.map((style) => {
              const isOwn = style.source === 'user' && style.owner_id === userId
              return (
                <div
                  key={style.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedStyle(style)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedStyle(style)
                    }
                  }}
                  className="group relative mb-3 w-full cursor-pointer break-inside-avoid overflow-hidden rounded-xl border border-[#242424] bg-[#141414] text-left"
                >
                  {style.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={style.signedUrl}
                      alt=""
                      className="block w-full transition duration-300 group-hover:blur-[2px]"
                    />
                  ) : (
                    <div className="flex aspect-[3/4] w-full items-center justify-center bg-[#0f0f0f] text-[10px] text-neutral-600">
                      …
                    </div>
                  )}

                  {isOwn && (
                    <>
                      <span className="absolute left-2 top-2 z-10 rounded-full border border-[#333] bg-black/60 px-2 py-0.5 text-[10px] font-medium text-neutral-200">
                        {t('style.mine')}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteOwnStyle(style, e)}
                        className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-neutral-300 transition hover:bg-black/80 hover:text-white"
                        aria-label="Sil"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition duration-300 group-hover:bg-black/40 group-hover:opacity-100">
                    <span className="text-sm font-medium text-white">{t('style.useStyle')}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {styles.length === 0 && (
            <p className="mt-4 text-center text-sm text-neutral-500">{t('style.empty')}</p>
          )}
        </>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAddOpen(false)} aria-hidden />
          <div
            className="relative z-10 w-full max-w-md rounded-sm border border-[#2a2622] bg-[#141210] p-6 text-[#efe8da]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="absolute right-4 top-4 text-neutral-500 hover:text-neutral-200"
              aria-label="Close"
            >
              ×
            </button>
            <p className="mb-4 text-sm font-medium text-neutral-100">{t('style.addOwn')}</p>
            <div className="grid gap-3">
              <input
                key={addFileKey}
                type="file"
                accept="image/*"
                onChange={(e) => setAddFile(e.target.files?.[0] ?? null)}
                className={inputCls}
              />
              <select
                value={addCategoryId}
                onChange={(e) => setAddCategoryId(e.target.value)}
                className={inputCls}
              >
                <option value="">Kategori seç</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleAddOwnStyle}
              disabled={!addFile || addSaving}
              className="mt-4 rounded-lg bg-[#efe8da] px-5 py-2 text-sm font-medium text-[#100e0b] disabled:opacity-50"
            >
              {addSaving ? '…' : t('common.continue')}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
