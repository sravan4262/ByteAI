"use client"

import type { ReactNode } from 'react'

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full h-full bg-[var(--bg)] overflow-hidden flex flex-col">
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  )
}
