"use client"

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'

export function useIsAdmin() {
  const { auth } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!auth.isLoaded) return
    if (!auth.isAuthenticated) {
      setIsAdmin(false)
      setIsLoaded(true)
      return
    }

    getCurrentUser()
      .then((user) => {
        setIsAdmin(user?.role === 'admin')
        setIsLoaded(true)
      })
      .catch(() => {
        setIsAdmin(false)
        setIsLoaded(true)
      })
  }, [auth.isLoaded, auth.isAuthenticated])

  return { isAdmin, isLoaded }
}
