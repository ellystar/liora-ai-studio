'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, PersonStanding, Shirt, Wand2, Shield } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import { LanguageToggle } from '@/components/language-toggle'

const tools = [
  { href: '/ecom-studio', Icon: Sparkles },
  { href: '/pose-generator', Icon: PersonStanding },
  { href: '/flat-to-ghost', Icon: Shirt },
  { href: '/edit-photo', Icon: Wand2 },
]

export function Navbar({ credits, email, isAdmin }: { credits: number; email: string; isAdmin?: boolean }) {
  const pathname = usePathname()
  const { t } = useI18n()
  const initial = email.charAt(0).toUpperCase() || '?'

  return (
    <nav className="flex items-center justify-between border-b border-[#1c1c1c] px-5 py-3">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-base font-medium tracking-tight text-white">
          Liora
        </Link>
        <div className="flex items-center gap-1">
          {tools.map(({ href, Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                  active ? 'bg-[#1c1c1c] text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </Link>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#262626] px-3 py-1.5 text-xs text-neutral-200">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          {credits} {t('nav.credits')}
        </span>
        <LanguageToggle />
        {isAdmin && (
          <Link
            href="/admin"
            aria-label="Admin"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
              pathname.startsWith('/admin') ? 'bg-[#1c1c1c] text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'
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
