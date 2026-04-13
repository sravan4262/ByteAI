"use client"

export function Avatar({
  initials,
  imageUrl,
  size = 'xs',
  variant = 'cyan',
  onClick,
}: {
  initials: string
  imageUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'cyan' | 'purple' | 'green' | 'orange'
  onClick?: (e: React.MouseEvent) => void
}) {
  const sizeClasses = {
    xs: 'w-8 h-8 text-[8px] md:w-9 md:h-9 md:text-[9px]',
    sm: 'w-10 h-10 text-[11px] md:w-11 md:h-11 md:text-xs',
    md: 'w-12 h-12 text-xs md:w-14 md:h-14 md:text-sm',
    lg: 'w-16 h-16 text-lg md:w-20 md:h-20 md:text-xl',
    xl: 'w-20 h-20 text-2xl',
  }

  const variantClasses = {
    cyan: 'bg-gradient-to-br from-[#131b40] to-[#1e3580] text-[var(--cyan)]',
    purple: 'bg-gradient-to-br from-[#1e1040] to-[#3a1a90] text-[var(--purple)]',
    green: 'bg-gradient-to-br from-[#0a1e14] to-[#145840] text-[var(--green)]',
    orange: 'bg-gradient-to-br from-[#1a1040] to-[#2a1880] text-[var(--orange)]',
  }

  const base = `${sizeClasses[size]} rounded-full border-[1.5px] border-[var(--border-h)] flex-shrink-0 transition-all hover:scale-105 ${onClick ? 'cursor-pointer' : ''}`

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={initials}
        referrerPolicy="no-referrer"
        onClick={onClick}
        className={`${base} object-cover hover:ring-2 hover:ring-[var(--accent)]`}
      />
    )
  }

  return (
    <div
      onClick={onClick}
      className={`${base} ${variantClasses[variant]} flex items-center justify-center font-mono font-bold hover:shadow-[0_0_16px_rgba(34,211,238,0.2)]`}
    >
      {initials}
    </div>
  )
}
