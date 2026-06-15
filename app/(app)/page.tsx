'use client'

import Link from 'next/link'
import { Sparkles, PersonStanding, Shirt, Wand2, LayoutGrid } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import { PixelCursor } from '@/components/pixel-cursor'

export default function Home() {
  const { t } = useI18n()

  const tools = [
    { href: '/ecom-studio', Icon: Sparkles, title: t('tool.ecom.title') },
    { href: '/pose-generator', Icon: PersonStanding, title: t('tool.pose.title') },
    { href: '/flat-to-ghost', Icon: Shirt, title: t('tool.flat.title') },
    { href: '/edit-photo', Icon: Wand2, title: t('tool.edit.title') },
  ]

  return (
    <>
      <PixelCursor />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-lg font-medium text-neutral-100">{t('home.welcome.title')}</h1>
        <p className="mt-1.5 text-sm text-neutral-500">{t('home.welcome.subtitle')}</p>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row">
          <Link
            href="/batch-studio"
            className="flex min-h-[300px] flex-[1.25] flex-col justify-between rounded-2xl border border-[#242424] bg-[#141414] p-6 transition hover:border-[#2e2e2e]"
          >
            <span className="inline-flex items-center gap-2 text-neutral-400">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f1f1f]">
                <LayoutGrid className="h-5 w-5 text-neutral-100" />
              </span>
              <span className="text-xs text-neutral-500">{t('batch.tag')}</span>
            </span>
            <div>
              <p className="text-xl font-medium text-neutral-100">{t('batch.title')}</p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{t('batch.cardDesc')}</p>
            </div>
          </Link>

          <div className="grid flex-[1.6] grid-cols-2 gap-[14px]">
            {tools.map(({ href, Icon, title }) => (
              <Link
                key={href}
                href={href}
                className="flex aspect-square flex-col items-start justify-between rounded-2xl border border-[#242424] bg-[#141414] p-4 transition hover:border-[#2e2e2e]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f1f1f]">
                  <Icon className="h-5 w-5 text-neutral-100" />
                </span>
                <p className="text-sm font-medium text-neutral-100">{title}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
