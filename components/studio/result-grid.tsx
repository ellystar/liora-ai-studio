'use client'

import type { ReactNode } from 'react'

/**
 * Üretim sonuçlarının ızgarası. Her karonun altına stüdyoya özel bir eylem
 * gerekiyorsa renderFooter ile verilir (ör. E-com'da "arkaplanı kaydet").
 */
export function ResultGrid({
  images,
  onOpen,
  renderFooter,
}: {
  images: string[]
  onOpen: (index: number) => void
  renderFooter?: (src: string, index: number) => ReactNode
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {images.map((src, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-liora border border-border-subtle bg-surface-raised"
        >
          <button type="button" onClick={() => onOpen(i)} className="block w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="aspect-[3/4] w-full object-cover" />
          </button>
          {renderFooter && <div className="p-2">{renderFooter(src, i)}</div>}
        </div>
      ))}
    </div>
  )
}
