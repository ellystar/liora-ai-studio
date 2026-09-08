'use client'

import type { DragEvent } from 'react'
import { Plus } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'

type DropHandlers = {
  onDragEnter: (e: DragEvent) => void
  onDragOver: (e: DragEvent) => void
  onDragLeave: (e: DragEvent) => void
  onDrop: (e: DragEvent) => void
}

/**
 * "Bilgisayardan / Varlıklardan" ikili seçeneğini sunan yükleme alanı.
 * md  → ızgaradaki tam boy karo (sürükle-bırak destekli)
 * sm  → ürün kartının içindeki açı yuvası
 */
export function UploadTile({
  onPickFile,
  onPickAsset,
  size = 'md',
  caption,
  isDragging = false,
  dropHandlers,
}: {
  onPickFile: () => void
  onPickAsset: () => void
  size?: 'md' | 'sm'
  /** Karonun altındaki sayaç gibi küçük not (örn. "2 / 6"). */
  caption?: string
  isDragging?: boolean
  dropHandlers?: DropHandlers
}) {
  const { t } = useI18n()
  const sm = size === 'sm'

  const buttonClass = `w-full rounded-liora border border-border-default text-content-primary transition hover:bg-surface-sunken ${
    sm ? 'px-2 py-1 text-[10px]' : 'px-2 py-1.5 text-[10px]'
  }`

  return (
    <div
      {...dropHandlers}
      className={`flex aspect-[3/4] flex-col items-center justify-center rounded-liora border border-dashed text-content-secondary transition ${
        sm ? 'gap-1.5 p-2' : 'gap-2 p-3'
      } ${isDragging ? 'border-content-primary bg-surface-sunken' : 'border-border-default'}`}
    >
      <Plus className={sm ? 'h-5 w-5' : 'h-6 w-6'} />

      <div className="flex w-full flex-col gap-1.5">
        <button type="button" onClick={onPickFile} className={buttonClass}>
          {t('assets.fromComputer')}
        </button>
        <button type="button" onClick={onPickAsset} className={buttonClass}>
          {t('assets.fromAssets')}
        </button>
      </div>

      {caption && <span className="text-[10px] text-content-muted">{caption}</span>}
    </div>
  )
}
