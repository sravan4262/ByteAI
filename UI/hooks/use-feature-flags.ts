"use client"

import { useState, useEffect } from 'react'
import { getEnabledFeatureFlags } from '@/lib/api/feature-flags'

let cachedFlags: Record<string, boolean> | null = null
let lastFetchTime = 0
const POLLING_INTERVAL = 60_000 // 60 seconds

// Singleton event target so all components instantly update when a fetch happens
const flagEvents = new EventTarget()

async function fetchAndCacheFlags() {
  const now = Date.now()
  if (cachedFlags && now - lastFetchTime < POLLING_INTERVAL) return cachedFlags

  try {
    cachedFlags = await getEnabledFeatureFlags()
    lastFetchTime = now
    flagEvents.dispatchEvent(new Event('flags-updated'))
    return cachedFlags
  } catch {
    return cachedFlags || {}
  }
}

export function useAllFeatureFlags() {
  const [flags, setFlags] = useState<Record<string, boolean>>(cachedFlags || {})

  useEffect(() => {
    // Initial fetch if stale
    fetchAndCacheFlags().then((newFlags) => {
      setFlags(newFlags)
    })

    // Listen to updates from other hooks/polls
    const handleUpdate = () => {
      if (cachedFlags) setFlags({ ...cachedFlags })
    }
    flagEvents.addEventListener('flags-updated', handleUpdate)

    // Setup polling
    const interval = setInterval(() => {
      fetchAndCacheFlags()
    }, POLLING_INTERVAL)

    return () => {
      flagEvents.removeEventListener('flags-updated', handleUpdate)
      clearInterval(interval)
    }
  }, [])

  return flags
}

/**
 * Returns a boolean indicating if a specific feature flag is currently enabled.
 */
export function useFeatureFlag(key: string): boolean {
  const flags = useAllFeatureFlags()
  return !!flags[key]
}
