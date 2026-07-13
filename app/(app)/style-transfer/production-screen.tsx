'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Maximize2, Upload, X } from 'lucide-react'
import { AssetPicker } from '@/components/asset-picker'
import { ModelFilterTabs } from '@/components/model-filter-tabs'
import type { Asset } from '@/lib/assets/assets'
import { createClient } from '@/lib/supabase/client'
import { STYLES_BUCKET } from '@/lib/admin/styles'
import { fileToScaledBase64, urlToScaledBase64 } from '@/lib/image/scale'
import { downloadAsJpg } from '@/lib/image/download'
import { useDropzone } from '@/lib/hooks/use-dropzone'
import { filterModels, listFavoriteModelIds, type ModelFilter } from '@/lib/models/favorites'
import { ratios, qualities, type Quality, type Ratio } from '@/lib/ecom/mock-data'
import { useI18n } from '@/lib/i18n/language-provider'

export type StyleSelection = {
  id: string
  signedUrl?: string
  image_path?: string
}

type ProductImage = {
  id: string
  previewUrl: string
  file?: File
  url?: string
}

type OwnModelImage = {
  previewUrl: string
  file?: File
  url?: string
}

type AiModel = {
  id: string
  name: string
  gender: string | null
  image_url: string | null
  image_path: string | null
  scope: string | null
}

type ModelMode = 'keep' | 'own' | 'ai'
type GenStatus = 'idle' | 'loading' | 'done' | 'error'

function ModelCard({
  selected,
  onClick,
  name,
  imageUrl,
}: {
  selected: boolean
  onClick: () => void
  name: string
  imageUrl: string
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={`relative cursor-pointer overflow-hidden rounded-lg bg-[#141414] transition ${selected ? 'border-[1.5px] border-white' : 'border border-[#242424] hover:border-[#2e2e2e]'}`}
    >
      <div className="relative aspect-[3/4] bg-[#1c1c1c]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        {selected && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white">
            <Check className="h-2.5 w-2.5 text-[#0a0a0a]" />
          </span>
        )}
      </div>
      <p className="truncate p-1.5 text-[10px] text-neutral-300">{name}</p>
    </div>
  )
}

export function StyleTransferProduction({
  selectedStyle,
  onChangeStyle,
}: {
  selectedStyle: StyleSelection
  onChangeStyle: () => void
}) {
  const { t } = useI18n()
  const productInputRef = useRef<HTMLInputElement>(null)

  const [products, setProducts] = useState<ProductImage[]>([])
  const [modelMode, setModelMode] = useState<ModelMode>('keep')
  const [ownModel, setOwnModel] = useState<OwnModelImage | null>(null)
  const [aiModelId, setAiModelId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [ratio, setRatio] = useState<Ratio>('2:3')
  const [quality, setQuality] = useState<Quality>('1k')
  const [genStatus, setGenStatus] = useState<GenStatus>('idle')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState(false)

  const [assetPickerOpen, setAssetPickerOpen] = useState(false)
  const [modelModalOpen, setModelModalOpen] = useState(false)
  const [models, setModels] = useState<AiModel[]>([])
  const [modelFilter, setModelFilter] = useState<ModelFilter>('all')
  const [modelFavIds, setModelFavIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('models')
      .select('id,name,gender,image_url,image_path,scope')
      .order('created_at', { ascending: false })
      .then(({ data }) => setModels((data as AiModel[]) ?? []))
    listFavoriteModelIds().then(setModelFavIds).catch(console.error)
  }, [])

  useEffect(() => {
    if (!modelModalOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setModelModalOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modelModalOpen])

  const filteredModels = filterModels(models, modelFilter, modelFavIds)
  const selectedAiModel = models.find((m) => m.id === aiModelId)

  const canGenerate =
    products.length > 0 &&
    (modelMode === 'keep' ||
      (modelMode === 'own' && ownModel !== null) ||
      (modelMode === 'ai' && aiModelId !== null))

  function addProductFiles(files: FileList) {
    const incoming = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setProducts((prev) => [...prev, ...incoming].slice(0, 4))
  }

  function removeProduct(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  function addProductFromAsset(asset: Asset) {
    const url = asset.signedUrl
    if (!url || products.length >= 4) return
    setProducts((prev) =>
      [...prev, { id: crypto.randomUUID(), url, previewUrl: url }].slice(0, 4)
    )
  }

  function selectOwnModel(files: FileList) {
    const file = files[0]
    if (!file) return
    setOwnModel({ file, previewUrl: URL.createObjectURL(file) })
  }

  const { isDragging: productDragging, dropHandlers: productDropHandlers } = useDropzone(addProductFiles)
  const { isDragging: ownDragging, dropHandlers: ownDropHandlers } = useDropzone(selectOwnModel)

  async function handleGenerate() {
    if (!canGenerate || !selectedStyle.image_path) return

    setGenStatus('loading')
    setGenError(null)
    setResultUrl(null)

    try {
      const supabase = createClient()
      console.log('1. stil cevriliyor', selectedStyle?.image_path)

      const { data: styleBlob, error: styleErr } = await supabase
        .storage.from(STYLES_BUCKET)
        .download(selectedStyle.image_path)
      if (styleErr || !styleBlob) {
        console.error('STYLE DOWNLOAD ERROR:', styleErr)
        throw new Error('style_download_failed')
      }
      const styleFile = new File([styleBlob], 'style.jpg', { type: styleBlob.type || 'image/jpeg' })
      const styleImg = await fileToScaledBase64(styleFile, 1024)
      console.log('2. stil ok', styleImg?.base64?.length)

      const productPayload = await Promise.all(
        products.map((p) => (p.file ? fileToScaledBase64(p.file) : urlToScaledBase64(p.url!)))
      )
      console.log('3. urunler ok', productPayload.length)

      let model: { base64: string; mimeType: string } | undefined
      if (modelMode === 'own' && ownModel) {
        model = ownModel.file
          ? await fileToScaledBase64(ownModel.file)
          : await urlToScaledBase64(ownModel.url!)
      } else if (modelMode === 'ai' && selectedAiModel) {
        const url = selectedAiModel.image_url
        const path =
          selectedAiModel.image_path ?? url?.split('/object/public/models/')[1]?.split('?')[0]
        if (!path) throw new Error('model_download_failed')
        const { data: modelBlob, error: modelErr } = await supabase.storage.from('models').download(path)
        if (modelErr || !modelBlob) {
          console.error('MODEL DOWNLOAD ERROR:', modelErr)
          throw new Error('model_download_failed')
        }
        const modelFile = new File([modelBlob], 'model.jpg', { type: modelBlob.type || 'image/jpeg' })
        const modelImg = await fileToScaledBase64(modelFile, 1024)
        model = { base64: modelImg.base64, mimeType: modelImg.mimeType }
      }
      console.log('4. manken', modelMode, model?.base64?.length)

      const body = {
        style: { base64: styleImg.base64, mimeType: styleImg.mimeType },
        products: productPayload,
        modelMode,
        ...(model ? { model } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ratio,
        quality,
      }

      console.log('5. invoke ediliyor')
      const { data, error } = await supabase.functions.invoke('generate-style-transfer', { body })
      console.log('6. yanit', data, error)

      if (error) {
        console.error('INVOKE ERROR:', error)
      }

      if (error || data?.error) {
        setGenError(t('style.error.generic'))
        setGenStatus('error')
        return
      }

      if (data?.image?.base64 && data?.image?.mimeType) {
        setResultUrl(`data:${data.image.mimeType};base64,${data.image.base64}`)
        setGenStatus('done')
        return
      }

      setGenError(t('style.error.generic'))
      setGenStatus('error')
    } catch (e) {
      console.error('STYLE TRANSFER ERROR:', e)
      setGenError(t('style.error.generic'))
      setGenStatus('error')
    }
  }

  const modeBtn = (active: boolean) =>
    `rounded-lg border px-2.5 py-2 text-left text-xs transition ${
      active
        ? 'border-white bg-white/10 text-neutral-100'
        : 'border-[#2a2a2a] text-neutral-400 hover:border-[#3a3a3a] hover:text-neutral-300'
    }`

  return (
    <>
      <main className="flex h-[calc(100vh-64px)] w-full flex-col overflow-hidden lg:flex-row">
        <aside className="flex max-h-[55vh] min-h-0 w-full shrink-0 flex-col gap-3 overflow-y-auto border-b border-[#242424] px-5 py-5 lg:max-h-none lg:w-[340px] lg:border-b-0 lg:border-r">
          <p className="text-xs text-neutral-500">{t('tool.style.title')}</p>

          <div className="flex items-center gap-3 rounded-lg border border-[#242424] bg-[#141414] p-2">
            {selectedStyle.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedStyle.signedUrl} alt="" className="h-16 w-12 shrink-0 rounded object-cover" />
            ) : (
              <div className="h-16 w-12 shrink-0 rounded bg-[#0f0f0f]" />
            )}
            <button
              type="button"
              onClick={onChangeStyle}
              className="text-xs text-neutral-400 underline-offset-2 hover:text-neutral-200 hover:underline"
            >
              {t('style.changeStyle')}
            </button>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-medium text-neutral-300">{t('style.products')}</p>
            <p className="mb-2 text-[10px] leading-relaxed text-neutral-500">{t('style.productsHint')}</p>
            <input
              ref={productInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) addProductFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => productInputRef.current?.click()}
                disabled={products.length >= 4}
                className="rounded-lg border border-[#2a2a2a] px-2.5 py-1.5 text-xs text-neutral-300 hover:bg-[#161616] disabled:opacity-40"
              >
                {t('style.uploadFile')}
              </button>
              <button
                type="button"
                onClick={() => setAssetPickerOpen(true)}
                disabled={products.length >= 4}
                className="rounded-lg border border-[#2a2a2a] px-2.5 py-1.5 text-xs text-neutral-300 hover:bg-[#161616] disabled:opacity-40"
              >
                {t('assets.fromAssets')}
              </button>
            </div>
            <div
              {...productDropHandlers}
              className={`mt-2 grid grid-cols-4 gap-2 rounded-lg border border-dashed p-2 transition ${productDragging ? 'border-white bg-[#161616]' : 'border-[#2a2a2a]'}`}
            >
              {products.map((p) => (
                <div key={p.id} className="relative aspect-square overflow-hidden rounded-md bg-[#0f0f0f]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeProduct(p.id)}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {products.length === 0 && (
                <p className="col-span-4 py-4 text-center text-[10px] text-neutral-600">PNG, JPG</p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-medium text-neutral-300">{t('style.model.label')}</p>
            <div className="flex flex-col gap-1.5">
              <button type="button" onClick={() => setModelMode('keep')} className={modeBtn(modelMode === 'keep')}>
                {t('style.model.keepStyle')}
              </button>
              <button type="button" onClick={() => setModelMode('own')} className={modeBtn(modelMode === 'own')}>
                {t('style.model.own')}
              </button>
              <button type="button" onClick={() => setModelMode('ai')} className={modeBtn(modelMode === 'ai')}>
                {t('style.model.ai')}
              </button>
            </div>

            {modelMode === 'own' && (
              <div className="mt-2">
                <input
                  id="style-own-model"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    if (e.target.files) selectOwnModel(e.target.files)
                    e.target.value = ''
                  }}
                />
                {ownModel ? (
                  <div className="relative h-24 overflow-hidden rounded-lg border border-[#242424]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ownModel.previewUrl} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setOwnModel(null)}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
                      aria-label="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="style-own-model"
                    {...ownDropHandlers}
                    className={`flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#333] bg-[#141414] text-neutral-500 transition hover:border-[#444] ${ownDragging ? 'border-white bg-[#161616]' : ''}`}
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-[10px]">PNG, JPG</span>
                  </label>
                )}
              </div>
            )}

            {modelMode === 'ai' && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setModelModalOpen(true)}
                  className="w-full rounded-lg border border-[#2a2a2a] px-3 py-2 text-left text-xs text-neutral-300 hover:bg-[#161616]"
                >
                  {selectedAiModel ? selectedAiModel.name : t('style.model.ai')}
                </button>
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-[11px] font-medium text-neutral-300">{t('style.ratio')}</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {ratios.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRatio(r)}
                  className={`rounded-lg px-4 py-2 text-sm transition ${ratio === r ? 'bg-white text-[#0a0a0a]' : 'border border-[#2a2a2a] text-neutral-300 hover:bg-[#161616]'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="mb-2 text-[11px] font-medium text-neutral-300">{t('style.quality')}</p>
            <div className="flex flex-wrap gap-2">
              {qualities.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuality(q)}
                  className={`rounded-lg px-4 py-2 text-sm uppercase transition ${quality === q ? 'bg-white text-[#0a0a0a]' : 'border border-[#2a2a2a] text-neutral-300 hover:bg-[#161616]'}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="style-notes" className="mb-1 block text-[11px] text-neutral-400">
              {t('style.notes')}
            </label>
            <textarea
              id="style-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('style.notesPlaceholder')}
              rows={2}
              className="w-full resize-none rounded-lg border border-[#242424] bg-[#141414] px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-[#3a3a3a]"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || genStatus === 'loading'}
            className="mt-auto w-full rounded-lg bg-white py-2 text-sm font-medium text-[#0a0a0a] transition hover:bg-neutral-200 disabled:opacity-40"
          >
            {t('style.generate')}
          </button>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col p-5">
          <div className="flex h-full min-h-0 flex-col rounded-2xl border border-[#242424] bg-[#141414] p-4">
            {genStatus === 'idle' && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-neutral-500">
                <p className="text-sm">{t('style.previewEmpty')}</p>
              </div>
            )}

            {genStatus === 'loading' && (
              <div className="flex flex-1 flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-neutral-400" />
                <p className="text-sm text-neutral-400">{t('style.generating')}</p>
              </div>
            )}

            {genStatus === 'error' && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3">
                <p className="text-sm text-red-400">{genError ?? t('style.error.generic')}</p>
              </div>
            )}

            {genStatus === 'done' && resultUrl && (
              <div className="flex min-h-0 flex-1 flex-col">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultUrl} alt="" className="max-h-full min-h-0 w-full flex-1 rounded-xl object-contain" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setLightbox(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-sm text-neutral-200 hover:bg-[#1c1c1c]"
                  >
                    <Maximize2 className="h-4 w-4" />
                    {t('video.expand')}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadAsJpg(resultUrl, 'liora-style-transfer')}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-[#0a0a0a]"
                  >
                    {t('video.download')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <AssetPicker open={assetPickerOpen} onClose={() => setAssetPickerOpen(false)} onSelect={addProductFromAsset} />

      {modelModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setModelModalOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-[#242424] bg-[#141414] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-100">{t('style.model.ai')}</p>
              <button type="button" onClick={() => setModelModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ModelFilterTabs value={modelFilter} onChange={setModelFilter} className="mb-3" />
            <div className="grid min-h-0 flex-1 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {filteredModels.map((m) => (
                <ModelCard
                  key={m.id}
                  selected={aiModelId === m.id}
                  onClick={() => {
                    setAiModelId(m.id)
                    setModelModalOpen(false)
                  }}
                  name={m.name}
                  imageUrl={m.image_url ?? ''}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {lightbox && resultUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="Close"
            className="absolute right-5 top-5 text-neutral-400 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resultUrl} alt="" className="max-h-[90vh] max-w-full rounded-xl object-contain" />
        </div>
      )}
    </>
  )
}
