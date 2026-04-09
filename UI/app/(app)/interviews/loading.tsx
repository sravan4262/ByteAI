export default function InterviewsLoading() {
  return (
    <div className="flex-1 flex flex-col gap-0 animate-pulse overflow-hidden">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="px-4 md:px-8 py-5 border-b border-[var(--border)] flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-el)]" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-3 bg-[var(--bg-el)] rounded w-32" />
              <div className="h-2 bg-[var(--bg-el)] rounded w-48" />
            </div>
          </div>
          <div className="h-5 bg-[var(--bg-el)] rounded w-3/4" />
          <div className="h-3 bg-[var(--bg-el)] rounded w-full" />
          <div className="h-24 bg-[var(--bg-el)] rounded-lg" />
        </div>
      ))}
    </div>
  )
}
