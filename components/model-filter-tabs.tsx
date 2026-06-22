'use client'

import { useI18n } from '@/lib/i18n/language-provider'
import type { TranslationKey } from '@/lib/i18n/dictionaries'
import type { ModelFilter } from '@/lib/models/favorites'

const FILTERS: ModelFilter[] = ['all', 'general', 'own', 'female', 'male', 'favorites']

const FILTER_KEYS: Record<ModelFilter, TranslationKey> = {
  all: 'models.filter.all',
  general: 'models.filter.general',
  own: 'models.filter.own',
  female: 'models.filter.female',
  male: 'models.filter.male',
  favorites: 'models.filter.favorites',
}

export function ModelFilterTabs({
  value,
  onChange,
  className = '',
}: {
  value: ModelFilter
  onChange: (filter: ModelFilter) => void
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
