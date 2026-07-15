'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, PersonStanding, Shirt, Wand2, Shield, LayoutGrid, Footprints, Video, WandSparkles } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'

const tools = [
  { href: '/ecom-studio', Icon: Sparkles, label: 'E-com' },
  { href: '/shoe-studio', Icon: Footprints, label: 'Shoe' },
  { href: '/pose-generator', Icon: PersonStanding, label: 'Pose' },
  { href: '/flat-to-ghost', Icon: Shirt, label: 'Ghost' },
  { href: '/edit-photo', Icon: Wand2, label: 'Edit' },
  { href: '/batch-studio', Icon: LayoutGrid, label: 'Batch' },
  { href: '/video-studio', Icon: Video, label: 'Video' },
  { href: '/style-transfer', Icon: WandSparkles, label: 'Stil' },
]

export function Navbar({ credits, email, isAdmin }: { credits: number; email: string; isAdmin?: boolean }) {
  const pathname = usePathname()
  const { t, locale, setLanguage } = useI18n()
  const initial = email.charAt(0).toUpperCase() || '?'
  const isHome = pathname === '/'

  return (
    <nav className="atelier atelier-nav grid grid-cols-[1fr_auto_1fr] items-center px-5 py-3.5 md:px-8">
      <Link href="/" className="atelier-nav-brand">
        Liora
      </Link>

      {!isHome && (
        <div className="flex max-w-[min(100%,520px)] items-center justify-center gap-0.5 overflow-x-auto px-1">
          {tools.map(({ href, Icon, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`atelier-tool-tab inline-flex items-center gap-1.5 ${active ? 'is-active' : ''}`}
              >
                <Icon className="h-3 w-3 shrink-0 opacity-70" strokeWidth={1.5} />
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      )}

      {isHome && <div />}

      <div className="flex items-center justify-end gap-4 md:gap-5">
        <Link href="#" className={`atelier-nav-link hidden sm:inline ${pathname === '#' ? 'is-active' : ''}`}>
          {t('nav.shoots')}
        </Link>
        <Link
          href="/assets"
          className={`atelier-nav-link ${pathname === '/assets' ? 'is-active' : ''}`}
        >
          {t('nav.assets')}
        </Link>
        {!isHome && (
          <Link href="/pricing" className="atelier-credits-pill">
            {credits} {t('nav.credits')}
          </Link>
        )}
        <button
          type="button"
          onClick={() => setLanguage(locale === 'tr' ? 'en' : 'tr')}
          className="atelier-nav-link"
        >
          {locale === 'tr' ? 'EN' : 'TR'}
        </button>
        {isAdmin && (
          <Link
            href="/admin"
            aria-label="Admin"
            className={`flex h-8 w-8 items-center justify-center rounded-full border border-transparent transition ${
              pathname.startsWith('/admin')
                ? 'border-[#26231E] text-[#EDE8DF]'
                : 'text-[#8F8A80] hover:border-[#26231E] hover:text-[#EDE8DF]'
            }`}
          >
            <Shield className="h-[16px] w-[16px]" strokeWidth={1.5} />
          </Link>
        )}
        <Link
          href="/profile"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#26231E] bg-[#14110c] text-[11px] font-medium text-[#EDE8DF]"
        >
          {initial}
        </Link>
      </div>
    </nav>
  )
}
