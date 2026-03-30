'use client'

import { useAuth } from '@/lib/auth/context'
import { LogOut } from 'lucide-react'
import type { User } from '@/types'

export function TopBar({ user }: { user: User }) {
  const { logout } = useAuth()
  return (
    <header className="h-12 bg-white border-b border-gray-100 flex items-center justify-end px-4 gap-3">
      <span className="text-sm text-gray-600">{user.full_name}</span>
      <button
        onClick={logout}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        title="Sign out"
      >
        <LogOut size={16} />
      </button>
    </header>
  )
}
