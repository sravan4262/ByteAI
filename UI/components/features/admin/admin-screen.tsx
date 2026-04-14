"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useIsAdmin } from '@/hooks/use-is-admin'
import { searchUsers } from '@/lib/api/client'
import { apiFetch } from '@/lib/api/http'
import type { UserResponse } from '@/lib/api/client'
import {
  FeatureFlag,
  getAllFeatureFlags,
  upsertFeatureFlag,
  toggleFeatureFlag,
  deleteFeatureFlag,
} from '@/lib/api/feature-flags'

interface UserWithFlags extends UserResponse {
  assignedFlags?: Set<string>
}

export function AdminScreen() {
  const { isAdmin, isLoaded } = useIsAdmin()
  const router = useRouter()
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // User Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserWithFlags[]>([])
  const [selectedUser, setSelectedUser] = useState<UserWithFlags | null>(null)
  const [userFlagsLoading, setUserFlagsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [assignedFlags, setAssignedFlags] = useState<Set<string>>(new Set())

  // Form State
  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isLoaded && !isAdmin) {
      router.replace('/feed')
    }
  }, [isAdmin, isLoaded, router])

  const fetchFlags = async () => {
    setIsLoading(true)
    const data = await getAllFeatureFlags()
    setFlags(data)
    setIsLoading(false)
  }

  useEffect(() => {
    if (isAdmin) fetchFlags()
  }, [isAdmin])

  // Search users
  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query)
    if (query.trim().length === 0) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await searchUsers(query, 1, 10)
      setSearchResults(results.items || [])
    } catch (e) {
      toast.error('Failed to search users')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Get user's assigned flags
  const selectUser = (user: UserWithFlags) => {
    setSelectedUser(user)
    setUserFlagsLoading(true)
    // Fetch user's assigned flags from backend
    fetchUserAssignedFlags(user.id)
  }

  const fetchUserAssignedFlags = async (userId: string) => {
    try {
      // Get user's currently assigned flags
      const response = await apiFetch<{ data: string[] }>(`/api/admin/feature-flags/users/${userId}`)
      const assigned = new Set(response.data || [])
      setAssignedFlags(assigned)
    } catch (err) {
      console.error('Failed to fetch user flags:', err)
      setAssignedFlags(new Set())
    } finally {
      setUserFlagsLoading(false)
    }
  }

  // Assign/Remove flag to user (toggle)
  const handleToggleFlagForUser = async (flagKey: string) => {
    if (!selectedUser) return

    const isAssigned = assignedFlags.has(flagKey)
    try {
      if (isAssigned) {
        // Remove flag
        await apiFetch(
          `/api/admin/feature-flags/${encodeURIComponent(flagKey)}/users/${selectedUser.id}`,
          { method: 'DELETE' }
        )
        setAssignedFlags(prev => {
          const next = new Set(prev)
          next.delete(flagKey)
          return next
        })
        toast.success(`Flag removed from ${selectedUser.displayName}`)
      } else {
        // Assign flag
        await apiFetch(
          `/api/admin/feature-flags/${encodeURIComponent(flagKey)}/users/${selectedUser.id}`,
          { method: 'POST' }
        )
        setAssignedFlags(prev => new Set(prev).add(flagKey))
        toast.success(`Flag assigned to ${selectedUser.displayName}`)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to toggle flag'
      toast.error(errorMsg)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!key || !name) {
      toast.error('Key and Name are required')
      return
    }

    setSaving(true)
    const newFlag = await upsertFeatureFlag({
      key,
      name,
      description: desc,
      globalOpen: false,
    })
    setSaving(false)

    if (newFlag) {
      toast.success('Feature flag created')
      setKey('')
      setName('')
      setDesc('')
      fetchFlags()
    } else {
      toast.error('Failed to create flag. Ensure the key is unique.')
    }
  }

  const handleToggle = async (flag: FeatureFlag) => {
    const originalState = flag.globalOpen
    // Optimistic UI update
    setFlags(flags.map(f => f.key === flag.key ? { ...f, globalOpen: !originalState } : f))

    const updated = await toggleFeatureFlag(flag.key, !originalState)
    if (!updated) {
      toast.error(`Failed to toggle ${flag.key}`)
      // Revert on failure
      setFlags(flags.map(f => f.key === flag.key ? { ...f, globalOpen: originalState } : f))
    }
  }

  const handleDelete = async (key: string) => {
    if (!window.confirm(`Delete feature flag '${key}'? This cannot be undone.`)) return

    const success = await deleteFeatureFlag(key)
    if (success) {
      toast.success('Flag deleted')
      setFlags(flags.filter(f => f.key !== key))
    } else {
      toast.error('Failed to delete flag')
    }
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-[20px]">
        <div className="w-[30px] h-[30px] border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-[14px]"></div>
        <span className="font-mono text-[10px] text-[var(--t3)] leading-relaxed tracking-[0.05em] uppercase animate-pulse">
          // Loading Admin Data...
        </span>
      </div>
    )
  }

  if (!isAdmin) return null // Handled by standard layout/router redirect

  return (
    <div className="flex-1 flex flex-col gap-[30px] p-[20px] max-w-[1200px] mx-auto w-full animate-fadein">
      <div className="flex flex-col gap-[8px]">
        <h1 className="font-mono text-xl text-[var(--t1)] tracking-[0.05em] font-bold">SYSTEM_ADMIN</h1>
        <p className="font-mono text-[11px] text-[var(--t3)] tracking-[0.05em]">
          // MANAGE FEATURE FLAGS & USER PERMISSIONS
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[30px]">
        {/* Left: Global Feature Flags */}
        <div className="flex flex-col gap-[20px]">
          <h2 className="font-mono text-[14px] text-[var(--t1)] font-bold flex items-center gap-[6px]">
            <span className="text-[var(--accent)]">●</span> GLOBAL FLAGS
          </h2>

          {/* CREATE NEW FLAG FORM */}
          <div className="border border-[var(--border-m)] rounded-lg p-[20px] bg-[var(--bg-card)]">
            <h3 className="font-mono text-[12px] text-[var(--t2)] font-bold mb-[16px] flex items-center gap-[6px]">
              <span className="text-[var(--accent)]">●</span> NEW_FLAG
            </h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-[14px]">
              <input
                type="text"
                placeholder="KEY (e.g. new-feed-v2)"
                value={key}
                onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="bg-[var(--bg-el)] border border-[var(--border-m)] rounded px-[12px] py-[8px] font-mono text-[11px] text-[var(--t1)] focus:border-[var(--accent)] outline-none"
              />
              <input
                type="text"
                placeholder="DISPLAY NAME"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[var(--bg-el)] border border-[var(--border-m)] rounded px-[12px] py-[8px] font-mono text-[11px] text-[var(--t1)] focus:border-[var(--accent)] outline-none"
              />
              <input
                type="text"
                placeholder="DESCRIPTION (OPTIONAL)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="bg-[var(--bg-el)] border border-[var(--border-m)] rounded px-[12px] py-[8px] font-mono text-[11px] text-[var(--t1)] focus:border-[var(--accent)] outline-none"
              />
              <button
                type="submit"
                disabled={saving}
                className="bg-[var(--accent)] hover:bg-[#3b82f6] disabled:opacity-50 text-white font-mono text-[11px] font-bold py-[10px] rounded transition-colors"
              >
                {saving ? 'CREATING...' : 'CREATE FLAG'}
              </button>
            </form>
          </div>

          {/* FEATURE FLAGS TABLE */}
          <div className="flex flex-col gap-[10px]">
            <h3 className="font-mono text-[12px] text-[var(--t2)] font-bold flex items-center gap-[6px]">
              <span className="text-[var(--accent)]">●</span> ALL_FLAGS
            </h3>
            {flags.length === 0 ? (
              <div className="border border-[var(--border-m)] border-dashed rounded-lg p-[40px] text-center font-mono text-[11px] text-[var(--t3)]">
                NO FLAGS
              </div>
            ) : (
              <div className="border border-[var(--border-m)] rounded-lg overflow-hidden bg-[var(--bg-card)]">
                {flags.map((flag, idx) => (
                  <div
                    key={flag.key}
                    className={`flex items-center justify-between p-[16px] ${
                      idx !== flags.length - 1 ? 'border-b border-[var(--border-m)]' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-[4px] flex-1">
                      <div className="flex items-center gap-[8px]">
                        <span className="font-mono text-[13px] text-[var(--t1)] font-bold">{flag.name}</span>
                        <span className="bg-[var(--bg-el)] border border-[var(--border-m)] rounded px-[6px] py-[2px] font-mono text-[9px] text-[var(--t3)]">
                          {flag.key}
                        </span>
                      </div>
                      {flag.description && (
                        <span className="font-mono text-[10px] text-[var(--t2)]">{flag.description}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-[16px] ml-[20px]">
                      {/* TOGGLE */}
                      <button
                        onClick={() => handleToggle(flag)}
                        className={`relative w-[40px] h-[22px] rounded-full transition-colors flex items-center shrink-0 ${
                          flag.globalOpen ? 'bg-[var(--accent)]' : 'bg-[var(--bg-el)] border border-[var(--border-m)]'
                        }`}
                      >
                        <div
                          className={`absolute w-[16px] h-[16px] bg-white rounded-full shadow transition-transform ${
                            flag.globalOpen ? 'translate-x-[20px]' : 'translate-x-[3px]'
                          }`}
                        />
                      </button>

                      {/* DELETE */}
                      <button
                        onClick={() => handleDelete(flag.key)}
                        className="font-mono text-[10px] text-[var(--red)] border border-transparent hover:border-[var(--red)] rounded px-[6px] py-[4px] transition-all"
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Per-User Flag Assignment */}
        <div className="flex flex-col gap-[20px]">
          <h2 className="font-mono text-[14px] text-[var(--t1)] font-bold flex items-center gap-[6px]">
            <span className="text-[var(--accent)]">●</span> USER_FLAGS
          </h2>

          {/* USER SEARCH */}
          <div className="border border-[var(--border-m)] rounded-lg p-[20px] bg-[var(--bg-card)]">
            <h3 className="font-mono text-[12px] text-[var(--t2)] font-bold mb-[16px] flex items-center gap-[6px]">
              <span className="text-[var(--accent)]">●</span> SEARCH_USER
            </h3>
            <input
              type="text"
              placeholder="Search by username or email..."
              value={searchQuery}
              onChange={(e) => handleSearchUsers(e.target.value)}
              className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded px-[12px] py-[8px] font-mono text-[11px] text-[var(--t1)] focus:border-[var(--accent)] outline-none mb-[12px]"
            />
            {isSearching && (
              <div className="text-center font-mono text-[10px] text-[var(--t3)]">Searching...</div>
            )}
            {searchResults.length > 0 && (
              <div className="flex flex-col gap-[8px] max-h-[200px] overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => selectUser(user)}
                    className={`text-left p-[10px] rounded font-mono text-[11px] transition-colors ${
                      selectedUser?.id === user.id
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-el)] text-[var(--t1)] hover:bg-[rgba(255,255,255,0.1)]'
                    }`}
                  >
                    <div className="font-bold">{user.displayName}</div>
                    <div className="text-[10px] opacity-75">@{user.username}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* USER FLAG ASSIGNMENT */}
          {selectedUser && (
            <div className="border border-[var(--border-m)] rounded-lg p-[20px] bg-[var(--bg-card)]">
              <h3 className="font-mono text-[12px] text-[var(--t2)] font-bold mb-[16px] flex items-center gap-[6px]">
                <span className="text-[var(--accent)]">●</span> {selectedUser.displayName.toUpperCase()}_FLAGS
              </h3>
              {userFlagsLoading ? (
                <div className="text-center font-mono text-[10px] text-[var(--t3)]">Loading...</div>
              ) : (
                <div className="flex flex-col gap-[10px]">
                  {flags.map((flag) => {
                    const isAssigned = assignedFlags.has(flag.key)
                    return (
                      <div key={flag.key} className="flex items-center justify-between p-[10px] bg-[var(--bg-el)] rounded">
                        <div className="flex flex-col gap-[2px]">
                          <span className="font-mono text-[11px] text-[var(--t1)] font-bold">{flag.name}</span>
                          <span className="font-mono text-[9px] text-[var(--t3)]">{flag.key}</span>
                        </div>
                        <button
                          onClick={() => handleToggleFlagForUser(flag.key)}
                          className={`font-mono text-[10px] rounded px-[10px] py-[4px] transition-colors ${
                            isAssigned
                              ? 'bg-[var(--red)] text-white hover:bg-[rgba(239,68,68,0.8)]'
                              : 'bg-[var(--accent)] text-white hover:bg-[#3b82f6]'
                          }`}
                        >
                          {isAssigned ? 'Unassign' : 'Assign'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
