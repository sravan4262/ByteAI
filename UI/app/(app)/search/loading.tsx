export default function SearchLoading() {
  return (
    <div className="flex-1 flex flex-col gap-4 p-5 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-el)]" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-2.5 bg-[var(--bg-el)] rounded w-28" />
              <div className="h-2 bg-[var(--bg-el)] rounded w-40" />
            </div>
          </div>
          <div className="h-4 bg-[var(--bg-el)] rounded w-2/3" />
          <div className="h-2.5 bg-[var(--bg-el)] rounded w-full" />
          <div className="h-2.5 bg-[var(--bg-el)] rounded w-4/5" />
        </div>
      ))}
    </div>
  )
}
