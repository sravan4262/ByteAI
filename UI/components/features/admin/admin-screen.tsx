"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Shield, Plus, Trash2, Globe, User, Search, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Lock, ShieldCheck } from 'lucide-react'
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
import {
  RoleType,
  getAllRoles,
  createRole,
  getUserRoles,
  assignRoleToUser,
  revokeRoleFromUser,
} from '@/lib/api/admin-roles'

const SYSTEM_ROLES = ['user', 'admin']

export function AdminScreen() {
  const { isAdmin, isLoaded } = useIsAdmin()
  const router = useRouter()

  // ── Feature flags state ────────────────────────────────────────────────────
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [flagsLoading, setFlagsLoading] = useState(true)
  const [showCreateFlag, setShowCreateFlag] = useState(false)
  const [flagKey, setFlagKey] = useState('')
  const [flagName, setFlagName] = useState('')
  const [flagDesc, setFlagDesc] = useState('')
  const [savingFlag, setSavingFlag] = useState(false)

  // ── Roles state ────────────────────────────────────────────────────────────
  const [roles, setRoles] = useState<RoleType[]>([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [showCreateRole, setShowCreateRole] = useState(false)
  const [roleName, setRoleName] = useState('')
  const [roleLabel, setRoleLabel] = useState('')
  const [roleDesc, setRoleDesc] = useState('')
  const [savingRole, setSavingRole] = useState(false)

  // ── User override state ────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserResponse[]>([])
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [assignedFlags, setAssignedFlags] = useState<Set<string>>(new Set())
  const [assignedRoleIds, setAssignedRoleIds] = useState<Set<string>>(new Set())
  const [userDataLoading, setUserDataLoading] = useState(false)
  const [userTab, setUserTab] = useState<'roles' | 'flags'>('roles')

  useEffect(() => {
    if (isLoaded && !isAdmin) router.replace('/feed')
  }, [isAdmin, isLoaded, router])

  useEffect(() => {
    if (!isAdmin) return
    Promise.all([
      getAllFeatureFlags().then(data => { setFlags(data); setFlagsLoading(false) }),
      getAllRoles().then(data => { setRoles(data); setRolesLoading(false) }),
    ])
  }, [isAdmin])

  // ── Flag handlers ──────────────────────────────────────────────────────────
  const handleCreateFlag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!flagKey || !flagName) { toast.error('Key and Name are required'); return }
    setSavingFlag(true)
    const newFlag = await upsertFeatureFlag({ key: flagKey, name: flagName, description: flagDesc, globalOpen: false })
    setSavingFlag(false)
    if (newFlag) {
      toast.success('Flag created')
      setFlagKey(''); setFlagName(''); setFlagDesc('')
      setShowCreateFlag(false)
      getAllFeatureFlags().then(setFlags)
    } else {
      toast.error('Failed — key must be unique')
    }
  }

  const handleToggleFlag = async (flag: FeatureFlag) => {
    const original = flag.globalOpen
    setFlags(prev => prev.map(f => f.key === flag.key ? { ...f, globalOpen: !original } : f))
    const updated = await toggleFeatureFlag(flag.key, !original)
    if (!updated) {
      toast.error(`Failed to toggle ${flag.name}`)
      setFlags(prev => prev.map(f => f.key === flag.key ? { ...f, globalOpen: original } : f))
    } else {
      toast.success(`${flag.name} ${!original ? 'enabled' : 'disabled'} globally`)
    }
  }

  const handleDeleteFlag = async (key: string) => {
    if (!window.confirm(`Delete flag '${key}'?`)) return
    const ok = await deleteFeatureFlag(key)
    if (ok) { toast.success('Flag deleted'); setFlags(prev => prev.filter(f => f.key !== key)) }
    else toast.error('Failed to delete flag')
  }

  // ── Role handlers ──────────────────────────────────────────────────────────
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleName || !roleLabel) { toast.error('Name and Label are required'); return }
    setSavingRole(true)
    const created = await createRole({ name: roleName, label: roleLabel, description: roleDesc || undefined })
    setSavingRole(false)
    if (created) {
      toast.success('Role created')
      setRoleName(''); setRoleLabel(''); setRoleDesc('')
      setShowCreateRole(false)
      getAllRoles().then(setRoles)
    } else {
      toast.error('Failed — name may be reserved or already exists')
    }
  }

  // ── User search + override ─────────────────────────────────────────────────
  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) { setSearchResults([]); return }
    setIsSearching(true)
    try {
      const res = await searchUsers(query, 1, 8)
      setSearchResults(res.items || [])
    } catch { toast.error('Search failed') }
    finally { setIsSearching(false) }
  }

  const selectUser = async (user: UserResponse) => {
    setSelectedUser(user)
    setSearchResults([])
    setSearchQuery('')
    setUserDataLoading(true)
    try {
      const [userRoles, flagKeys] = await Promise.all([
        getUserRoles(user.id),
        apiFetch<{ data: string[] }>(`/api/admin/feature-flags/users/${user.id}`).then(r => r.data).catch(() => [] as string[]),
      ])
      setAssignedRoleIds(new Set(userRoles.map(r => r.id)))
      setAssignedFlags(new Set(flagKeys))
    } finally {
      setUserDataLoading(false)
    }
  }

  const handleToggleRole = async (roleId: string, roleName: string) => {
    if (!selectedUser) return
    const isAssigned = assignedRoleIds.has(roleId)
    if (!isAssigned) {
      const ok = await assignRoleToUser(selectedUser.id, roleId)
      if (ok) { setAssignedRoleIds(prev => new Set(prev).add(roleId)); toast.success(`${roleName} granted`) }
      else toast.error('Failed to assign role')
    } else {
      if (roleName === 'user') { toast.error("Cannot revoke the 'user' role"); return }
      const ok = await revokeRoleFromUser(selectedUser.id, roleId)
      if (ok) { setAssignedRoleIds(prev => { const n = new Set(prev); n.delete(roleId); return n }); toast.success(`${roleName} revoked`) }
      else toast.error('Failed to revoke role')
    }
  }

  const handleToggleFlagForUser = async (flagKey: string, flagName: string) => {
    if (!selectedUser) return
    const isAssigned = assignedFlags.has(flagKey)
    try {
      if (isAssigned) {
        await apiFetch(`/api/admin/feature-flags/${encodeURIComponent(flagKey)}/users/${selectedUser.id}`, { method: 'DELETE' })
        setAssignedFlags(prev => { const n = new Set(prev); n.delete(flagKey); return n })
        toast.success(`${flagName} revoked`)
      } else {
        await apiFetch(`/api/admin/feature-flags/${encodeURIComponent(flagKey)}/users/${selectedUser.id}`, { method: 'POST' })
        setAssignedFlags(prev => new Set(prev).add(flagKey))
        toast.success(`${flagName} granted`)
      }
    } catch { toast.error('Failed to update flag') }
  }

  if (!isLoaded || flagsLoading || rolesLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-5 gap-3">
        <div className="w-7 h-7 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-[10px] text-[var(--t3)] tracking-[0.08em] animate-pulse">LOADING ADMIN DATA...</span>
      </div>
    )
  }

  if (!isAdmin) return null

  const enabledCount = flags.filter(f => f.globalOpen).length

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
      <div className="max-w-6xl mx-auto p-5 lg:p-8 flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.3)] flex items-center justify-center">
                <Shield size={16} className="text-[var(--accent)]" />
              </div>
              <h1 className="font-mono text-lg font-bold tracking-[0.06em] text-[var(--t1)]">SYSTEM_ADMIN</h1>
            </div>
            <p className="font-mono text-xs text-[var(--t2)] tracking-[0.06em] ml-[42px]">
              Feature flags · RBAC roles · User overrides
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-[rgba(16,217,160,0.08)] border border-[rgba(16,217,160,0.2)]">
              <span className="font-mono text-[10px] text-[var(--green)] tracking-[0.08em] font-bold">{enabledCount} FLAGS ON</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.2)]">
              <span className="font-mono text-[10px] text-[var(--purple)] tracking-[0.08em] font-bold">{roles.length} ROLES</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Col 1: Global Feature Flags ────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe size={13} className="text-[var(--accent)]" />
                <h2 className="font-mono text-[11px] font-bold tracking-[0.1em] text-[var(--t1)]">FEATURE FLAGS</h2>
                <span className="font-mono text-[9px] text-[var(--t3)] bg-[var(--bg-el)] border border-[var(--border-m)] rounded-full px-2 py-px">{flags.length}</span>
              </div>
              <button
                onClick={() => setShowCreateFlag(v => !v)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono text-[9px] font-bold border transition-all ${
                  showCreateFlag ? 'text-[var(--t1)] border-[var(--accent)] bg-[rgba(59,130,246,0.08)]' : 'text-[var(--accent)] border-[var(--accent)] bg-[rgba(59,130,246,0.05)] hover:bg-[rgba(59,130,246,0.1)]'
                }`}
              >
                <Plus size={9} /> NEW {showCreateFlag ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
              </button>
            </div>

            {showCreateFlag && (
              <div className="border border-[rgba(59,130,246,0.3)] rounded-xl p-4 bg-[rgba(59,130,246,0.04)] flex flex-col gap-3">
                <div className="font-mono text-[9px] text-[var(--accent)] tracking-[0.12em] font-bold">// NEW FLAG</div>
                <form onSubmit={handleCreateFlag} className="flex flex-col gap-2.5">
                  <div>
                    <label className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em] mb-1 block">KEY *</label>
                    <input type="text" placeholder="e.g. new-feed-v2" value={flagKey}
                      onChange={e => setFlagKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg px-3 py-2 font-mono text-[10px] text-[var(--t1)] focus:border-[var(--accent)] outline-none transition-all placeholder:text-[var(--t3)]" />
                    <p className="font-mono text-[8px] text-[var(--t3)] mt-0.5">Lowercase, hyphens only. Permanent.</p>
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em] mb-1 block">DISPLAY NAME *</label>
                    <input type="text" placeholder="e.g. New Feed Algorithm" value={flagName}
                      onChange={e => setFlagName(e.target.value)}
                      className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg px-3 py-2 font-mono text-[10px] text-[var(--t1)] focus:border-[var(--accent)] outline-none transition-all placeholder:text-[var(--t3)]" />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em] mb-1 block">DESCRIPTION</label>
                    <input type="text" placeholder="What does this flag do?" value={flagDesc}
                      onChange={e => setFlagDesc(e.target.value)}
                      className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg px-3 py-2 font-mono text-[10px] text-[var(--t1)] focus:border-[var(--accent)] outline-none transition-all placeholder:text-[var(--t3)]" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setShowCreateFlag(false)}
                      className="flex-1 py-2 border border-[var(--border-m)] rounded-lg font-mono text-[9px] text-[var(--t2)] hover:border-[var(--border-h)] transition-all">
                      CANCEL
                    </button>
                    <button type="submit" disabled={savingFlag || !flagKey || !flagName}
                      className="flex-1 py-2 bg-[var(--accent)] rounded-lg font-mono text-[9px] font-bold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      {savingFlag ? 'CREATING...' : 'CREATE →'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {flags.length === 0 ? (
                <div className="border border-dashed border-[var(--border-m)] rounded-xl p-8 text-center">
                  <p className="font-mono text-[10px] text-[var(--t3)]">NO FLAGS YET</p>
                </div>
              ) : flags.map(flag => (
                <div key={flag.key} className={`rounded-xl border p-3.5 transition-all ${flag.globalOpen ? 'border-[rgba(16,217,160,0.25)] bg-[rgba(16,217,160,0.04)]' : 'border-[var(--border-m)] bg-[var(--bg-card)]'}`}>
                  <div className="flex items-start gap-2.5">
                    <button onClick={() => handleToggleFlag(flag)} className="mt-0.5 flex-shrink-0 hover:opacity-80 transition-all" title={flag.globalOpen ? 'Disable globally' : 'Enable globally'}>
                      {flag.globalOpen
                        ? <ToggleRight size={20} className="text-[var(--green)]" />
                        : <ToggleLeft size={20} className="text-[var(--border-m)]" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-[var(--t1)]">{flag.name}</span>
                        <span className={`font-mono text-[7px] px-1.5 py-px rounded border ${flag.globalOpen ? 'text-[var(--green)] bg-[rgba(16,217,160,0.08)] border-[rgba(16,217,160,0.25)]' : 'text-[var(--t3)] bg-[var(--bg-el)] border-[var(--border-m)]'}`}>
                          {flag.globalOpen ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <code className="font-mono text-[10px] text-[var(--t2)]">{flag.key}</code>
                      {flag.description && <p className="font-mono text-xs text-[var(--t1)] mt-0.5 leading-relaxed">{flag.description}</p>}
                    </div>
                    <button onClick={() => handleDeleteFlag(flag.key)} className="flex-shrink-0 p-1 rounded text-[var(--t3)] hover:text-[var(--red)] hover:bg-[rgba(244,63,94,0.08)] transition-all" title="Delete">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Col 2: Roles ───────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={13} className="text-[var(--purple)]" />
                <h2 className="font-mono text-[11px] font-bold tracking-[0.1em] text-[var(--t1)]">ROLES</h2>
                <span className="font-mono text-[9px] text-[var(--t3)] bg-[var(--bg-el)] border border-[var(--border-m)] rounded-full px-2 py-px">{roles.length}</span>
              </div>
              <button
                onClick={() => setShowCreateRole(v => !v)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono text-[9px] font-bold border transition-all ${
                  showCreateRole ? 'text-[var(--t1)] border-[var(--purple)] bg-[rgba(167,139,250,0.08)]' : 'text-[var(--purple)] border-[rgba(167,139,250,0.4)] bg-[rgba(167,139,250,0.05)] hover:bg-[rgba(167,139,250,0.1)]'
                }`}
              >
                <Plus size={9} /> NEW {showCreateRole ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
              </button>
            </div>

            {showCreateRole && (
              <div className="border border-[rgba(167,139,250,0.3)] rounded-xl p-4 bg-[rgba(167,139,250,0.04)] flex flex-col gap-3">
                <div className="font-mono text-[9px] text-[var(--purple)] tracking-[0.12em] font-bold">// NEW ROLE</div>
                <form onSubmit={handleCreateRole} className="flex flex-col gap-2.5">
                  <div>
                    <label className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em] mb-1 block">NAME (SLUG) *</label>
                    <input type="text" placeholder="e.g. moderator" value={roleName}
                      onChange={e => setRoleName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg px-3 py-2 font-mono text-[10px] text-[var(--t1)] focus:border-[var(--purple)] outline-none transition-all placeholder:text-[var(--t3)]" />
                    <p className="font-mono text-[8px] text-[var(--t3)] mt-0.5">Lowercase, hyphens only. Cannot be <code>user</code> or <code>admin</code>.</p>
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em] mb-1 block">DISPLAY LABEL *</label>
                    <input type="text" placeholder="e.g. Content Moderator" value={roleLabel}
                      onChange={e => setRoleLabel(e.target.value)}
                      className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg px-3 py-2 font-mono text-[10px] text-[var(--t1)] focus:border-[var(--purple)] outline-none transition-all placeholder:text-[var(--t3)]" />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em] mb-1 block">DESCRIPTION</label>
                    <input type="text" placeholder="What can this role do?" value={roleDesc}
                      onChange={e => setRoleDesc(e.target.value)}
                      className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg px-3 py-2 font-mono text-[10px] text-[var(--t1)] focus:border-[var(--purple)] outline-none transition-all placeholder:text-[var(--t3)]" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setShowCreateRole(false)}
                      className="flex-1 py-2 border border-[var(--border-m)] rounded-lg font-mono text-[9px] text-[var(--t2)] hover:border-[var(--border-h)] transition-all">
                      CANCEL
                    </button>
                    <button type="submit" disabled={savingRole || !roleName || !roleLabel}
                      className="flex-1 py-2 bg-[var(--purple)] rounded-lg font-mono text-[9px] font-bold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      {savingRole ? 'CREATING...' : 'CREATE →'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {roles.map(role => {
                const isSystem = SYSTEM_ROLES.includes(role.name)
                return (
                  <div key={role.id} className={`rounded-xl border p-3.5 ${isSystem ? 'border-[rgba(167,139,250,0.2)] bg-[rgba(167,139,250,0.04)]' : 'border-[var(--border-m)] bg-[var(--bg-card)]'}`}>
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSystem ? 'bg-[rgba(167,139,250,0.12)] border border-[rgba(167,139,250,0.2)]' : 'bg-[var(--bg-el)] border border-[var(--border-m)]'}`}>
                        {isSystem ? <Lock size={11} className="text-[var(--purple)]" /> : <ShieldCheck size={11} className="text-[var(--t3)]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-[var(--t1)]">{role.label}</span>
                          {isSystem && (
                            <span className="font-mono text-[7px] text-[var(--purple)] bg-[rgba(167,139,250,0.1)] border border-[rgba(167,139,250,0.2)] px-1.5 py-px rounded">SYSTEM</span>
                          )}
                        </div>
                        <code className="font-mono text-[10px] text-[var(--t2)]">{role.name}</code>
                        {role.description && <p className="font-mono text-xs text-[var(--t1)] mt-0.5 leading-relaxed">{role.description}</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Col 3: User Overrides ──────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <User size={13} className="text-[var(--cyan,#06b6d4)]" />
              <h2 className="font-mono text-[11px] font-bold tracking-[0.1em] text-[var(--t1)]">USER OVERRIDES</h2>
            </div>
            <p className="font-mono text-xs text-[var(--t2)] -mt-2 leading-relaxed">
              Assign roles and grant individual flags to a specific user.
            </p>

            {/* Search */}
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t3)]" />
              <input type="text" placeholder="Search by username..." value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg pl-8 pr-4 py-2.5 font-mono text-[10px] text-[var(--t1)] focus:border-[var(--accent)] outline-none transition-all placeholder:text-[var(--t3)]" />
            </div>

            {isSearching && <p className="font-mono text-[9px] text-[var(--t3)] text-center animate-pulse">SEARCHING...</p>}

            {searchResults.length > 0 && (
              <div className="border border-[var(--border-m)] rounded-xl overflow-hidden bg-[var(--bg-card)]">
                {searchResults.map((user, i) => (
                  <button key={user.id} onClick={() => selectUser(user)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all hover:bg-[rgba(255,255,255,0.04)] ${i !== searchResults.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
                    <div className="w-7 h-7 rounded-full bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] flex items-center justify-center font-mono text-[10px] text-[var(--accent)] font-bold flex-shrink-0">
                      {(user.displayName?.[0] ?? user.username[0]).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-mono text-[10px] font-bold text-[var(--t1)]">{user.displayName}</div>
                      <div className="font-mono text-[10px] text-[var(--t2)]">@{user.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedUser ? (
              <div className="border border-[var(--border-m)] rounded-xl overflow-hidden bg-[var(--bg-card)]">
                {/* User header */}
                <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-el)]">
                  <div>
                    <div className="font-mono text-[11px] font-bold text-[var(--t1)]">{selectedUser.displayName}</div>
                    <div className="font-mono text-[10px] text-[var(--t2)]">@{selectedUser.username}</div>
                  </div>
                  <button onClick={() => { setSelectedUser(null); setAssignedRoleIds(new Set()); setAssignedFlags(new Set()) }}
                    className="font-mono text-[9px] text-[var(--t3)] hover:text-[var(--t1)] transition-all px-2 py-1 rounded border border-transparent hover:border-[var(--border-m)]">
                    CLEAR
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[var(--border)]">
                  {(['roles', 'flags'] as const).map(tab => (
                    <button key={tab} onClick={() => setUserTab(tab)}
                      className={`flex-1 py-2.5 font-mono text-[9px] font-bold tracking-[0.08em] transition-all ${
                        userTab === tab
                          ? 'text-[var(--t1)] border-b-2 border-[var(--accent)] -mb-px'
                          : 'text-[var(--t2)] hover:text-[var(--t1)]'
                      }`}>
                      {tab === 'roles' ? `ROLES (${assignedRoleIds.size})` : `FLAGS (${assignedFlags.size})`}
                    </button>
                  ))}
                </div>

                {userDataLoading ? (
                  <div className="py-8 text-center font-mono text-[9px] text-[var(--t3)] animate-pulse">LOADING...</div>
                ) : userTab === 'roles' ? (
                  <div className="divide-y divide-[var(--border)]">
                    {roles.map(role => {
                      const isAssigned = assignedRoleIds.has(role.id)
                      const isBaseRole = role.name === 'user'
                      return (
                        <div key={role.id} className="px-4 py-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-bold text-[var(--t1)]">{role.label}</span>
                              {isAssigned && <span className="font-mono text-[7px] text-[var(--green)] border border-[rgba(16,217,160,0.3)] px-1 rounded">ACTIVE</span>}
                              {isBaseRole && <span className="font-mono text-[7px] text-[var(--t3)] border border-[var(--border-m)] px-1 rounded">BASE</span>}
                            </div>
                            <code className="font-mono text-[10px] text-[var(--t2)]">{role.name}</code>
                          </div>
                          {isBaseRole ? (
                            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border-m)] text-[var(--t3)]">
                              <Lock size={9} />
                              <span className="font-mono text-[8px]">LOCKED</span>
                            </div>
                          ) : (
                            <button onClick={() => handleToggleRole(role.id, role.label)}
                              className={`font-mono text-[9px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                                isAssigned
                                  ? 'text-[var(--red)] border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.06)] hover:bg-[rgba(244,63,94,0.12)]'
                                  : 'text-[var(--purple)] border-[rgba(167,139,250,0.3)] bg-[rgba(167,139,250,0.06)] hover:bg-[rgba(167,139,250,0.12)]'
                              }`}>
                              {isAssigned ? 'REVOKE' : 'GRANT'}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {flags.map(flag => {
                      const isAssigned = assignedFlags.has(flag.key)
                      return (
                        <div key={flag.key} className="px-4 py-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-bold text-[var(--t1)]">{flag.name}</span>
                              {flag.globalOpen && <span className="font-mono text-[7px] text-[var(--green)] border border-[rgba(16,217,160,0.3)] px-1 rounded">GLOBAL ON</span>}
                            </div>
                            <code className="font-mono text-[10px] text-[var(--t2)]">{flag.key}</code>
                          </div>
                          <button onClick={() => handleToggleFlagForUser(flag.key, flag.name)}
                            className={`font-mono text-[9px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                              isAssigned
                                ? 'text-[var(--red)] border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.06)] hover:bg-[rgba(244,63,94,0.12)]'
                                : 'text-[var(--accent)] border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.06)] hover:bg-[rgba(59,130,246,0.12)]'
                            }`}>
                            {isAssigned ? 'REVOKE' : 'GRANT'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-dashed border-[var(--border-m)] rounded-xl p-10 text-center">
                <User size={20} className="text-[var(--t3)] mx-auto mb-2 opacity-40" />
                <div className="font-mono text-xs font-bold text-[var(--t2)]">NO USER SELECTED</div>
                <div className="font-mono text-[10px] text-[var(--t2)] mt-1">Search above to manage a user&apos;s roles and flags</div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
