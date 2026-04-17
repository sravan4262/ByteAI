// Legacy SSO callback — replaced by /auth/callback route handler.
// This page is no longer reachable; kept to avoid 404 if old links exist.
import { redirect } from 'next/navigation'

export default function SSOCallbackPage() {
  redirect('/auth/callback')
}
