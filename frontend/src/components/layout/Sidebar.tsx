'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Leaf, Search, Home, Bot } from 'lucide-react'
import { clsx } from 'clsx'

const NAV = [
  { href: '/observations', label: 'Observations', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/robot', label: 'Send Observer', icon: Bot },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-56 bg-white border-r border-gray-100 flex-col">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Leaf className="text-brand-600" size={20} />
          <span className="font-semibold text-gray-900">GenCultura</span>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
