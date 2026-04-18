import { Suspense } from 'react'
import { FeedScreen } from '@/components/features/feed/feed-screen'


export default function FeedPage() {
  return (
    <Suspense>
      <FeedScreen contentType="bytes" />
    </Suspense>
  )
}
