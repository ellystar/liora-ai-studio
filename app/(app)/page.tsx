'use client'

import Link from 'next/link'
import { Sparkles, PersonStanding, Shirt, Wand2, LayoutGrid, Footprints } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import { PixelCursor } from '@/components/pixel-cursor'

export default function Home() {
  const { t } = useI18n()

  const tools = [
    { href: '/ecom-studio', Icon: Sparkles, title: t('tool.ecom.title'), desc: t('tool.ecom.desc'), bgImage: '/ecom-studio.jpg' },
    { href: '/shoe-studio', Icon: Footprints, title: t('tool.shoe.title'), desc: t('shoe.cardDesc'), bgImage: null },
    { href: '/batch-studio', Icon: LayoutGrid, title: t('batch.title'), desc: t('batch.cardDesc'), bgImage: null },
    { href: '/pose-generator', Icon: PersonStanding, title: t('tool.pose.title'), desc: t('tool.pose.desc'), bgImage: '/pose-generator.jpg' },
    { href: '/flat-to-ghost', Icon: Shirt, title: t('tool.flat.title'), desc: t('tool.flat.desc'), bgImage: '/flat-to-ghost.jpg' },
    { href: '/edit-photo', Icon: Wand2, title: t('tool.edit.title'), desc: t('tool.edit.desc'), bgImage: '/edit-photo.jpg' },
  ]

  return (
    <>
      <PixelCursor />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-lg font-medium text-neutral-100">{t('home.welcome.title')}</h1>
        <p className="mt-1.5 text-sm text-neutral-500">{t('home.welcome.subtitle')}</p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map(({ href, Icon, title, desc, bgImage }) => (
            <Link
              key={href}
              href={href}
              className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-[#242424] bg-[#141414] transition hover:border-[#2e2e2e]"
            >
              {bgImage && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bgImage}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
              <span className="absolute left-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-xl bg-black/30">
                <Icon className="h-4 w-4 text-white" />
              </span>
              <div className="absolute inset-x-0 bottom-0 z-20 p-4">
                <p className="text-lg font-medium text-white">{title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-neutral-300">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  )
}
