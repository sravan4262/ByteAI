"use client"

export function Avatar({
  initials,
  size = 'xs',
  variant = 'cyan',
}: {
  initials: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'cyan' | 'purple' | 'green' | 'orange'
}) {
  const sizeClasses = {
    xs: 'w-8 h-8 text-[8px] md:w-9 md:h-9 md:text-[9px]',
    sm: 'w-10 h-10 text-[11px] md:w-11 md:h-11 md:text-xs',
    md: 'w-12 h-12 text-xs md:w-14 md:h-14 md:text-sm',
    lg: 'w-16 h-16 text-lg md:w-20 md:h-20 md:text-xl',
  }

  const variantClasses = {
    cyan: 'bg-gradient-to-br from-[#131b40] to-[#1e3580] text-[var(--cyan)]',
    purple: 'bg-gradient-to-br from-[#1e1040] to-[#3a1a90] text-[var(--purple)]',
    green: 'bg-gradient-to-br from-[#0a1e14] to-[#145840] text-[var(--green)]',
    orange: 'bg-gradient-to-br from-[#1a1040] to-[#2a1880] text-[var(--orange)]',
  }

  return (
    <div
      className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-full border-[1.5px] border-[var(--border-h)] flex items-center justify-center font-mono font-bold flex-shrink-0 transition-all hover:scale-105 hover:shadow-[0_0_16px_rgba(34,211,238,0.2)]`}
    >
      {initials}
    </div>
  )
}
