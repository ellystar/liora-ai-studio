'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import { createClient } from '@/lib/supabase/client'
import {
  SHOOTS_PAGE_SIZE,
  downloadShootImage,
  downloadShootsZip,
  fetchShootImages,
  fetchShootModels,
  fetchShootStats,
  fetchShootTools,
  groupShootImages,
  recordDownload,
  shootImageFilename,
  type ShootImage,
  type ShootModel,
  type ShootStats,
} from '@/lib/generations/shoots'

const KNOWN_TOOL_KEYS = [
  'ecom_studio',
  'style_transfer',
  'pose_generator',
  'flat_to_ghost',
  'edit_photo',
] as const

function formatGroupDate(iso: string, locale: 'tr' | 'en') {
  return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso))
}

function daysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function ShootsPage() {
  const { t, locale } = useI18n()
  const [userId, setUserId] = useState<string | null>(null)
  const [stats, setStats] = useState<ShootStats>({ totalProductions: 0, totalDownloads: 0 })
  const [tools, setTools] = useState<string[]>([])
  const [models, setModels] = useState<ShootModel[]>([])
  const [images, setImages] = useState<ShootImage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [toolFilter, setToolFilter] = useState<string | null>(null)
  const [modelFilter, setModelFilter] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [metaLoaded, setMetaLoaded] = useState(false)
  const touchStartX = useRef(0)
  const offsetRef = useRef(0)

  const toolLabel = useCallback(
    (tool: string) => {
      const key = `shoots.tool.${tool}` as const
      const known = KNOWN_TOOL_KEYS.includes(tool as (typeof KNOWN_TOOL_KEYS)[number])
      if (known) return t(key as Parameters<typeof t>[0])
      return tool.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    },
    [t]
  )

  const flatFiltered = images
  const groups = useMemo(() => groupShootImages(flatFiltered), [flatFiltered])

  const loadPage = useCallback(
    async (reset: boolean) => {
      if (!userId) return
      if (reset) {
        setLoading(true)
        offsetRef.current = 0
      } else {
        setLoadingMore(true)
      }

      try {
        const offset = reset ? 0 : offsetRef.current
        const batch = await fetchShootImages(userId, {
          offset,
          limit: SHOOTS_PAGE_SIZE,
          tool: toolFilter,
          modelId: modelFilter,
        })

        setImages((prev) => (reset ? batch : [...prev, ...batch]))
        offsetRef.current = offset + batch.length
        setHasMore(batch.length === SHOOTS_PAGE_SIZE)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [userId, toolFilter, modelFilter]
  )

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      Promise.all([
        fetchShootStats(user.id).then(setStats),
        fetchShootTools(user.id).then(setTools),
        fetchShootModels(user.id).then(setModels),
      ])
        .catch(console.error)
        .finally(() => setMetaLoaded(true))
    })
  }, [])

  useEffect(() => {
    if (!userId) return
    loadPage(true).catch(console.error)
    setSelected(new Set())
    setLightboxIndex(null)
  }, [userId, toolFilter, modelFilter, loadPage])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelected(new Set())

  const openLightbox = (id: string) => {
    const idx = flatFiltered.findIndex((img) => img.id === id)
    if (idx >= 0) setLightboxIndex(idx)
  }

  const lightboxImage = lightboxIndex !== null ? flatFiltered[lightboxIndex] : null

  useEffect(() => {
    if (lightboxIndex === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i))
      if (e.key === 'ArrowRight')
        setLightboxIndex((i) => (i !== null && i < flatFiltered.length - 1 ? i + 1 : i))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIndex, flatFiltered.length])

  const handleDownloadOne = async (img: ShootImage, indexInFlat: number) => {
    if (!userId) return
    setDownloading(true)
    try {
      await downloadShootImage(img.signedUrl, shootImageFilename(img, indexInFlat))
      await recordDownload(userId, img.id)
      setStats((s) => ({ ...s, totalDownloads: s.totalDownloads + 1 }))
    } catch (e) {
      console.error(e)
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadSelected = async () => {
    if (!userId || selected.size === 0) return
    setDownloading(true)
    try {
      const toDownload = flatFiltered.filter((img) => selected.has(img.id))
      const today = new Date().toISOString().slice(0, 10)

      if (toDownload.length === 1) {
        const idx = flatFiltered.findIndex((img) => img.id === toDownload[0].id)
        await downloadShootImage(toDownload[0].signedUrl, shootImageFilename(toDownload[0], idx))
      } else {
        await downloadShootsZip(toDownload, `liora-cekimler-${today}.zip`)
      }

      await Promise.all(toDownload.map((img) => recordDownload(userId, img.id)))
      setStats((s) => ({ ...s, totalDownloads: s.totalDownloads + toDownload.length }))
      clearSelection()
    } catch (e) {
      console.error(e)
    } finally {
      setDownloading(false)
    }
  }

  const clearFilters = () => {
    setToolFilter(null)
    setModelFilter(null)
  }

  const isFullyEmpty =
    metaLoaded && !loading && tools.length === 0 && images.length === 0 && !toolFilter && !modelFilter
  const filterEmpty = !loading && images.length === 0 && (toolFilter !== null || modelFilter !== null)

  const tabTools = useMemo(() => {
    const ordered = KNOWN_TOOL_KEYS.filter((k) => tools.includes(k))
    const rest = tools.filter((t) => !KNOWN_TOOL_KEYS.includes(t as (typeof KNOWN_TOOL_KEYS)[number]))
    return [...ordered, ...rest]
  }, [tools])

  return (
    <>
      <main className="atelier shoots-page mx-auto w-full max-w-6xl px-5 py-8 pb-28 md:px-8 md:py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="atelier-section-label">{t('shoots.sectionLabel')}</p>
            <h1 className="atelier-display mt-3 text-[28px] leading-tight text-[#EDE8DF] md:text-[30px]">
              {t('shoots.title')}
            </h1>
            <p className="mt-2 text-[12.5px] text-[#8F8A80]">{t('shoots.subtitle')}</p>
          </div>
          <p className="shrink-0 text-[12.5px] md:pt-6 md:text-right">
            <span className="text-[#EDE8DF]">{stats.totalProductions}</span>{' '}
            <span className="text-[#8F8A80]">{t('shoots.stats.productions')}</span>
            <span className="text-[#8F8A80]"> · </span>
            <span className="text-[#EDE8DF]">{stats.totalDownloads}</span>{' '}
            <span className="text-[#8F8A80]">{t('shoots.stats.downloads')}</span>
          </p>
        </div>

        {/* Filters */}
        {!isFullyEmpty && (
          <div className="shoots-filter-row mt-8 border-t border-[#26231E] pt-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => setToolFilter(null)}
                  className={`shoots-tab ${toolFilter === null ? 'is-active' : ''}`}
                >
                  {t('shoots.filter.all')}
                </button>
                {tabTools.map((tool) => (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => setToolFilter(tool)}
                    className={`shoots-tab ${toolFilter === tool ? 'is-active' : ''}`}
                  >
                    {toolLabel(tool)}
                  </button>
                ))}
              </div>
              {models.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setModelFilter(modelFilter === model.id ? null : model.id)}
                      className={`shoots-model-chip ${modelFilter === model.id ? 'is-active' : ''}`}
                    >
                      {model.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={model.image_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#26231E] text-[9px] text-[#8F8A80]">
                          {model.name.charAt(0)}
                        </span>
                      )}
                      <span className="max-w-[80px] truncate">{model.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {loading && (
          <p className="mt-12 text-center text-[13px] text-[#8F8A80]">…</p>
        )}

        {isFullyEmpty && (
          <div className="shoots-empty mt-16 text-center">
            <h2 className="atelier-display text-[22px] text-[#EDE8DF]">{t('shoots.empty.title')}</h2>
            <p className="mt-2 text-[12.5px] text-[#8F8A80]">{t('shoots.empty.subtitle')}</p>
            <Link href="/" className="shoots-empty-link mt-5 inline-block text-[12.5px] text-[#EDE8DF]">
              {t('shoots.empty.cta')}
            </Link>
          </div>
        )}

        {filterEmpty && (
          <div className="shoots-empty mt-16 text-center">
            <p className="text-[13px] text-[#8F8A80]">{t('shoots.filterEmpty')}</p>
            <button type="button" onClick={clearFilters} className="shoots-empty-link mt-3 text-[12.5px] text-[#EDE8DF]">
              {t('shoots.clearFilter')}
            </button>
          </div>
        )}

        {/* Groups */}
        {images.length > 0 && (
        <div className="mt-8 space-y-10">
          {groups.map(({ generationId, images: groupImages }) => {
            const first = groupImages[0]
            const daysLeft = daysUntilExpiry(first.expires_at)
            const expiresToday = daysLeft !== null && daysLeft < 1

            return (
              <section key={generationId}>
                <div className="mb-3 flex items-center gap-3">
                  <p className="shrink-0 text-[12px] text-[#8F8A80]">
                    {formatGroupDate(first.created_at, locale)} · {toolLabel(first.tool)} ·{' '}
                    {t('shoots.frames').replace('{count}', String(groupImages.length))}
                  </p>
                  <div className="h-[0.5px] flex-1 bg-[#26231E]" />
                  {daysLeft !== null && (
                    <span
                      className={`flex shrink-0 items-center gap-1 text-[11.5px] ${expiresToday ? 'text-[#C96F4A]' : 'text-[#8F8A80]'}`}
                    >
                      <Clock className="h-3 w-3" strokeWidth={1.5} />
                      {expiresToday
                        ? t('shoots.expiresToday')
                        : t('shoots.daysLeft').replace('{n}', String(Math.max(daysLeft, 0)))}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {groupImages.map((img) => {
                    const isSelected = selected.has(img.id)
                    const hasSelection = selected.size > 0
                    return (
                      <div
                        key={img.id}
                        className={`shoots-thumb group relative ${isSelected ? 'is-selected' : ''}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.signedUrl} alt="" className="shoots-thumb-img" />
                        <button
                          type="button"
                          aria-label={t('shoots.select')}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSelect(img.id)
                          }}
                          className={`shoots-select-circle ${isSelected ? 'is-checked' : ''}`}
                        />
                        <button
                          type="button"
                          className="absolute inset-0 z-[1]"
                          aria-label={t('shoots.open')}
                          onClick={() => {
                            if (hasSelection || isSelected) toggleSelect(img.id)
                            else openLightbox(img.id)
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
        )}

        {hasMore && !loading && images.length > 0 && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => loadPage(false)}
              disabled={loadingMore}
              className="shoots-load-more text-[12.5px] text-[#EDE8DF]"
            >
              {loadingMore ? t('shoots.downloading') : t('shoots.loadMore')}
            </button>
          </div>
        )}
      </main>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="shoots-selection-bar fixed inset-x-0 bottom-0 z-40 border-t border-[#26231E] bg-[#1C1914] px-5 py-4 md:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <p className="text-[13px] text-[#EDE8DF]">
              {t('shoots.selected').replace('{count}', String(selected.size))}
            </p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={clearSelection} className="shoots-btn-ghost text-[12.5px]">
                {t('shoots.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDownloadSelected}
                disabled={downloading}
                className="shoots-btn-primary text-[12.5px]"
              >
                {downloading ? t('shoots.downloading') : t('shoots.download')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && lightboxIndex !== null && (
        <div
          className="shoots-lightbox fixed inset-0 z-50 flex flex-col items-center justify-center px-4"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX
          }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchStartX.current
            if (dx > 50 && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1)
            if (dx < -50 && lightboxIndex < flatFiltered.length - 1) setLightboxIndex(lightboxIndex + 1)
          }}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-5 top-5 text-[#8F8A80] hover:text-[#EDE8DF]"
            aria-label={t('shoots.close')}
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>

          <div className="flex w-full max-w-4xl items-center justify-center gap-3">
            <button
              type="button"
              disabled={lightboxIndex === 0}
              onClick={() => setLightboxIndex(lightboxIndex - 1)}
              className="shrink-0 text-[#8F8A80] disabled:opacity-30 hover:text-[#EDE8DF]"
              aria-label={t('shoots.prev')}
            >
              <ChevronLeft className="h-7 w-7" strokeWidth={1.5} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage.signedUrl}
              alt=""
              className="max-h-[70vh] w-auto max-w-full rounded-[3px] object-contain"
            />
            <button
              type="button"
              disabled={lightboxIndex >= flatFiltered.length - 1}
              onClick={() => setLightboxIndex(lightboxIndex + 1)}
              className="shrink-0 text-[#8F8A80] disabled:opacity-30 hover:text-[#EDE8DF]"
              aria-label={t('shoots.next')}
            >
              <ChevronRight className="h-7 w-7" strokeWidth={1.5} />
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[12.5px]">
            <span className="text-[#8F8A80]">
              {formatGroupDate(lightboxImage.created_at, locale)} · {toolLabel(lightboxImage.tool)}
            </span>
            <button
              type="button"
              disabled={downloading}
              onClick={() => handleDownloadOne(lightboxImage, lightboxIndex)}
              className="shoots-btn-primary text-[12.5px]"
            >
              {downloading ? t('shoots.downloading') : t('shoots.download')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
