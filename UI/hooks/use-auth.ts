"use client"

import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocalStorage } from './use-local-storage'

interface AuthState {
  isAuthenticated: boolean
  isOnboarded: boolean
}

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`
}

export function useAuth() {
  const [auth, setAuth] = useLocalStorage<AuthState>('byteai_auth_state', {
    isAuthenticated: process.env.NODE_ENV === 'development',
    isOnboarded: process.env.NODE_ENV === 'development',
  })
  const router = useRouter()

  // Sync cookies to localStorage on every mount.
  // If localStorage is cleared (or first visit), cookies are wiped too — keeps proxy in sync.
  useEffect(() => {
    if (auth.isAuthenticated) {
      setCookie('byteai_auth', '1')
    } else {
      deleteCookie('byteai_auth')
      deleteCookie('byteai_onboarded')
    }
    if (auth.isOnboarded) {
      setCookie('byteai_onboarded', '1')
    } else {
      deleteCookie('byteai_onboarded')
    }
  }, [auth.isAuthenticated, auth.isOnboarded])

  const login = useCallback(() => {
    setAuth((prev) => ({ ...prev, isAuthenticated: true }))
    setCookie('byteai_auth', '1')
    router.push('/onboarding')
  }, [setAuth, router])

  const loginIfOnboarded = useCallback(() => {
    setAuth({ isAuthenticated: true, isOnboarded: true })
    setCookie('byteai_auth', '1')
    setCookie('byteai_onboarded', '1')
    router.push('/feed')
  }, [setAuth, router])

  const completeOnboarding = useCallback(() => {
    setAuth((prev) => ({ ...prev, isOnboarded: true }))
    setCookie('byteai_onboarded', '1')
    router.push('/feed')
  }, [setAuth, router])

  const logout = useCallback(async () => {
    setAuth({ isAuthenticated: false, isOnboarded: false })
    deleteCookie('byteai_auth')
    deleteCookie('byteai_onboarded')
    router.push('/')
  }, [setAuth, router])

  return { auth, login, loginIfOnboarded, completeOnboarding, logout }
}
