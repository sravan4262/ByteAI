import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DetailScreen } from '@/components/features/detail/detail-screen'
import { getPost } from '@/lib/api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

interface PostPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { id } = await params
  const post = await getPost(id, null)

  const title = post?.title ?? 'Post on ByteAI'
  const description = post?.body
    ? post.body.slice(0, 200)
    : 'Tech-focused short content on ByteAI.'
  const url = `/post/${id}`

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

export default async function PostDetailPage({ params }: PostPageProps) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect(`/?next=${encodeURIComponent(`/post/${id}`)}`)
  }

  const token = session.access_token

  const post = await getPost(id, token)

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 text-[var(--t2)]">
        <h1 className="font-mono text-lg font-bold text-[var(--t1)]">POST NOT FOUND</h1>
        <p className="font-mono text-sm mt-2">This byte may have been removed or the link is invalid.</p>
      </div>
    )
  }

  return <DetailScreen post={post} />
}
