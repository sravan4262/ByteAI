import { DetailScreen } from '@/components/features/detail/detail-screen'
import { getPost } from '@/lib/api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface PostPageProps {
  params: Promise<{ id: string }>
}

export default async function PostDetailPage({ params }: PostPageProps) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? null

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
