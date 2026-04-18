import { Suspense } from 'react'
import { FeedScreen } from '@/components/features/feed/feed-screen'

export const dynamic = 'force-dynamic'

export default function FeedPage() {
  return (
    <Suspense>
      <FeedScreen contentType="bytes" />
    </Suspense>
  )
}
