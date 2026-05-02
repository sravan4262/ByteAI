"use client"

import { Ban, Mail } from 'lucide-react'

const SUPPORT_EMAIL = 'officialbyteai@gmail.com'

interface AccountSuspendedScreenProps {
  message?: string
  onSignOut: () => void
}

/**
 * Full-screen takeover shown when the API returns ACCOUNT_SUSPENDED.
 * The AuthGuard mounts this in place of the app shell — no in-app navigation
 * happens while it's visible.
 */
export function AccountSuspendedScreen({ message, onSignOut }: AccountSuspendedScreenProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-md rounded-xl border border-[rgba(239,68,68,0.35)] bg-[var(--bg-card)] overflow-hidden shadow-[0_16px_64px_rgba(0,0,0,0.7)]">
        <div className="h-px bg-gradient-to-r from-[var(--red,#ef4444)] via-[rgba(239,68,68,0.3)] to-transparent" />
        <div className="p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.25)] flex items-center justify-center flex-shrink-0">
              <Ban size={18} className="text-[var(--red,#ef4444)]" />
            </div>
            <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-[var(--red,#ef4444)] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.18)] px-2 py-[3px] rounded">
              ACCOUNT_SUSPENDED
            </span>
          </div>

          <div>
            <h1 className="font-mono text-base font-bold tracking-[0.04em] text-[var(--t1)]">
              YOUR ACCOUNT IS SUSPENDED
            </h1>
            <div className="h-px bg-gradient-to-r from-[rgba(239,68,68,0.3)] to-transparent mt-2" />
          </div>

          <p className="font-mono text-xs leading-relaxed text-[var(--t2)]">
            {message ?? 'Your account has been suspended.'}
          </p>

          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Account%20suspension%20appeal`}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--border-h)] bg-[var(--bg-el)] hover:border-[var(--accent)] transition-all"
          >
            <Mail size={13} className="text-[var(--accent)]" />
            <span className="font-mono text-[11px] text-[var(--t1)]">{SUPPORT_EMAIL}</span>
          </a>

          <button
            onClick={onSignOut}
            className="py-2.5 bg-[var(--bg-el)] border border-[var(--border-h)] hover:border-[rgba(239,68,68,0.4)] rounded-lg font-mono text-xs font-bold tracking-[0.08em] text-[var(--t2)] hover:text-[var(--red,#ef4444)] transition-all"
          >
            SIGN OUT
          </button>
        </div>
      </div>
    </div>
  )
}
