"use client"

import { Bell } from 'lucide-react'
import { Avatar } from '@/components/layout/avatar'

interface FeedHeaderProps {
  contentType: 'bytes' | 'interviews'
}

export function FeedHeader({ contentType }: FeedHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 md:px-8 lg:px-12 xl:px-16 py-3 md:py-4 border-b border-[var(--border)] flex-shrink-0 bg-[rgba(5,5,14,0.95)] backdrop-blur-md">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div>
          <h1 className="font-mono text-sm md:text-base lg:text-lg font-bold tracking-[0.07em]">
            {contentType === 'interviews' ? 'INTERVIEWS' : 'BITS'}
          </h1>
          <div className="font-mono text-[10px] md:text-xs tracking-[0.08em] text-[var(--t2)] mt-0.5 flex items-center gap-[5px]">
            <span className="w-[6px] h-[6px] rounded-full bg-[var(--green)] animate-blink shadow-[0_0_5px_var(--green)]" />
            8,412 DEVS ONLINE
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[var(--bg-el)] border border-[var(--border-m)] flex items-center justify-center relative transition-all hover:border-[var(--border-h)]">
            <Bell size={16} className="text-[var(--t2)]" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--accent)] rounded-full border-[1.5px] border-[var(--bg)] shadow-[0_0_5px_var(--accent)]" />
          </button>
          <Avatar initials="AX" size="sm" />
        </div>
      </div>
    </header>
  )
}
