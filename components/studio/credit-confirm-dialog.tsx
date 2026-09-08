'use client'

import { useI18n } from '@/lib/i18n/language-provider'

/**
 * Üretimden önce kaç kredi harcanacağını onaylatan pencere.
 * Kredi düşme mantığı edge function'da; burası yalnızca onay yüzeyi.
 */
export function CreditConfirmDialog({
  open,
  credits,
  onCancel,
  onConfirm,
}: {
  open: boolean
  /** Bu üretimin maliyeti. Metni değil sayıyı verin. */
  credits: number
  onCancel: () => void
  onConfirm: () => void
}) {
  const { t } = useI18n()
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay px-4">
      <div className="w-full max-w-sm rounded-liora border border-border-subtle bg-surface-raised p-6 text-center">
        <p className="text-base font-medium text-content-primary">{t('ecom.confirm.title')}</p>
        <p className="mt-2 text-sm text-content-secondary">{t('ecom.confirm.body')}</p>
        <p className="mt-4 text-3xl font-medium text-content-primary">
          {credits} <span className="text-base text-content-secondary">{t('nav.credits')}</span>
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-liora border border-border-default py-2.5 text-sm text-content-primary transition hover:bg-surface-sunken"
          >
            {t('ecom.confirm.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-liora bg-action-primary py-2.5 text-sm font-medium text-action-primary-fg transition hover:bg-action-primary-hover"
          >
            {t('ecom.confirm.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
