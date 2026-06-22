'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, PersonStanding, Shirt, Wand2, Shield, LayoutGrid, FolderOpen, Footprints } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import { LanguageToggle } from '@/components/language-toggle'

const tools = [
  { href: '/ecom-studio', Icon: Sparkles, label: 'E-com' },
  { href: '/shoe-studio', Icon: Footprints, label: 'Shoe' },
  { href: '/pose-generator', Icon: PersonStanding, label: 'Pose' },
  { href: '/flat-to-ghost', Icon: Shirt, label: 'Ghost' },
  { href: '/edit-photo', Icon: Wand2, label: 'Edit' },
  { href: '/batch-studio', Icon: LayoutGrid, label: 'Batch' },
]

export function Navbar({ credits, email, isAdmin }: { credits: number; email: string; isAdmin?: boolean }) {
  const pathname = usePathname()
  const { t } = useI18n()
  const initial = email.charAt(0).toUpperCase() || '?'

  return (
    <nav className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-[#1c1c1c] px-5 py-3">
      <Link href="/" className="text-base font-medium tracking-tight text-white">
        Liora
      </Link>

      <div className="flex items-center gap-1">
        {tools.map(({ href, Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition ${
                active
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>

      <div className="flex items-center justify-end gap-2.5">
        <Link
          href="/assets"
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs transition ${
            pathname === '/assets' ? 'bg-white/10 text-neutral-100' : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          {t('assets.cardTitle')}
        </Link>
        <Link href="/pricing" className="inline-flex items-center gap-2 rounded-full border border-[#262626] px-3 py-1.5 text-xs text-neutral-200 cursor-pointer transition hover:border-[#2e2e2e]">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          {credits} {t('nav.credits')}
        </Link>
        <LanguageToggle />
        {isAdmin && (
          <Link
            href="/admin"
            aria-label="Admin"
            className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
              pathname.startsWith('/admin') ? 'bg-white/10 text-neutral-100' : 'text-neutral-500 hover:bg-white/5 hover:text-neutral-300'
            }`}
          >
            <Shield className="h-[18px] w-[18px]" />
          </Link>
        )}
        <Link
          href="/profile"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#222] text-xs font-medium text-neutral-200"
        >
          {initial}
        </Link>
      </div>
    </nav>
  )
}
