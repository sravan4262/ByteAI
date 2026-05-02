"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Shield, Plus, Globe, User, Search, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Lock, ShieldCheck, MessageSquare, CheckCheck, Activity, AlertTriangle, Ban, X } from 'lucide-react'
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
import {
  AdminFeedbackResponse,
  getAllFeedback,
  updateFeedbackStatus,
} from '@/lib/api/support'
import {
  FlaggedUser,
  BannedUser,
  FlaggedContent,
  UserBanHistory,
  getFlaggedUsers,
  getBannedUsers,
  banUser,
  unbanUser,
  getFlaggedContent,
  getUserFlags,
  updateFlagStatus,
  getUserBanHistory,
} from '@/lib/api/admin-moderation'
import { UserActivityPanels } from './user-activity-panels'

const SYSTEM_ROLES = ['user', 'admin']
type AdminTab = 'system' | 'feedback' | 'activity' | 'moderation'

export function AdminScreen() {
  const { isAdmin, isLoaded } = useIsAdmin()
  const router = useRouter()
  const [adminTab, setAdminTab] = useState<AdminTab>('system')

  // ── Feature flags state ────────────────────────────────────────────────────
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [flagsLoading, setFlagsLoading] = useState(true)
  const [showCreateFlag, setShowCreateFlag] = useState(false)
  const [flagKey, setFlagKey] = useState('')
  const [flagName, setFlagName] = useState('')
  const [flagDesc, setFlagDesc] = useState('')
  const [savingFlag, setSavingFlag] = useState(false)
  const [confirmDeleteFlag, setConfirmDeleteFlag] = useState<string | null>(null)

  // ── Roles state ────────────────────────────────────────────────────────────
  const [roles, setRoles] = useState<RoleType[]>([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [showCreateRole, setShowCreateRole] = useState(false)
  const [roleName, setRoleName] = useState('')
  const [roleLabel, setRoleLabel] = useState('')
  const [roleDesc, setRoleDesc] = useState('')
  const [savingRole, setSavingRole] = useState(false)

  // ── Feedback state ─────────────────────────────────────────────────────────
  const [feedbackItems, setFeedbackItems]       = useState<AdminFeedbackResponse[]>([])
  const [feedbackTotal, setFeedbackTotal]       = useState(0)
  const [feedbackPage, setFeedbackPage]         = useState(1)
  const [feedbackLoading, setFeedbackLoading]   = useState(false)
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('')
  const [noteModal, setNoteModal]               = useState<AdminFeedbackResponse | null>(null)
  const [noteText, setNoteText]                 = useState('')
  const [savingNote, setSavingNote]             = useState(false)
  const [feedbackTypeTabs, setFeedbackTypeTabs] = useState<Record<string, 'good' | 'bad' | 'idea'>>({ open: 'bad', reviewed: 'good', closed: 'good' })
  const [collapsedFeedbackSections, setCollapsedFeedbackSections] = useState<Record<string, boolean>>({})

  // ── Moderation state ──────────────────────────────────────────────────────
  const [flaggedUsers, setFlaggedUsers]     = useState<FlaggedUser[]>([])
  const [bannedUsers, setBannedUsers]       = useState<BannedUser[]>([])
  const [moderationLoading, setModerationLoading] = useState(false)
  const [banModal, setBanModal]             = useState<FlaggedUser | null>(null)
  const [banReason, setBanReason]           = useState('')
  const [banExpiry, setBanExpiry]           = useState('')
  const [savingBan, setSavingBan]           = useState(false)

  // ── Flag-queue state ───────────────────────────────────────────────────────
  const [flagQueue, setFlagQueue]                 = useState<FlaggedContent[]>([])
  const [flagQueueLoading, setFlagQueueLoading]   = useState(false)
  const [flagStatusFilter, setFlagStatusFilter]   = useState<'open' | 'reviewing' | 'removed' | 'dismissed' | ''>('open')
  const [flagSeverityFilter, setFlagSeverityFilter] = useState<'low' | 'medium' | 'high' | ''>('')
  const [flagTypeFilter, setFlagTypeFilter]       = useState<string>('')

  // ── Per-user drilldown ─────────────────────────────────────────────────────
  const [drilldownUser, setDrilldownUser]         = useState<FlaggedUser | null>(null)
  const [userFlags, setUserFlags]                 = useState<FlaggedContent[]>([])
  const [userBanHistory, setUserBanHistory]       = useState<UserBanHistory[]>([])
  const [drilldownLoading, setDrilldownLoading]   = useState(false)

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

  // ── Feedback loader ────────────────────────────────────────────────────────
  const loadFeedback = useCallback(async (page = 1) => {
    setFeedbackLoading(true)
    const data = await getAllFeedback({
      status: feedbackStatusFilter || undefined,
      page,
      pageSize: 50,
    })
    setFeedbackItems(data.items)
    setFeedbackTotal(data.total)
    setFeedbackPage(page)
    setFeedbackLoading(false)
  }, [feedbackStatusFilter])

  useEffect(() => {
    if (!isAdmin || adminTab !== 'feedback') return
    loadFeedback(1)
  }, [isAdmin, adminTab, loadFeedback])

  useEffect(() => {
    if (!isAdmin || adminTab !== 'moderation') return
    setModerationLoading(true)
    Promise.all([getFlaggedUsers(), getBannedUsers()])
      .then(([flagged, banned]) => { setFlaggedUsers(flagged); setBannedUsers(banned) })
      .finally(() => setModerationLoading(false))
  }, [isAdmin, adminTab])

  // ── Flag-queue loader ──────────────────────────────────────────────────────
  const loadFlagQueue = useCallback(async () => {
    setFlagQueueLoading(true)
    const data = await getFlaggedContent({
      status:      flagStatusFilter || undefined,
      severity:    flagSeverityFilter || undefined,
      contentType: flagTypeFilter || undefined,
      pageSize:    50,
    })
    setFlagQueue(data.items)
    setFlagQueueLoading(false)
  }, [flagStatusFilter, flagSeverityFilter, flagTypeFilter])

  useEffect(() => {
    if (!isAdmin || adminTab !== 'moderation') return
    loadFlagQueue()
  }, [isAdmin, adminTab, loadFlagQueue])

  const handleMarkReviewed = async (item: AdminFeedbackResponse) => {
    const updated = await updateFeedbackStatus(item.id, 'reviewed')
    if (updated) {
      toast.success('Marked as reviewed — user notified')
      setFeedbackItems(prev => prev.map(f => f.id === item.id ? updated : f))
    } else {
      toast.error('Failed to update')
    }
  }

  const handleCloseWithNote = async () => {
    if (!noteModal) return
    setSavingNote(true)
    const updated = await updateFeedbackStatus(noteModal.id, 'closed', noteText || undefined)
    setSavingNote(false)
    if (updated) {
      toast.success('Feedback closed — user notified')
      setFeedbackItems(prev => prev.map(f => f.id === noteModal.id ? updated : f))
      setNoteModal(null)
      setNoteText('')
    } else {
      toast.error('Failed to update')
    }
  }

  // ── Moderation handlers ────────────────────────────────────────────────────
  const handleBanUser = async () => {
    if (!banModal || !banReason.trim()) { toast.error('Reason is required'); return }
    setSavingBan(true)
    // The <input type="datetime-local"> control returns a naive local string
    // (e.g. "2026-08-15T18:00"). Convert to UTC-ISO so the server's UTC
    // comparisons are unambiguous regardless of the admin's timezone.
    const expiresAtUtc = banExpiry ? new Date(banExpiry).toISOString() : null
    const result = await banUser({
      userId: banModal.userId,
      reason: banReason,
      expiresAt: expiresAtUtc,
    })
    setSavingBan(false)
    if (result) {
      toast.success(`${banModal.displayName ?? banModal.username} has been banned`)
      setFlaggedUsers(prev => prev.map(u => u.userId === banModal.userId ? { ...u, isBanned: true } : u))
      setBanModal(null)
      setBanReason('')
      setBanExpiry('')
      getBannedUsers().then(setBannedUsers)
    } else {
      toast.error('Failed to ban user')
    }
  }

  const handleUnbanUser = async (userId: string, username: string) => {
    const ok = await unbanUser(userId)
    if (ok) {
      toast.success(`${username} has been unbanned`)
      setBannedUsers(prev => prev.filter(b => b.userId !== userId))
      setFlaggedUsers(prev => prev.map(u => u.userId === userId ? { ...u, isBanned: false } : u))
    } else {
      toast.error('Failed to unban user')
    }
  }

  // ── Drilldown + flag triage handlers ───────────────────────────────────────
  const openDrilldown = async (user: FlaggedUser) => {
    setDrilldownUser(user)
    setDrilldownLoading(true)
    const [flags, history] = await Promise.all([
      getUserFlags(user.userId),
      getUserBanHistory(user.userId),
    ])
    setUserFlags(flags)
    setUserBanHistory(history)
    setDrilldownLoading(false)
  }

  const handleUpdateFlagStatus = async (
    flag: FlaggedContent,
    status: 'reviewing' | 'removed' | 'dismissed',
  ) => {
    const updated = await updateFlagStatus(flag.id, status)
    if (!updated) { toast.error('Failed to update flag'); return }
    toast.success(`Flag marked ${status}`)
    // Update both lists wherever this flag appears
    setFlagQueue(prev => prev.map(f => f.id === updated.id ? updated : f))
    setUserFlags(prev => prev.map(f => f.id === updated.id ? updated : f))
  }

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
        <span className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em] animate-pulse">LOADING ADMIN DATA...</span>
      </div>
    )
  }

  if (!isAdmin) return null

  const enabledCount = flags.filter(f => f.globalOpen).length
  const openCount    = feedbackItems.filter(f => f.status === 'open').length

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
      <div className="max-w-6xl mx-auto p-5 lg:p-8 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.3)] flex items-center justify-center">
                <Shield size={16} className="text-[var(--accent)]" />
              </div>
              <h1 className="font-mono text-lg font-bold tracking-[0.06em] text-[var(--t1)]">SYSTEM_ADMIN</h1>
            </div>
            <p className="text-xs text-[var(--t2)] tracking-[0.06em] ml-[42px]">
              Feature flags · RBAC roles · User overrides · Feedback
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

        {/* Top-level tabs */}
        <div className="flex flex-wrap gap-2">
          {([['system', Shield, 'SYSTEM_CONFIG'], ['feedback', MessageSquare, 'FEEDBACK'], ['activity', Activity, 'USER ACTIVITY'], ['moderation', AlertTriangle, 'MODERATION']] as const).map(([tab, Icon, label]) => (
            <button key={tab} onClick={() => setAdminTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-[10px] font-bold tracking-[0.08em] border transition-all ${
                adminTab === tab
                  ? 'text-[var(--accent)] border-[var(--accent)] bg-[var(--accent-d)] shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                  : 'text-[var(--t1)] border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]'
              }`}>
              <Icon size={11} />
              {label}
            </button>
          ))}
        </div>

        {adminTab === 'system' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Col 1: Global Feature Flags ────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe size={13} className="text-[var(--accent)]" />
                <h2 className="font-mono text-[11px] font-bold tracking-[0.1em] text-[var(--t1)]">FEATURE FLAGS</h2>
                <span className="font-mono text-[10px] text-[var(--t2)] bg-[var(--bg-el)] border border-[var(--border-h)] rounded-full px-2 py-px">{flags.length}</span>
              </div>
              <button
                onClick={() => setShowCreateFlag(v => !v)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono text-[10px] font-bold border transition-all ${
                  showCreateFlag ? 'text-[var(--t1)] border-[var(--accent)] bg-[rgba(59,130,246,0.08)]' : 'text-[var(--accent)] border-[var(--accent)] bg-[rgba(59,130,246,0.05)] hover:bg-[rgba(59,130,246,0.1)]'
                }`}
              >
                <Plus size={10} /> NEW {showCreateFlag ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
            </div>

            {showCreateFlag && (
              <div className="border border-[rgba(59,130,246,0.3)] rounded-xl p-4 bg-[rgba(59,130,246,0.04)] flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">NEW FLAG</span>
                </div>
                <form onSubmit={handleCreateFlag} className="flex flex-col gap-2.5">
                  <div>
                    <label className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em] mb-1 block">KEY *</label>
                    <input type="text" placeholder="e.g. new-feed-v2" value={flagKey}
                      onChange={e => setFlagKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="w-full bg-[var(--bg-el)] border border-[var(--border-h)] rounded-lg px-3 py-2 font-mono text-[10px] text-[var(--t1)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)] outline-none transition-all placeholder:text-[var(--t2)]" />
                    <p className="text-[10px] text-[var(--t2)] mt-0.5">Lowercase, hyphens only. Permanent.</p>
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em] mb-1 block">DISPLAY NAME *</label>
                    <input type="text" placeholder="e.g. New Feed Algorithm" value={flagName}
                      onChange={e => setFlagName(e.target.value)}
                      className="w-full bg-[var(--bg-el)] border border-[var(--border-h)] rounded-lg px-3 py-2 font-mono text-[10px] text-[var(--t1)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)] outline-none transition-all placeholder:text-[var(--t2)]" />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em] mb-1 block">DESCRIPTION</label>
                    <input type="text" placeholder="What does this flag do?" value={flagDesc}
                      onChange={e => setFlagDesc(e.target.value)}
                      className="w-full bg-[var(--bg-el)] border border-[var(--border-h)] rounded-lg px-3 py-2 font-mono text-[10px] text-[var(--t1)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)] outline-none transition-all placeholder:text-[var(--t2)]" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setShowCreateFlag(false)}
                      className="flex-1 py-2 border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-lg font-mono text-[10px] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] transition-all">
                      CANCEL
                    </button>
                    <button type="submit" disabled={savingFlag || !flagKey || !flagName}
                      className="flex-1 py-2 bg-gradient-to-br from-[var(--accent)] to-[#1d4ed8] rounded-lg font-mono text-[10px] font-bold text-white shadow-[0_4px_24px_rgba(59,130,246,0.4)] hover:shadow-[0_8px_36px_rgba(59,130,246,0.5)] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      {savingFlag ? 'CREATING...' : 'CREATE →'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {flags.length === 0 ? (
                <div className="border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-xl px-5 py-8 text-center flex flex-col items-center gap-2">
                  <Globe size={20} className="text-[var(--accent)] opacity-50" />
                  <p className="font-mono text-xs font-bold text-[var(--t1)]">NO FLAGS YET</p>
                  <p className="text-xs text-[var(--t2)]">Create your first feature flag above.</p>
                </div>
              ) : flags.map(flag => (
                <div key={flag.key} className={`rounded-xl border p-3.5 transition-all ${flag.globalOpen ? 'border-[rgba(16,217,160,0.25)] bg-[rgba(16,217,160,0.04)]' : 'border-[var(--border-h)] bg-[var(--bg-card)]'}`}>
                  <div className="flex items-start gap-2.5">
                    <button onClick={() => handleToggleFlag(flag)} className="mt-0.5 flex-shrink-0 hover:opacity-80 transition-all" title={flag.globalOpen ? 'Disable globally' : 'Enable globally'}>
                      {flag.globalOpen
                        ? <ToggleRight size={20} className="text-[var(--green)]" />
                        : <ToggleLeft size={20} className="text-[var(--border-m)]" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-[var(--t1)]">{flag.name}</span>
                        <span className={`font-mono text-[10px] px-1.5 py-px rounded border ${flag.globalOpen ? 'text-[var(--green)] bg-[rgba(16,217,160,0.08)] border-[rgba(16,217,160,0.25)]' : 'text-[var(--t2)] bg-[var(--bg-el)] border-[var(--border-h)]'}`}>
                          {flag.globalOpen ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <code className="font-mono text-[10px] text-[var(--t2)]">{flag.key}</code>
                      {flag.description && <p className="text-xs text-[var(--t2)] mt-0.5 leading-relaxed">{flag.description}</p>}
                    </div>
                    {confirmDeleteFlag === flag.key ? (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.05em]">DELETE?</span>
                        <button onClick={() => { handleDeleteFlag(flag.key); setConfirmDeleteFlag(null) }}
                          className="font-mono text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[rgba(244,63,94,0.4)] bg-[rgba(244,63,94,0.08)] text-[var(--red)] hover:border-[rgba(244,63,94,0.7)] hover:bg-[rgba(244,63,94,0.15)] transition-all">YES</button>
                        <button onClick={() => setConfirmDeleteFlag(null)}
                          className="font-mono text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] transition-all">NO</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteFlag(flag.key)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(244,63,94,0.4)] hover:bg-[rgba(244,63,94,0.08)] hover:text-[var(--red)] transition-all">rm</button>
                    )}
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
                <span className="font-mono text-[10px] text-[var(--t2)] bg-[var(--bg-el)] border border-[var(--border-h)] rounded-full px-2 py-px">{roles.length}</span>
              </div>
              <button
                onClick={() => setShowCreateRole(v => !v)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono text-[10px] font-bold border transition-all ${
                  showCreateRole ? 'text-[var(--t1)] border-[var(--purple)] bg-[rgba(167,139,250,0.08)]' : 'text-[var(--purple)] border-[rgba(167,139,250,0.4)] bg-[rgba(167,139,250,0.05)] hover:bg-[rgba(167,139,250,0.1)]'
                }`}
              >
                <Plus size={10} /> NEW {showCreateRole ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
            </div>

            {showCreateRole && (
              <div className="border border-[rgba(167,139,250,0.3)] rounded-xl p-4 bg-[rgba(167,139,250,0.04)] flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-[3px] h-3.5 rounded-full bg-[var(--purple)] flex-shrink-0" />
                  <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">NEW ROLE</span>
                </div>
                <form onSubmit={handleCreateRole} className="flex flex-col gap-2.5">
                  <div>
                    <label className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em] mb-1 block">NAME (SLUG) *</label>
                    <input type="text" placeholder="e.g. moderator" value={roleName}
                      onChange={e => setRoleName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="w-full bg-[var(--bg-el)] border border-[var(--border-h)] rounded-lg px-3 py-2 font-mono text-[10px] text-[var(--t1)] focus:border-[var(--purple)] focus:shadow-[0_0_0_3px_rgba(167,139,250,0.14)] outline-none transition-all placeholder:text-[var(--t2)]" />
                    <p className="text-[10px] text-[var(--t2)] mt-0.5">Lowercase, hyphens only. Cannot be <code>user</code> or <code>admin</code>.</p>
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em] mb-1 block">DISPLAY LABEL *</label>
                    <input type="text" placeholder="e.g. Content Moderator" value={roleLabel}
                      onChange={e => setRoleLabel(e.target.value)}
                      className="w-full bg-[var(--bg-el)] border border-[var(--border-h)] rounded-lg px-3 py-2 font-mono text-[10px] text-[var(--t1)] focus:border-[var(--purple)] focus:shadow-[0_0_0_3px_rgba(167,139,250,0.14)] outline-none transition-all placeholder:text-[var(--t2)]" />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em] mb-1 block">DESCRIPTION</label>
                    <input type="text" placeholder="What can this role do?" value={roleDesc}
                      onChange={e => setRoleDesc(e.target.value)}
                      className="w-full bg-[var(--bg-el)] border border-[var(--border-h)] rounded-lg px-3 py-2 font-mono text-[10px] text-[var(--t1)] focus:border-[var(--purple)] focus:shadow-[0_0_0_3px_rgba(167,139,250,0.14)] outline-none transition-all placeholder:text-[var(--t2)]" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setShowCreateRole(false)}
                      className="flex-1 py-2 border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-lg font-mono text-[10px] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] transition-all">
                      CANCEL
                    </button>
                    <button type="submit" disabled={savingRole || !roleName || !roleLabel}
                      className="flex-1 py-2 bg-gradient-to-br from-[var(--purple)] to-[#5b21b6] rounded-lg font-mono text-[10px] font-bold text-white shadow-[0_4px_24px_rgba(167,139,250,0.4)] hover:shadow-[0_8px_36px_rgba(167,139,250,0.5)] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
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
                  <div key={role.id} className={`rounded-xl border p-3.5 ${isSystem ? 'border-[rgba(167,139,250,0.2)] bg-[rgba(167,139,250,0.04)]' : 'border-[var(--border-h)] bg-[var(--bg-card)]'}`}>
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSystem ? 'bg-[rgba(167,139,250,0.12)] border border-[rgba(167,139,250,0.2)]' : 'bg-[var(--bg-el)] border border-[var(--border-h)]'}`}>
                        {isSystem ? <Lock size={11} className="text-[var(--purple)]" /> : <ShieldCheck size={11} className="text-[var(--t2)]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-[var(--t1)]">{role.label}</span>
                          {isSystem && (
                            <span className="font-mono text-[10px] text-[var(--purple)] bg-[rgba(167,139,250,0.1)] border border-[rgba(167,139,250,0.2)] px-1.5 py-px rounded">SYSTEM</span>
                          )}
                        </div>
                        <code className="font-mono text-[10px] text-[var(--t2)]">{role.name}</code>
                        {role.description && <p className="text-xs text-[var(--t2)] mt-0.5 leading-relaxed">{role.description}</p>}
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
              <User size={13} className="text-[var(--accent)]" />
              <h2 className="font-mono text-[11px] font-bold tracking-[0.1em] text-[var(--t1)]">USER OVERRIDES</h2>
            </div>
            <p className="text-xs text-[var(--t2)] -mt-2 leading-relaxed">
              Assign roles and grant individual flags to a specific user.
            </p>

            {/* Search */}
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t2)]" />
              <input type="text" placeholder="Search by username..." value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                className="w-full bg-[var(--bg-el)] border border-[var(--border-h)] rounded-lg pl-8 pr-4 py-2.5 font-mono text-[10px] text-[var(--t1)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)] outline-none transition-all placeholder:text-[var(--t2)]" />
            </div>

            {isSearching && <p className="font-mono text-[10px] text-[var(--t2)] text-center animate-pulse">SEARCHING...</p>}

            {searchResults.length > 0 && (
              <div className="border border-[var(--border-h)] rounded-xl overflow-hidden bg-[var(--bg-card)]">
                {searchResults.map((user, i) => (
                  <button key={user.id} onClick={() => selectUser(user)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all hover:bg-[rgba(255,255,255,0.04)] ${i !== searchResults.length - 1 ? 'border-b border-[var(--border-h)]' : ''}`}>
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
              <div className="border border-[var(--border-h)] rounded-xl overflow-hidden bg-[var(--bg-card)]">
                {/* User header */}
                <div className="px-4 py-3 border-b border-[var(--border-h)] flex items-center justify-between bg-[var(--bg-el)]">
                  <div>
                    <div className="font-mono text-[11px] font-bold text-[var(--t1)]">{selectedUser.displayName}</div>
                    <div className="font-mono text-[10px] text-[var(--t2)]">@{selectedUser.username}</div>
                  </div>
                  <button onClick={() => { setSelectedUser(null); setAssignedRoleIds(new Set()); setAssignedFlags(new Set()) }}
                    className="font-mono text-[10px] text-[var(--t2)] hover:text-[var(--t1)] transition-all px-2 py-1 rounded border border-transparent hover:border-[var(--border-h)]">
                    CLEAR
                  </button>
                </div>

                {/* Tabs — pill style */}
                <div className="flex gap-2 p-3 border-b border-[var(--border-h)]">
                  {(['roles', 'flags'] as const).map(tab => (
                    <button key={tab} onClick={() => setUserTab(tab)}
                      className={`flex-1 py-1.5 px-4 rounded-lg font-mono text-[10px] font-bold tracking-[0.08em] border transition-all ${
                        userTab === tab
                          ? 'text-[var(--accent)] border-[var(--accent)] bg-[var(--accent-d)] shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                          : 'text-[var(--t1)] border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]'
                      }`}>
                      {tab === 'roles' ? `ROLES (${assignedRoleIds.size})` : `FLAGS (${assignedFlags.size})`}
                    </button>
                  ))}
                </div>

                {userDataLoading ? (
                  <div className="py-8 text-center font-mono text-[10px] text-[var(--t2)] animate-pulse">LOADING...</div>
                ) : userTab === 'roles' ? (
                  <div className="divide-y divide-[var(--border-h)]">
                    {roles.map(role => {
                      const isAssigned = assignedRoleIds.has(role.id)
                      const isBaseRole = role.name === 'user'
                      return (
                        <div key={role.id} className="px-4 py-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-bold text-[var(--t1)]">{role.label}</span>
                              {isAssigned && <span className="font-mono text-[10px] text-[var(--green)] border border-[rgba(16,217,160,0.3)] px-1.5 rounded">ACTIVE</span>}
                              {isBaseRole && <span className="font-mono text-[10px] text-[var(--t2)] border border-[var(--border-h)] px-1.5 rounded">BASE</span>}
                            </div>
                            <code className="font-mono text-[10px] text-[var(--t2)]">{role.name}</code>
                          </div>
                          {isBaseRole ? (
                            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border-h)] text-[var(--t2)]">
                              <Lock size={9} />
                              <span className="font-mono text-[10px]">LOCKED</span>
                            </div>
                          ) : (
                            <button onClick={() => handleToggleRole(role.id, role.label)}
                              className={`font-mono text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
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
                  <div className="divide-y divide-[var(--border-h)]">
                    {flags.map(flag => {
                      const isAssigned = assignedFlags.has(flag.key)
                      return (
                        <div key={flag.key} className="px-4 py-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-bold text-[var(--t1)]">{flag.name}</span>
                              {flag.globalOpen && <span className="font-mono text-[10px] text-[var(--green)] border border-[rgba(16,217,160,0.3)] px-1.5 rounded">GLOBAL ON</span>}
                            </div>
                            <code className="font-mono text-[10px] text-[var(--t2)]">{flag.key}</code>
                          </div>
                          <button onClick={() => handleToggleFlagForUser(flag.key, flag.name)}
                            className={`font-mono text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
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
              <div className="border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-xl px-5 py-10 text-center flex flex-col items-center gap-2">
                <User size={20} className="text-[var(--accent)] opacity-50" />
                <p className="font-mono text-xs font-bold text-[var(--t1)]">NO USER SELECTED</p>
                <p className="text-xs text-[var(--t2)]">Search above to manage a user&apos;s roles and flags.</p>
              </div>
            )}
          </div>

        </div>}

        {/* ── Activity tab ─────────────────────────────────────────────────── */}
        {adminTab === 'activity' && <UserActivityPanels />}

        {/* ── Moderation tab ───────────────────────────────────────────────── */}
        {adminTab === 'moderation' && (
          <div className="flex flex-col gap-6">
            {moderationLoading ? (
              <div className="flex items-center justify-center py-16">
                <span className="font-mono text-xs text-[var(--t2)] tracking-[0.08em] animate-pulse">LOADING...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* At-Risk Users */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-[3px] h-4 rounded-full bg-[var(--yellow,#f59e0b)] flex-shrink-0" />
                    <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.05em]">AT-RISK USERS</span>
                    <span className="ml-auto font-mono text-[10px] text-[var(--t2)]">{flaggedUsers.length} USERS · &gt;5 FLAGS</span>
                  </div>
                  {flaggedUsers.length === 0 ? (
                    <p className="font-mono text-xs text-[var(--t2)] py-6 text-center tracking-[0.06em]">NO AT-RISK USERS</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {flaggedUsers.map(u => (
                        <div key={u.userId} className="flex items-start gap-3 p-3 rounded-xl border border-[var(--border-h)] bg-[var(--bg-el)] hover:border-[rgba(59,130,246,0.4)] transition-all cursor-pointer"
                             onClick={() => openDrilldown(u)}>
                          <div className="w-8 h-8 rounded-full bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.2)] overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {u.avatarUrl
                              ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                              : <User size={14} className="text-[var(--t2)]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-[var(--t1)] truncate">{u.displayName ?? u.username}</span>
                              <span className="font-mono text-[10px] text-[var(--t2)]">@{u.username}</span>
                              {u.isBanned && (
                                <span className="px-1.5 py-0.5 rounded font-mono text-[9px] font-bold tracking-[0.08em] bg-[rgba(239,68,68,0.12)] text-[var(--red,#ef4444)] border border-[rgba(239,68,68,0.2)]">BANNED</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="font-mono text-[10px] text-[var(--t2)]">{u.flagCount} flags</span>
                              {u.contentTypes.map(ct => (
                                <span key={ct} className="px-1.5 py-0.5 rounded font-mono text-[9px] tracking-[0.05em] bg-[rgba(59,130,246,0.08)] text-[var(--accent)] border border-[rgba(59,130,246,0.15)]">{ct}</span>
                              ))}
                            </div>
                          </div>
                          {!u.isBanned && (
                            <button onClick={(e) => { e.stopPropagation(); setBanModal(u); setBanReason(''); setBanExpiry('') }}
                              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono text-[10px] font-bold tracking-[0.06em] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.06)] text-[var(--red,#ef4444)] hover:bg-[rgba(239,68,68,0.12)] transition-all">
                              <Ban size={10} />
                              BAN
                            </button>
                          )}
                          {u.isBanned && (
                            <button onClick={(e) => { e.stopPropagation(); handleUnbanUser(u.userId, u.username) }}
                              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono text-[10px] font-bold tracking-[0.06em] border border-[rgba(16,217,160,0.3)] bg-[rgba(16,217,160,0.06)] text-[var(--green)] hover:bg-[rgba(16,217,160,0.12)] transition-all">
                              <X size={10} />
                              UNBAN
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Banned Users */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-[3px] h-4 rounded-full bg-[var(--red,#ef4444)] flex-shrink-0" />
                    <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.05em]">BANNED USERS</span>
                    <span className="ml-auto font-mono text-[10px] text-[var(--t2)]">{bannedUsers.length} ACTIVE</span>
                  </div>
                  {bannedUsers.length === 0 ? (
                    <p className="font-mono text-xs text-[var(--t2)] py-6 text-center tracking-[0.06em]">NO ACTIVE BANS</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {bannedUsers.map(b => (
                        <div key={b.userId} className="flex items-start gap-3 p-3 rounded-xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.04)]">
                          <div className="w-8 h-8 rounded-full bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {b.avatarUrl
                              ? <img src={b.avatarUrl} alt="" className="w-full h-full object-cover" />
                              : <User size={14} className="text-[var(--t2)]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-[var(--t1)] truncate">{b.displayName ?? b.username}</span>
                              <span className="font-mono text-[10px] text-[var(--t2)]">@{b.username}</span>
                            </div>
                            <p className="font-mono text-[10px] text-[var(--t2)] mt-0.5 truncate" title={b.reason}>{b.reason}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="font-mono text-[10px] text-[var(--t3)]" title={`UTC: ${new Date(b.bannedAt).toISOString()}`}>
                                {new Date(b.bannedAt).toLocaleString()}
                              </span>
                              <span className="font-mono text-[10px] text-[var(--t3)]" title={b.expiresAt ? `UTC: ${b.expiresAt}` : ''}>
                                {b.expiresAt ? `until ${new Date(b.expiresAt).toLocaleString()}` : 'permanent'}
                              </span>
                            </div>
                          </div>
                          <button onClick={() => handleUnbanUser(b.userId, b.username)}
                            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono text-[10px] font-bold tracking-[0.06em] border border-[rgba(16,217,160,0.3)] bg-[rgba(16,217,160,0.06)] text-[var(--green)] hover:bg-[rgba(16,217,160,0.12)] transition-all">
                            <X size={10} />
                            UNBAN
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Flag Queue ─────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4 mt-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-[3px] h-4 rounded-full bg-[var(--accent)] flex-shrink-0" />
                <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.05em]">FLAG QUEUE</span>

                <select value={flagStatusFilter}
                        onChange={e => setFlagStatusFilter(e.target.value as typeof flagStatusFilter)}
                        className="ml-2 bg-[var(--bg-el)] border border-[var(--border-h)] rounded-md px-2 py-1 font-mono text-[10px] text-[var(--t1)]">
                  <option value="">All statuses</option>
                  <option value="open">Open</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="removed">Removed</option>
                  <option value="dismissed">Dismissed</option>
                </select>

                <select value={flagSeverityFilter}
                        onChange={e => setFlagSeverityFilter(e.target.value as typeof flagSeverityFilter)}
                        className="bg-[var(--bg-el)] border border-[var(--border-h)] rounded-md px-2 py-1 font-mono text-[10px] text-[var(--t1)]">
                  <option value="">All severities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <select value={flagTypeFilter}
                        onChange={e => setFlagTypeFilter(e.target.value)}
                        className="bg-[var(--bg-el)] border border-[var(--border-h)] rounded-md px-2 py-1 font-mono text-[10px] text-[var(--t1)]">
                  <option value="">All types</option>
                  <option value="byte">Byte</option>
                  <option value="comment">Comment</option>
                  <option value="interview">Interview</option>
                  <option value="chat">Chat</option>
                  <option value="profile">Profile</option>
                  <option value="support">Support</option>
                </select>

                <span className="ml-auto font-mono text-[10px] text-[var(--t2)]">{flagQueue.length} ROWS</span>
              </div>

              {flagQueueLoading ? (
                <p className="font-mono text-xs text-[var(--t2)] py-6 text-center tracking-[0.06em] animate-pulse">LOADING...</p>
              ) : flagQueue.length === 0 ? (
                <p className="font-mono text-xs text-[var(--t2)] py-6 text-center tracking-[0.06em]">QUEUE EMPTY</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {flagQueue.map(f => (
                    <FlagQueueRow key={f.id} flag={f} onAction={handleUpdateFlagStatus} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Per-user drilldown modal */}
        {drilldownUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrilldownUser(null)} />
            <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl border border-[var(--border-h)] bg-[var(--bg-card)] shadow-[0_16px_64px_rgba(0,0,0,0.8)]">
              <div className="h-px bg-gradient-to-r from-[var(--accent)] via-[rgba(59,130,246,0.3)] to-transparent" />
              <div className="p-5 flex flex-col gap-5">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-[var(--accent)]" />
                  <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.05em]">USER DRILLDOWN</span>
                  <span className="ml-2 font-mono text-[10px] text-[var(--t2)]">
                    {drilldownUser.displayName ?? drilldownUser.username} · @{drilldownUser.username}
                  </span>
                  <button onClick={() => setDrilldownUser(null)} className="ml-auto text-[var(--t3)] hover:text-[var(--t1)]"><X size={14} /></button>
                </div>

                {drilldownLoading ? (
                  <p className="font-mono text-xs text-[var(--t2)] py-6 text-center animate-pulse">LOADING...</p>
                ) : (
                  <>
                    <div>
                      <span className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em]">FLAGS ({userFlags.length})</span>
                      {userFlags.length === 0 ? (
                        <p className="font-mono text-xs text-[var(--t2)] py-3">No flags for this user.</p>
                      ) : (
                        <div className="flex flex-col gap-2 mt-2">
                          {userFlags.map(f => (
                            <FlagQueueRow key={f.id} flag={f} onAction={handleUpdateFlagStatus} compact />
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em]">BAN HISTORY ({userBanHistory.length})</span>
                      {userBanHistory.length === 0 ? (
                        <p className="font-mono text-xs text-[var(--t2)] py-3">Never banned.</p>
                      ) : (
                        <div className="flex flex-col gap-2 mt-2">
                          {userBanHistory.map(h => (
                            <div key={h.id} className="p-3 rounded-lg border border-[var(--border-h)] bg-[var(--bg-el)]">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold tracking-[0.06em] border ${h.liftedAt
                                  ? 'bg-[rgba(16,217,160,0.06)] text-[var(--green)] border-[rgba(16,217,160,0.2)]'
                                  : 'bg-[rgba(239,68,68,0.1)] text-[var(--red,#ef4444)] border-[rgba(239,68,68,0.2)]'}`}>
                                  {h.liftedAt ? 'LIFTED' : 'ACTIVE'}
                                </span>
                                <span className="font-mono text-[10px] text-[var(--t3)]" title={`UTC: ${h.bannedAt}`}>
                                  {new Date(h.bannedAt).toLocaleString()}
                                </span>
                                {h.bannedByUsername && (
                                  <span className="font-mono text-[10px] text-[var(--t3)]">by @{h.bannedByUsername}</span>
                                )}
                              </div>
                              <p className="font-mono text-[11px] text-[var(--t1)] mt-1.5">{h.reason}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="font-mono text-[10px] text-[var(--t3)]" title={h.expiresAt ? `UTC: ${h.expiresAt}` : ''}>
                                  {h.expiresAt ? `until ${new Date(h.expiresAt).toLocaleString()}` : 'permanent'}
                                </span>
                                {h.liftedAt && (
                                  <span className="font-mono text-[10px] text-[var(--t3)]" title={`UTC: ${h.liftedAt}`}>
                                    lifted {new Date(h.liftedAt).toLocaleString()}{h.liftedByUsername ? ` by @${h.liftedByUsername}` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ban user modal */}
        {banModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setBanModal(null)} />
            <div className="relative w-full max-w-md rounded-xl border border-[rgba(239,68,68,0.35)] bg-[var(--bg-card)] overflow-hidden shadow-[0_16px_64px_rgba(0,0,0,0.8)]">
              <div className="h-px bg-gradient-to-r from-[var(--red,#ef4444)] via-[rgba(239,68,68,0.3)] to-transparent" />
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Ban size={14} className="text-[var(--red,#ef4444)]" />
                  <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.05em]">BAN USER</span>
                  <span className="ml-auto font-mono text-[10px] text-[var(--t2)]">@{banModal.username}</span>
                </div>
                <div>
                  <label className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em] mb-1.5 block">
                    REASON <span className="text-[var(--red,#ef4444)]">*</span>
                  </label>
                  <input
                    value={banReason}
                    onChange={e => setBanReason(e.target.value)}
                    maxLength={500}
                    placeholder="e.g. Repeated violations of community guidelines"
                    className="w-full bg-[var(--bg-el)] border border-[var(--border-h)] rounded-lg px-3 py-2.5 font-mono text-[11px] text-[var(--t1)] focus:border-[var(--red,#ef4444)] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)] outline-none transition-all placeholder:text-[var(--t2)]"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em] mb-1.5 block">
                    EXPIRES <span className="text-[var(--t3)]">(leave blank for permanent)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={banExpiry}
                    onChange={e => setBanExpiry(e.target.value)}
                    className="w-full bg-[var(--bg-el)] border border-[var(--border-h)] rounded-lg px-3 py-2.5 font-mono text-[11px] text-[var(--t1)] focus:border-[var(--red,#ef4444)] outline-none transition-all"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setBanModal(null)}
                    className="flex-1 py-2 border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-lg font-mono text-[10px] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] transition-all">
                    CANCEL
                  </button>
                  <button onClick={handleBanUser} disabled={savingBan || !banReason.trim()}
                    className="flex-1 py-2 bg-gradient-to-br from-[#ef4444] to-[#dc2626] rounded-lg font-mono text-[10px] font-bold text-white shadow-[0_4px_24px_rgba(239,68,68,0.3)] hover:shadow-[0_8px_36px_rgba(239,68,68,0.4)] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    {savingBan ? 'BANNING...' : 'CONFIRM BAN →'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Feedback tab ──────────────────────────────────────────────────── */}
        {adminTab === 'feedback' && (
          <div className="flex flex-col gap-5">

            {/* Section header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.06em]">USER FEEDBACK</span>
                <span className="font-mono text-[10px] text-[var(--t2)] bg-[var(--bg-el)] border border-[var(--border-h)] rounded-full px-2 py-px">{feedbackTotal} total</span>
                {openCount > 0 && (
                  <span className="font-mono text-[10px] font-bold text-[var(--red)] bg-[rgba(244,63,94,0.08)] border border-[rgba(244,63,94,0.2)] rounded-full px-2 py-px">{openCount} open</span>
                )}
              </div>
              <button onClick={() => loadFeedback(feedbackPage)}
                className="px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold border border-[var(--border-h)] text-[var(--t2)] hover:text-[var(--t1)] hover:border-[var(--border-m)] transition-all">
                REFRESH
              </button>
            </div>

            {/* Content */}
            {feedbackLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em] animate-pulse">LOADING...</span>
              </div>
            ) : feedbackItems.length === 0 ? (
              <div className="border border-[var(--border-h)] rounded-xl px-5 py-12 text-center flex flex-col items-center gap-2">
                <MessageSquare size={18} className="text-[var(--t2)] opacity-40" />
                <p className="text-sm font-semibold text-[var(--t1)]">No feedback yet</p>
                <p className="text-xs text-[var(--t2)]">Feedback from users will appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {([
                  { status: 'open',     dotColor: 'bg-[var(--red)]',    label: 'Open' },
                  { status: 'reviewed', dotColor: 'bg-[var(--accent)]', label: 'Reviewed' },
                  { status: 'closed',   dotColor: 'bg-[var(--green)]',  label: 'Closed' },
                ] as const).map(({ status, dotColor, label }) => {
                  const statusItems = feedbackItems.filter(f => f.status === status)
                  if (statusItems.length === 0) return null

                  const typeConfig = {
                    good: {
                      border: 'border-l-[var(--green)]',
                      badge: 'text-[var(--green)] bg-[rgba(16,217,160,0.08)] border-[rgba(16,217,160,0.2)]',
                      activeTab: 'text-[var(--green)] border-b-[var(--green)]',
                    },
                    bad: {
                      border: 'border-l-[var(--red)]',
                      badge: 'text-[var(--red)] bg-[rgba(244,63,94,0.08)] border-[rgba(244,63,94,0.2)]',
                      activeTab: 'text-[var(--red)] border-b-[var(--red)]',
                    },
                    idea: {
                      border: 'border-l-[var(--purple)]',
                      badge: 'text-[var(--purple)] bg-[rgba(167,139,250,0.08)] border-[rgba(167,139,250,0.2)]',
                      activeTab: 'text-[var(--purple)] border-b-[var(--purple)]',
                    },
                  } as const

                  const availableTypes = (['good', 'bad', 'idea'] as const).filter(t => statusItems.some(f => f.type === t))
                  const activeType = (feedbackTypeTabs[status] && availableTypes.includes(feedbackTypeTabs[status])) ? feedbackTypeTabs[status] : availableTypes[0]
                  const visibleItems = statusItems.filter(f => f.type === activeType)

                  const isCollapsed = collapsedFeedbackSections[status] ?? false

                  return (
                    <div key={status} className="border border-[var(--border-h)] rounded-xl overflow-hidden bg-[var(--bg-card)]">
                      {/* Status header */}
                      <button
                        type="button"
                        onClick={() => setCollapsedFeedbackSections(prev => ({ ...prev, [status]: !isCollapsed }))}
                        className={`w-full flex items-center justify-between px-4 py-3 bg-[var(--bg-el)] hover:bg-[var(--bg-card)] transition-colors ${isCollapsed ? '' : 'border-b border-[var(--border-h)]'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`} />
                          <span className="text-xs font-semibold text-[var(--t1)]">{label}</span>
                          <span className="text-xs text-[var(--t2)]">({statusItems.length})</span>
                        </div>
                        {isCollapsed
                          ? <ChevronDown size={14} className="text-[var(--t2)]" />
                          : <ChevronUp   size={14} className="text-[var(--t2)]" />}
                      </button>

                      {!isCollapsed && (
                      <>
                      {/* Type sub-tabs */}
                      <div className="flex border-b border-[var(--border-h)]">
                        {availableTypes.map(type => {
                          const isActive = type === activeType
                          const tc = typeConfig[type]
                          const count = statusItems.filter(f => f.type === type).length
                          return (
                            <button
                              key={type}
                              onClick={() => setFeedbackTypeTabs(prev => ({ ...prev, [status]: type }))}
                              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
                                isActive
                                  ? `${tc.activeTab} border-b-2`
                                  : 'text-[var(--t2)] border-b-transparent hover:text-[var(--t1)]'
                              }`}
                            >
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                              <span className={`font-mono text-[10px] px-1.5 py-px rounded border ${isActive ? tc.badge : 'text-[var(--t2)] border-[var(--border-h)] bg-transparent'}`}>
                                {count}
                              </span>
                            </button>
                          )
                        })}
                      </div>

                      {/* Scrollable cards */}
                      <div className="overflow-y-auto max-h-72 scrollbar-thin scrollbar-thumb-[var(--border-m)]">
                        {visibleItems.map((item, i) => {
                          const tc = typeConfig[item.type as keyof typeof typeConfig] ?? typeConfig.idea
                          return (
                            <div key={item.id} className={`px-4 py-3 flex flex-col gap-2 border-l-2 ${tc.border} ${i !== visibleItems.length - 1 ? 'border-b border-[var(--border-h)]' : ''}`}>
                              {/* Top row: page context + date */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[10px] text-[var(--t2)]">{item.pageContext ?? '—'}</span>
                                <span className="font-mono text-[10px] text-[var(--t2)] flex-shrink-0">
                                  {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>

                              {/* Message */}
                              <p className="text-sm text-[var(--t1)] leading-relaxed">{item.message}</p>

                              {/* Admin note */}
                              {item.adminNote && (
                                <p className="text-xs text-[var(--t2)] italic pl-3 border-l-2 border-[var(--border-m)]">
                                  {item.adminNote}
                                </p>
                              )}

                              {/* Actions */}
                              {item.status !== 'closed' && (
                                <div className="flex items-center gap-3 pt-0.5">
                                  {item.status === 'open' && (
                                    <button onClick={() => handleMarkReviewed(item)}
                                      className="flex items-center gap-1 text-xs text-[var(--t2)] hover:text-[var(--accent)] transition-colors">
                                      <CheckCheck size={11} /> Mark reviewed
                                    </button>
                                  )}
                                  {item.status === 'reviewed' && (
                                    <button onClick={() => { setNoteModal(item); setNoteText('') }}
                                      className="text-xs text-[var(--t2)] hover:text-[var(--t1)] transition-colors">
                                      Close
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {feedbackTotal > 15 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button onClick={() => loadFeedback(feedbackPage - 1)} disabled={feedbackPage <= 1}
                  className="px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold border border-[var(--border-h)] text-[var(--t2)] hover:text-[var(--t1)] hover:border-[var(--border-m)] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  ← Prev
                </button>
                <span className="font-mono text-[10px] text-[var(--t2)]">
                  {feedbackPage} / {Math.ceil(feedbackTotal / 15)}
                </span>
                <button onClick={() => loadFeedback(feedbackPage + 1)} disabled={feedbackPage >= Math.ceil(feedbackTotal / 15)}
                  className="px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold border border-[var(--border-h)] text-[var(--t2)] hover:text-[var(--t1)] hover:border-[var(--border-m)] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Close-with-note modal */}
        {noteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setNoteModal(null)} />
            <div className="relative w-full max-w-md rounded-xl border border-[rgba(16,217,160,0.35)] bg-[var(--bg-card)] overflow-hidden shadow-[0_16px_64px_rgba(0,0,0,0.8)]">
              <div className="h-px bg-gradient-to-r from-[var(--green)] via-[rgba(16,217,160,0.3)] to-transparent" />
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-[3px] h-4 rounded-full bg-[var(--green)] flex-shrink-0" />
                  <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.05em]">CLOSE FEEDBACK</span>
                </div>
                <p className="text-xs text-[var(--t2)] leading-relaxed">
                  Optionally leave a note for the user explaining what was changed or resolved.
                </p>
                <div>
                  <label className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em] mb-1.5 block">
                    ADMIN NOTE <span className="text-[var(--t3)]">(optional, shown to user)</span>
                  </label>
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="e.g. Fixed in v1.3 — search now works on mobile Safari."
                    className="w-full bg-[var(--bg-el)] border border-[var(--border-h)] rounded-lg px-3 py-2.5 font-mono text-[11px] text-[var(--t1)] focus:border-[var(--green)] focus:shadow-[0_0_0_3px_rgba(16,217,160,0.12)] outline-none transition-all placeholder:text-[var(--t2)] resize-none"
                  />
                  <p className="font-mono text-[10px] text-[var(--t3)] mt-0.5 text-right">{noteText.length}/500</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setNoteModal(null)}
                    className="flex-1 py-2 border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-lg font-mono text-[10px] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] transition-all">
                    CANCEL
                  </button>
                  <button onClick={handleCloseWithNote} disabled={savingNote}
                    className="flex-1 py-2 bg-gradient-to-br from-[var(--green)] to-[#059669] rounded-lg font-mono text-[10px] font-bold text-[var(--bg)] shadow-[0_4px_24px_rgba(16,217,160,0.3)] hover:shadow-[0_8px_36px_rgba(16,217,160,0.4)] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    {savingNote ? 'CLOSING...' : 'CLOSE & NOTIFY →'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Flag-queue row component ─────────────────────────────────────────────────
// Used both in the main flag queue (under the moderation tab) and in the
// per-user drilldown panel. `compact` slims the row for the modal context.
interface FlagQueueRowProps {
  flag: FlaggedContent
  onAction: (flag: FlaggedContent, status: 'reviewing' | 'removed' | 'dismissed') => void
  compact?: boolean
}

function FlagQueueRow({ flag, onAction, compact = false }: FlagQueueRowProps) {
  const statusColor = flag.status === 'open'      ? 'text-[var(--yellow,#f59e0b)]'
                    : flag.status === 'reviewing' ? 'text-[var(--accent)]'
                    : flag.status === 'removed'   ? 'text-[var(--red,#ef4444)]'
                    :                                'text-[var(--t3)]'
  const sevColor = flag.severity === 'high'   ? 'text-[var(--red,#ef4444)] border-[rgba(239,68,68,0.3)]'
                 : flag.severity === 'medium' ? 'text-[var(--yellow,#f59e0b)] border-[rgba(245,158,11,0.3)]'
                 :                              'text-[var(--t2)] border-[var(--border-h)]'

  return (
    <div className={`p-3 rounded-lg border border-[var(--border-h)] bg-[var(--bg-el)] ${compact ? '' : 'hover:border-[rgba(59,130,246,0.3)] transition-all'}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold tracking-[0.06em] border ${sevColor} bg-[rgba(0,0,0,0.04)]`}>
          {flag.severity.toUpperCase()}
        </span>
        <span className="px-1.5 py-0.5 rounded font-mono text-[9px] tracking-[0.05em] bg-[rgba(59,130,246,0.06)] text-[var(--accent)] border border-[rgba(59,130,246,0.15)]">
          {flag.contentType}
        </span>
        <span className="font-mono text-[9px] font-bold text-[var(--t1)] bg-[rgba(244,63,94,0.08)] border border-[rgba(244,63,94,0.18)] px-1.5 py-0.5 rounded">
          {flag.reasonCode}
        </span>
        <span className={`font-mono text-[9px] font-bold tracking-[0.06em] ${statusColor}`}>{flag.status.toUpperCase()}</span>
        {flag.authorUsername && (
          <span className="font-mono text-[10px] text-[var(--t2)] ml-auto">@{flag.authorUsername}</span>
        )}
      </div>

      {flag.reasonMessage && (
        <p className="font-mono text-[11px] text-[var(--t2)] mt-1.5">{flag.reasonMessage}</p>
      )}

      {flag.excerpt && (
        <pre className="mt-1.5 px-2.5 py-2 rounded bg-[var(--bg)] border border-[var(--border-h)] font-mono text-[10px] text-[var(--t1)] whitespace-pre-wrap break-words max-h-32 overflow-y-auto">{flag.excerpt}</pre>
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="font-mono text-[10px] text-[var(--t3)]" title={`UTC: ${flag.createdAt}`}>
          {new Date(flag.createdAt).toLocaleString()}
        </span>
        {flag.status === 'open' && (
          <div className="ml-auto flex gap-1.5">
            <button onClick={() => onAction(flag, 'reviewing')}
              className="px-2 py-1 rounded font-mono text-[10px] font-bold tracking-[0.06em] border border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.06)] text-[var(--accent)] hover:bg-[rgba(59,130,246,0.12)] transition-all">
              REVIEW
            </button>
            <button onClick={() => onAction(flag, 'removed')}
              className="px-2 py-1 rounded font-mono text-[10px] font-bold tracking-[0.06em] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.06)] text-[var(--red,#ef4444)] hover:bg-[rgba(239,68,68,0.12)] transition-all">
              REMOVE
            </button>
            <button onClick={() => onAction(flag, 'dismissed')}
              className="px-2 py-1 rounded font-mono text-[10px] font-bold tracking-[0.06em] border border-[var(--border-h)] bg-[var(--bg)] text-[var(--t2)] hover:border-[rgba(59,130,246,0.3)] transition-all">
              DISMISS
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
