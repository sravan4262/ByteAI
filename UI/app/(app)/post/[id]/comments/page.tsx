import { CommentsScreen } from '@/components/features/comments/comments-screen'
import { getPost, getPostComments } from '@/lib/api'

interface PostCommentsPageProps {
  params: Promise<{ id: string }>
}

export default async function PostCommentsPage({ params }: PostCommentsPageProps) {
  const { id } = await params
  const post = await getPost(id)

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 text-[var(--t2)]">
        <h1 className="font-mono text-lg font-bold text-[var(--t1)]">BYTE NOT FOUND</h1>
        <p className="font-mono text-sm mt-2">That comment thread does not exist or the byte was removed.</p>
      </div>
    )
  }

  const { comments } = await getPostComments(id, {})
  return <CommentsScreen post={post} comments={comments} />
}
