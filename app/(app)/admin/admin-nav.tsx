'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/admin/models', label: 'Mankenler' },
  { href: '/admin/backgrounds', label: 'Arkaplanlar' },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <div className="mt-4 flex gap-1 border-b border-[#222]">
      {tabs.map((t) => {
        const active = pathname === t.href
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2 text-sm transition ${active ? 'border-b-2 border-white text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
