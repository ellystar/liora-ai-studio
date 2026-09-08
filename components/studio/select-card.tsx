'use client'

import { Check, Star } from 'lucide-react'

export type SelectCardBadge = { text: string; own?: boolean }

/**
 * Izgaradan tek/çoklu seçim kartı. Model, arkaplan ve poz ızgaralarının
 * ortak karosu. Renkler DS semantik rollerinden gelir; ham hex yoktur.
 */
export function SelectCard({
  selected,
  onClick,
  name,
  imageUrl,
  badge,
  multi,
  isFavorite,
  onFavoriteToggle,
}: {
  selected: boolean
  onClick: () => void
  name: string
  imageUrl: string
  badge?: SelectCardBadge
  /** Çoklu seçim ızgaralarında işaret kare, tekli seçimde yuvarlak olur. */
  multi?: boolean
  isFavorite?: boolean
  onFavoriteToggle?: () => void
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
      className={`relative cursor-pointer overflow-hidden rounded-liora bg-surface-raised text-left transition ${
        selected
          ? 'border-[1.5px] border-accent-primary'
          : 'border border-border-subtle hover:border-border-default'
      }`}
    >
      <div className="relative aspect-[3/4] bg-surface-sunken">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" />

        {onFavoriteToggle && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onFavoriteToggle()
            }}
            className="absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-pill bg-surface-overlay transition"
            aria-label="Favori"
          >
            <Star
              className={`h-3.5 w-3.5 transition ${
                isFavorite
                  ? 'fill-accent-primary text-accent-primary'
                  : 'text-content-secondary hover:text-accent-primary'
              }`}
            />
          </button>
        )}

        {selected && (
          <span
            className={`absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center bg-action-primary ${
              multi ? 'rounded-liora' : 'rounded-pill'
            }`}
          >
            <Check className="h-3 w-3 text-action-primary-fg" />
          </span>
        )}
      </div>

      <div className="p-2">
        <p className="text-xs text-content-primary">{name}</p>
        {badge && (
          <span
            className={`mt-1 inline-block rounded-liora px-1.5 py-0.5 text-[9px] ${
              badge.own
                ? 'bg-state-success-surface text-state-success'
                : 'bg-state-info-surface text-state-info'
            }`}
          >
            {badge.text}
          </span>
        )}
      </div>
    </div>
  )
}
