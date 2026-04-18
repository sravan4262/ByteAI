import { Suspense } from 'react'
import { ComposeScreen } from '@/components/features/compose/compose-screen'

export const dynamic = 'force-dynamic'

export default function ComposePage() {
  return (
    <Suspense>
      <ComposeScreen />
    </Suspense>
  )
}
