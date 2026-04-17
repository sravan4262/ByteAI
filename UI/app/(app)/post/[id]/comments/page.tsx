import { CommentsScreen } from '@/components/features/comments/comments-screen'
import { getPost } from '@/lib/api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface PostCommentsPageProps {
  params: Promise<{ id: string }>
}

export default async function PostCommentsPage({ params }: PostCommentsPageProps) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? null

  const post = await getPost(id, token)

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 text-[var(--t2)]">
        <h1 className="font-mono text-lg font-bold text-[var(--t1)]">BYTE NOT FOUND</h1>
        <p className="font-mono text-sm mt-2">That comment thread does not exist or the byte was removed.</p>
      </div>
    )
  }

  // Comments require auth — fetched client-side in CommentsScreen
  return <CommentsScreen post={post} />
}
