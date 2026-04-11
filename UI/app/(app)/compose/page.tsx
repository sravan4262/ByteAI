import { Suspense } from 'react'
import { ComposeScreen } from '@/components/features/compose/compose-screen'

export default function ComposePage() {
  return (
    <Suspense>
      <ComposeScreen />
    </Suspense>
  )
}
