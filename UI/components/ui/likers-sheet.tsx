"use client"

import { useEffect, useState } from 'react'
import { X, Heart } from 'lucide-react'
import { getByteLikers } from '@/lib/api'
import type { Liker } from '@/lib/api'

interface LikersSheetProps {
  byteId: string
  likeCount: number
  onClose: () => void
}

export function LikersSheet({ byteId, likeCount, onClose }: LikersSheetProps) {
  const [likers, setLikers] = useState<Liker[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getByteLikers(byteId).then((data) => {
      setLikers(data)
      setLoading(false)
    })
  }, [byteId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Centered modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-sm bg-[var(--bg-el)] border border-[var(--border)] rounded-3xl flex flex-col max-h-[70vh] shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
            <div className="flex items-center gap-2">
              <Heart size={14} className="text-[var(--accent)]" fill="currentColor" />
              <span className="font-mono text-xs font-bold text-[var(--t1)]">
                {likeCount} LIKE{likeCount === 1 ? '' : 'S'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-[var(--bg-card)] border border-[var(--border-m)] flex items-center justify-center text-[var(--t2)] hover:text-[var(--t1)] transition-colors"
            >
              <X size={12} />
            </button>
          </div>

          {/* Scrollable list */}
          <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)] px-4 py-3 space-y-3">
            {loading ? (
              <p className="font-mono text-[11px] text-[var(--t3)] text-center py-8 animate-pulse">LOADING...</p>
            ) : likers.length === 0 ? (
              <p className="font-mono text-[11px] text-[var(--t3)] text-center py-8">No likes yet.</p>
            ) : (
              likers.map((liker) => (
                <div key={liker.userId} className="flex items-center gap-3 py-1">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a1f2f] to-[#16243f] border border-[var(--border-m)] flex items-center justify-center font-mono text-[10px] font-bold text-[var(--accent)] flex-shrink-0">
                    {liker.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold text-[var(--t1)] flex items-center gap-1.5">
                      @{liker.username}
                      {liker.isVerified && <span className="text-[9px] text-[var(--accent)]">✦</span>}
                    </div>
                    <div className="font-mono text-[9px] text-[var(--t3)]">{liker.displayName}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}
