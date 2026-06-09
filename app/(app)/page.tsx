'use client'

import Link from 'next/link'
import { Sparkles, PersonStanding, Shirt, Wand2, ArrowRight, Layers } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'

export default function Home() {
  const { t } = useI18n()

  const cards = [
    { href: '/ecom-studio', Icon: Sparkles, title: t('tool.ecom.title'), desc: t('tool.ecom.desc') },
    { href: '/pose-generator', Icon: PersonStanding, title: t('tool.pose.title'), desc: t('tool.pose.desc') },
    { href: '/flat-to-ghost', Icon: Shirt, title: t('tool.flat.title'), desc: t('tool.flat.desc') },
    { href: '/assets', Icon: Layers, title: t('assets.cardTitle'), desc: t('assets.cardDesc') },
  ]

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-lg font-medium text-neutral-100">{t('home.welcome.title')}</h1>
      <p className="mt-1.5 text-sm text-neutral-500">{t('home.welcome.subtitle')}</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ href, Icon, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-[150px] flex-col justify-between rounded-2xl border border-[#242424] bg-[#141414] p-4 transition hover:border-[#2e2e2e]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f1f1f]">
              <Icon className="h-5 w-5 text-neutral-100" />
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-100">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <Link
        href="/edit-photo"
        className="mt-3 flex items-center gap-4 rounded-2xl border border-[#242424] bg-[#141414] p-4 transition hover:border-[#2e2e2e]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1f1f1f]">
          <Wand2 className="h-5 w-5 text-neutral-100" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-100">{t('tool.edit.title')}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{t('tool.edit.desc')}</p>
        </div>
        <ArrowRight className="h-5 w-5 text-neutral-600" />
      </Link>
    </main>
  )
}
