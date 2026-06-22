'use client'

import { useI18n } from '@/lib/i18n/language-provider'
import type { TranslationKey } from '@/lib/i18n/dictionaries'
import type { PoseFilter } from '@/lib/poses/favorites'

const FILTERS: PoseFilter[] = ['all', 'full_body', 'medium_shot', 'close_up', 'favorites']

const FILTER_KEYS: Record<PoseFilter, TranslationKey> = {
  all: 'poses.filter.all',
  full_body: 'poses.filter.full_body',
  medium_shot: 'poses.filter.medium_shot',
  close_up: 'poses.filter.close_up',
  favorites: 'poses.filter.favorites',
}

export function PoseFilterTabs({
  value,
  onChange,
  className = '',
}: {
  value: PoseFilter
  onChange: (filter: PoseFilter) => void
  className?: string
}) {
  const { t } = useI18n()

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onChange(filter)}
          className={`rounded-full px-3 py-1 text-xs transition ${
            value === filter
              ? 'bg-white text-black'
              : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
          }`}
        >
          {t(FILTER_KEYS[filter])}
        </button>
      ))}
    </div>
  )
}
