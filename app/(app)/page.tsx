'use client'

import Link from 'next/link'
import { Sparkles, PersonStanding, Shirt, Wand2, LayoutGrid, Footprints } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import { PixelCursor } from '@/components/pixel-cursor'

export default function Home() {
  const { t } = useI18n()

  const tools = [
    { href: '/ecom-studio', Icon: Sparkles, title: t('tool.ecom.title'), desc: t('tool.ecom.desc'), bgImage: '/ecom-studio.jpg', colSpan: 'col-span-2' },
    { href: '/shoe-studio', Icon: Footprints, title: t('tool.shoe.title'), desc: t('shoe.cardDesc'), bgImage: '/shoe-studio.jpg', colSpan: 'col-span-1' },
    { href: '/batch-studio', Icon: LayoutGrid, title: t('batch.title'), desc: t('batch.cardDesc'), bgImage: null, colSpan: 'col-span-1' },
    { href: '/pose-generator', Icon: PersonStanding, title: t('tool.pose.title'), desc: t('tool.pose.desc'), bgImage: '/pose-generator.jpg', colSpan: 'col-span-1' },
    { href: '/flat-to-ghost', Icon: Shirt, title: t('tool.flat.title'), desc: t('tool.flat.desc'), bgImage: '/flat-to-ghost.jpg', colSpan: 'col-span-1' },
    { href: '/edit-photo', Icon: Wand2, title: t('tool.edit.title'), desc: t('tool.edit.desc'), bgImage: '/edit-photo.jpg', colSpan: 'col-span-2' },
  ]

  return (
    <>
      <PixelCursor />
      <main className="mx-auto flex h-[calc(100vh-64px)] w-full max-w-5xl flex-col overflow-hidden px-6 py-6">
        <div className="mb-4 shrink-0">
          <h1 className="text-lg font-medium text-neutral-100">{t('home.welcome.title')}</h1>
          <p className="mt-1.5 text-sm text-neutral-500">{t('home.welcome.subtitle')}</p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-4 grid-rows-2 gap-4">
          {tools.map(({ href, Icon, title, desc, bgImage, colSpan }) => (
            <Link
              key={href}
              href={href}
              className={`relative h-full w-full overflow-hidden rounded-2xl border border-[#242424] bg-[#141414] transition hover:border-[#2e2e2e] ${colSpan}`}
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
                <p className="line-clamp-1 text-lg font-medium text-white">{title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-neutral-300">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  )
}
