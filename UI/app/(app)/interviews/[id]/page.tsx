import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getInterview } from '@/lib/api'
import { InterviewDetailScreen } from '@/components/features/interviews/interview-detail-screen'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

interface InterviewPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: InterviewPageProps): Promise<Metadata> {
  const { id } = await params
  const interview = await getInterview(id, null)

  const title = interview?.title ?? 'Interview on ByteAI'
  const descriptionParts = [
    interview?.company,
    interview?.role,
    interview?.location,
  ].filter(Boolean)
  const description = descriptionParts.length
    ? descriptionParts.join(' · ')
    : 'Real interview experiences shared on ByteAI.'
  const url = `/interviews/${id}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'ByteAI',
      type: 'article',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
  }
}

export default async function InterviewDetailPage({ params }: InterviewPageProps) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect(`/?next=${encodeURIComponent(`/interviews/${id}`)}`)
  }

  const token = session.access_token

  const interview = await getInterview(id, token)

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
