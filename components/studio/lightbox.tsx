'use client'

import type { ReactNode } from 'react'
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import { downloadAsJpg } from '@/lib/image/download'

/**
 * Sonuç görselinin tam ekran incelemesi. İndirme her stüdyoda ortak;
 * stüdyoya özel ek eylemler footer ile eklenir.
 */
export function Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
  downloadBaseName,
  footer,
}: {
  images: string[]
  /** null ise lightbox kapalıdır. */
  index: number | null
  onClose: () => void
  onIndexChange: (index: number) => void
  /** İndirilen dosya adı: `${downloadBaseName}-${sıra}` */
  downloadBaseName: string
  footer?: ReactNode
}) {
  const { t } = useI18n()
  if (index === null) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-scrim-review px-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Kapat"
        className="absolute right-5 top-5 text-content-secondary transition hover:text-content-primary"
      >
        <X className="h-6 w-6" />
      </button>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => index > 0 && onIndexChange(index - 1)}
          disabled={index === 0}
          aria-label="Onceki"
          className="text-content-secondary disabled:opacity-30"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[index]} alt="" className="max-h-[70vh] w-auto rounded-liora" />

        <button
          type="button"
          onClick={() => index < images.length - 1 && onIndexChange(index + 1)}
          disabled={index === images.length - 1}
          aria-label="Sonraki"
          className="text-content-secondary disabled:opacity-30"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => downloadAsJpg(images[index], `${downloadBaseName}-${index + 1}`)}
        className="mt-6 inline-flex items-center gap-2 rounded-liora bg-action-primary px-5 py-2.5 text-sm font-medium text-action-primary-fg transition hover:bg-action-primary-hover"
      >
        <Download className="h-4 w-4" />
        {t('ecom.result.download')}
      </button>

      {footer}
    </div>
  )
}
