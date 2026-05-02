import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg)] px-6">
      <div className="w-full max-w-[520px] flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[48px] font-black text-[var(--purple)] leading-none">404</span>
          <div className="flex-1 border-t border-[var(--border-h)]" />
        </div>

        <div>
          <h1 className="font-mono text-base font-bold text-[var(--t1)] tracking-[0.06em] mb-1">
            PAGE NOT FOUND
          </h1>
          <p className="font-mono text-xs text-[var(--t2)] leading-relaxed">
            The route you tried doesn&apos;t exist — but you might still know more shortcuts than you think.
          </p>
        </div>

        <div className="border border-[var(--border-h)] bg-[var(--bg-card)] rounded-xl px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-[3px] h-3.5 rounded-full bg-[var(--purple)]" />
            <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">
              SHORTCUTS THAT STILL WORK
            </span>
          </div>
          {[
            { k: 'Ctrl+`',          v: 'open the support terminal' },
            { k: '?',               v: 'open the hidden-features menu' },
            { k: 'Ctrl+Shift+Esc',  v: 'sign out from anywhere' },
          ].map(({ k, v }) => (
            <div key={k} className="flex items-baseline gap-3">
              <span className="font-mono text-[11px] font-semibold text-[var(--purple)] min-w-[120px]">{k}</span>
              <span className="font-mono text-[11px] text-[var(--t2)]">{v}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/feed"
            className="flex-1 text-center px-4 py-3 rounded-xl border border-[var(--accent)] bg-[rgba(59,130,246,0.1)] font-mono text-xs font-bold text-[var(--accent)] tracking-[0.08em] hover:bg-[rgba(59,130,246,0.18)] transition-all"
          >
            HOME →
          </Link>
          <Link
            href="/interviews"
            className="flex-1 text-center px-4 py-3 rounded-xl border border-[rgba(167,139,250,0.4)] bg-[rgba(167,139,250,0.06)] font-mono text-xs font-bold text-[var(--purple)] tracking-[0.08em] hover:bg-[rgba(167,139,250,0.12)] transition-all"
          >
            INTERVIEWS →
          </Link>
        </div>
      </div>
    </div>
  )
}
