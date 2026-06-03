'use client'

import { useI18n } from '@/lib/i18n/language-provider'
import { SignOutButton } from '@/components/sign-out-button'

export function ProfileContent({ email, credits }: { email: string; credits: number }) {
  const { t } = useI18n()

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-lg font-medium text-neutral-100">{t('profile.title')}</h1>

      <div className="mt-6 space-y-4 rounded-2xl border border-[#242424] bg-[#141414] p-5">
        <div>
          <p className="text-xs text-neutral-500">{t('profile.email')}</p>
          <p className="mt-1 text-sm text-neutral-100">{email}</p>
        </div>
        <div className="border-t border-[#242424] pt-4">
          <p className="text-xs text-neutral-500">{t('profile.credits')}</p>
          <p className="mt-1 text-2xl font-medium text-neutral-100">{credits}</p>
        </div>
        <p className="border-t border-[#242424] pt-4 text-xs leading-relaxed text-neutral-500">
          {t('profile.creditsNote')}
        </p>
      </div>

      <div className="mt-6">
        <SignOutButton />
      </div>
    </main>
  )
}
