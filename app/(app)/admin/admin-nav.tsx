'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PersonStanding } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const tabs: { href: string; label: string; icon?: LucideIcon }[] = [
  { href: '/admin/models', label: 'Mankenler' },
  { href: '/admin/poses', label: 'Pozlar', icon: PersonStanding },
  { href: '/admin/backgrounds', label: 'Arkaplanlar' },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <div className="mt-4 flex gap-1 border-b border-[#222]">
      {tabs.map((t) => {
        const active = pathname === t.href
        const Icon = t.icon
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm transition ${active ? 'border-b-2 border-white text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
