export default function ProfileLoading() {
  return (
    <div className="flex-1 flex flex-col animate-pulse overflow-hidden">
      <div className="px-5 py-5 border-b border-[var(--border)] flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="w-[68px] h-[68px] rounded-full bg-[var(--bg-el)]" />
          <div className="h-8 w-28 bg-[var(--bg-el)] rounded-full" />
        </div>
        <div className="h-5 bg-[var(--bg-el)] rounded w-40" />
        <div className="h-3 bg-[var(--bg-el)] rounded w-24" />
        <div className="h-16 bg-[var(--bg-el)] rounded-lg" />
      </div>
      <div className="mx-5 mt-4 h-16 bg-[var(--bg-el)] rounded-lg" />
      <div className="grid grid-cols-4 mx-5 mt-4 gap-px">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-[var(--bg-el)] rounded" />
        ))}
      </div>
    </div>
  )
}
