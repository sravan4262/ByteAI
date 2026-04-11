import { getInterview } from '@/lib/api'
import { InterviewDetailScreen } from '@/components/features/interviews/interview-detail-screen'

interface InterviewPageProps {
  params: Promise<{ id: string }>
}

export default async function InterviewDetailPage({ params }: InterviewPageProps) {
  const { id } = await params
  const interview = await getInterview(id)

  if (!interview) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 text-[var(--t2)]">
        <h1 className="font-mono text-lg font-bold text-[var(--t1)]">INTERVIEW NOT FOUND</h1>
        <p className="font-mono text-sm mt-2">This interview may have been removed or the link is invalid.</p>
      </div>
    )
  }

  return <InterviewDetailScreen interview={interview} />
}
