import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'

// Clerk lands here after Google/GitHub OAuth redirect.
// AuthenticateWithRedirectCallback exchanges the OAuth code for a session,
// then redirects to redirectUrlComplete (set in authenticateWithRedirect call).
export default function SSOCallbackPage() {
  return <AuthenticateWithRedirectCallback />
}
