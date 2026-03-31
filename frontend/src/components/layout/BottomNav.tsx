'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Plus, Bot } from 'lucide-react'
import { clsx } from 'clsx'

export function BottomNav() {
  const pathname = usePathname()

  const isObservations = pathname.startsWith('/observations') && !pathname.endsWith('/new')
  const isSearch = pathname.startsWith('/search')
  const isRobot = pathname.startsWith('/robot')

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center h-16 px-2 z-50 safe-area-bottom">
      <Link
        href="/observations"
        className={clsx(
          'flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors',
          isObservations ? 'text-brand-600' : 'text-gray-400'
        )}
      >
        <Home size={22} />
        <span>Log</span>
      </Link>

      <Link
        href="/search"
        className={clsx(
          'flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors',
          isSearch ? 'text-brand-600' : 'text-gray-400'
        )}
      >
        <Search size={22} />
        <span>Search</span>
      </Link>

      {/* Centre FAB — new observation */}
      <Link
        href="/observations/new"
        className="flex-none mx-2 bg-brand-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        aria-label="New observation"
      >
        <Plus size={26} />
      </Link>

      <Link
        href="/robot"
        className={clsx(
          'flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors',
          isRobot ? 'text-brand-600' : 'text-gray-400'
        )}
      >
        <Bot size={22} />
        <span>Robot</span>
      </Link>

      {/* Spacer to balance the layout */}
      <div className="flex-1" />
    </nav>
  )
}
