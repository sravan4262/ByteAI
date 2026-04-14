"use client"

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/api'
import { useAuth } from '@clerk/nextjs'

export function useIsAdmin() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!authLoaded) return
    if (!isSignedIn) {
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
  }, [authLoaded, isSignedIn])

  return { isAdmin, isLoaded }
}
