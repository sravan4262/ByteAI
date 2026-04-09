interface ByteAILogoProps {
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Animated ByteAI logo — same shimmer/glow everywhere it appears.
 * size="sm" → used in page headers (32px box)
 * size="md" → used in sidebar (38px box)
 * size="lg" → used in auth screen (56px box)
 */
export function ByteAILogo({ showText = true, size = 'sm' }: ByteAILogoProps) {
  const box = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-[38px] h-[38px] rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
  }[size]

  const icon = {
    sm: 'text-[11px]',
    md: 'text-[13px]',
    lg: 'text-lg',
  }[size]

  const label = {
    sm: 'text-[11px]',
    md: 'text-sm',
    lg: 'text-lg',
  }[size]

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${box} bg-gradient-to-br from-[#0a1530] to-[#152060] border border-[var(--border-h)] flex items-center justify-center shadow-[0_0_24px_rgba(59,130,246,0.22),0_0_48px_rgba(59,130,246,0.08),inset_0_1px_0_rgba(255,255,255,0.07)] relative overflow-hidden flex-shrink-0`}
      >
        {/* Shimmer sweep */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/[0.07] to-transparent animate-shimmer" />
        {/* Glow orb */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.18),transparent_70%)]" />
        <span
          className={`font-mono font-bold text-[var(--cyan)] relative z-10 drop-shadow-[0_0_12px_var(--cyan)] ${icon}`}
        >
          {'</>'}
        </span>
      </div>
      {showText && (
        <span className={`font-mono font-bold tracking-[0.1em] text-[var(--t1)] ${label}`}>
          BYTEAI
        </span>
      )}
    </div>
  )
}
