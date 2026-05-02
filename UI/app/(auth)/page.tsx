import { Suspense } from 'react'
import { AuthScreen } from '@/components/features/auth/auth-screen'

export default function AuthPage() {
  return (
    <Suspense>
      <AuthScreen />
    </Suspense>
  )
}
