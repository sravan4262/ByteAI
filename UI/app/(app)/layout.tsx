import { AppShell } from '@/components/layout/app-shell'
import { AuthGuard } from '@/components/layout/auth-guard'
import { Toaster } from 'sonner'
import type { ReactNode } from 'react'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
      <Toaster position="top-right" theme="dark" richColors />
    </AuthGuard>
  )
}
