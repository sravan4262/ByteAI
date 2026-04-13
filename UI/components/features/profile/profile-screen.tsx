"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Pencil, Globe, Lock, Github, Plus, Bookmark, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { Avatar } from '@/components/layout/avatar'
import { SearchableDropdown } from '@/components/ui/searchable-dropdown'
import { useAuth } from '@/hooks/use-auth'
import { useUser } from '@clerk/nextjs'
import { mockCurrentUser, mockUsers, themes } from '@/lib/mock-data'
import * as api from '@/lib/api'
import type { TechStackResponse, DomainResponse, SeniorityTypeResponse, Post, InterviewWithQuestions, UserResponse, SocialLinkResponse, PersonResult } from '@/lib/api'
import { UserMiniProfile } from '@/components/features/profile/user-mini-profile'
import { setMeCache } from '@/lib/user-cache'

// ─── Badge card with earned/locked states + click-to-celebrate modal ──────────

type Badge = { name: string; label: string; icon: string; earned: boolean; description?: string; earnedAt?: string }

// Canonical list of every possible badge — order determines display order.
// Names must match the `name` column in the `lookups.badge_types` table.
const ALL_BADGES: Omit<Badge, 'earned'>[] = [
  { name: 'first_byte',     label: 'FIRST BYTE',    icon: '🥇', description: 'Posted your very first byte into the world.' },
  { name: 'byte_streak_7',  label: 'STREAK 7',      icon: '🔥', description: 'Maintained a posting streak for 7 days straight.' },
  { name: 'byte_streak_30', label: 'STREAK 30',     icon: '🌠', description: 'Posted every day for 30 consecutive days.' },
  { name: 'reactions_100',  label: '100 REACTIONS', icon: '💡', description: 'Your bytes earned 100 reactions from the community.' },
  { name: 'followers_100',  label: '100 FOLLOWERS', icon: '🌱', description: 'Built an audience of 100 followers.' },
  { name: 'followers_1k',   label: '1K FOLLOWERS',  icon: '🌟', description: 'Reached 1,000 followers on ByteAI.' },
  { name: 'mentor',         label: 'MENTOR',        icon: '🧑‍🏫', description: 'Helped the community with 50+ comments.' },
  { name: 'early_adopter',  label: 'EARLY ADOPTER', icon: '⚡', description: 'One of the first builders on ByteAI.' },
]

const PARTICLES = Array.from({ length: 16 }, (_, i) => {
  const angle = (i * 360) / 16
  const rad = (angle * Math.PI) / 180
  const dist = 90 + Math.random() * 40
  return {
    x: Math.cos(rad) * dist,
    y: Math.sin(rad) * dist,
    color: i % 4 === 0 ? '#fbbf24' : i % 4 === 1 ? '#f59e0b' : i % 4 === 2 ? '#fde68a' : '#ffffff',
    size: 4 + Math.random() * 5,
    delay: Math.random() * 0.15,
  }
})

function BadgeCard({ badge, index, forceOpen, onClose }: { badge: Badge; index: number; forceOpen?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  const isFirst = badge.name === 'first_byte' && badge.earned

  useEffect(() => { if (forceOpen) setOpen(true) }, [forceOpen])

  const handleClose = () => {
    setOpen(false)
    onClose?.()
  }

  return (
    <>
      {/* Card */}
      <motion.button
        onClick={() => setOpen(true)}
        initial={{ scale: 0.75, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: index * 0.06, type: 'spring', stiffness: 220, damping: 18 }}
        whileHover={badge.earned ? { scale: 1.06, y: -3 } : { scale: 1.02 }}
        whileTap={{ scale: 0.94 }}
        className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-3 min-w-[80px] rounded-xl border relative overflow-hidden cursor-pointer focus:outline-none ${
          badge.earned
            ? isFirst
              ? 'border-[rgba(251,191,36,0.55)] bg-[rgba(251,191,36,0.07)] shadow-[0_0_28px_rgba(251,191,36,0.22),inset_0_0_20px_rgba(251,191,36,0.04)] animate-badge-float'
              : 'border-[rgba(251,191,36,0.3)] bg-[rgba(251,191,36,0.04)] shadow-[0_0_16px_rgba(251,191,36,0.1)] animate-badge-float'
            : 'border-[var(--border)] bg-[rgba(255,255,255,0.015)]'
        }`}
        style={{ animationDelay: badge.earned ? `${index * 0.45}s` : undefined }}
      >
        {/* Earned — shimmer sweep */}
        {badge.earned && <div className="absolute inset-0 pointer-events-none animate-badge-shine" />}

        {/* Earned icon */}
        {badge.earned ? (
          <motion.span
            className="text-[26px] relative z-10 leading-none select-none"
            animate={isFirst ? { rotate: [0, -6, 6, -3, 3, 0] } : {}}
            transition={{ duration: 0.8, delay: 0.5, repeat: isFirst ? Infinity : 0, repeatDelay: 6 }}
          >
            {badge.icon}
          </motion.span>
        ) : (
          /* Locked — blurred icon behind lock overlay */
          <div className="relative leading-none select-none">
            <span className="text-[26px] opacity-20 grayscale blur-[1px]">{badge.icon}</span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-[var(--bg-el)] border border-[var(--border-m)] flex items-center justify-center shadow-lg">
                <Lock size={9} className="text-[var(--t3)]" />
              </div>
            </div>
          </div>
        )}

        {/* Name */}
        <span className={`font-mono text-[8.5px] font-semibold text-center leading-tight relative z-10 ${
          badge.earned ? 'text-[rgba(251,191,36,0.85)]' : 'text-[var(--border-h)]'
        }`}>
          {badge.earned ? badge.name : '???'}
        </span>

        {/* Earned marker */}
        {badge.earned && (
          <span className="font-mono text-[7px] text-[rgba(251,191,36,0.5)] tracking-[0.06em] relative z-10">
            {isFirst ? '✦ FIRST' : '✓ EARNED'}
          </span>
        )}

        {/* Locked marker */}
        {!badge.earned && (
          <span className="font-mono text-[7px] text-[var(--border-m)] tracking-[0.06em]">LOCKED</span>
        )}
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="badge-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[200] flex items-center justify-center"
            onClick={handleClose}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(5,5,14,0)' }}
              animate={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(5,5,14,0.75)' }}
              exit={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(5,5,14,0)' }}
              className="absolute inset-0"
            />

            {badge.earned ? (
              /* ── EARNED MODAL ── */
              <div className="relative flex items-center justify-center" onClick={(e) => { e.stopPropagation(); handleClose() }}>
                {/* Particles */}
                {PARTICLES.map((p, pi) => (
                  <motion.div
                    key={pi}
                    className="absolute rounded-full pointer-events-none"
                    style={{ width: p.size, height: p.size, backgroundColor: p.color, top: '50%', left: '50%', marginTop: -p.size / 2, marginLeft: -p.size / 2 }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: p.x, y: p.y, opacity: 0, scale: 0 }}
                    transition={{ duration: 0.7 + p.delay, delay: p.delay, ease: [0.2, 0, 0.8, 1] }}
                  />
                ))}

                {/* Outer glow rings */}
                {[1, 2, 3].map((ring) => (
                  <motion.div
                    key={ring}
                    className="absolute rounded-full border border-[rgba(251,191,36,0.4)] pointer-events-none"
                    style={{ width: 80, height: 80 }}
                    initial={{ scale: 0.5, opacity: 0.8 }}
                    animate={{ scale: 1.5 + ring * 0.8, opacity: 0 }}
                    transition={{ duration: 0.9, delay: ring * 0.12, ease: 'easeOut' }}
                  />
                ))}

                {/* Card */}
                <motion.div
                  initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.5, opacity: 0, rotate: 8 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  onClick={handleClose}
                  className="relative flex flex-col items-center gap-4 px-10 py-8 bg-[var(--bg-card)] border border-[rgba(251,191,36,0.4)] rounded-2xl shadow-[0_0_60px_rgba(251,191,36,0.25),0_0_120px_rgba(251,191,36,0.1)] cursor-pointer"
                >
                  {/* Continuous shimmer */}
                  <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none animate-badge-shine" />

                  {/* Icon */}
                  <motion.div
                    className="relative"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.35)_0%,transparent_70%)] blur-md" />
                    <span className="text-[56px] leading-none relative z-10">{badge.icon}</span>
                  </motion.div>

                  {/* Name */}
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-[rgba(251,191,36,0.95)] tracking-[0.12em]">
                      {badge.name}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--t2)] text-center max-w-[200px] leading-relaxed">
                      {badge.description ?? 'A rare achievement.'}
                    </span>
                  </div>

                  {/* Earned stamp */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(251,191,36,0.12)] border border-[rgba(251,191,36,0.3)]">
                    <span className="text-[10px]">✦</span>
                    <span className="font-mono text-[9px] text-[rgba(251,191,36,0.8)] tracking-[0.1em]">BADGE UNLOCKED</span>
                  </div>

                  <span className="font-mono text-[9px] text-[var(--t3)]">tap to close</span>
                </motion.div>
              </div>
            ) : (
              /* ── LOCKED MODAL ── */
              <motion.div
                initial={{ scale: 0.7, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 10 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                onClick={handleClose}
                className="relative flex flex-col items-center gap-4 px-10 py-8 bg-[var(--bg-card)] border border-[var(--border-m)] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] cursor-pointer mx-6"
              >
                {/* Shake animation on lock icon */}
                <motion.div
                  animate={{ x: [0, -6, 6, -4, 4, -2, 2, 0] }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="w-14 h-14 rounded-full bg-[var(--bg-el)] border border-[var(--border-m)] flex items-center justify-center"
                >
                  <Lock size={22} className="text-[var(--t3)]" />
                </motion.div>

                <div className="flex flex-col items-center gap-1.5">
                  <span className="font-mono text-[11px] font-bold text-[var(--t2)] tracking-[0.1em]">LOCKED</span>
                  <span className="font-mono text-[10px] text-[var(--t3)] text-center max-w-[200px] leading-relaxed">
                    Keep building to unlock this badge.
                  </span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-el)] border border-[var(--border-m)]">
                  <span className="font-mono text-[9px] text-[var(--t3)] tracking-[0.1em]">🔒 NOT YET EARNED</span>
                </div>

                <span className="font-mono text-[9px] text-[var(--t3)]">tap to close</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const { logout } = useAuth()
  const { user: clerkUser } = useUser()
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [activeFollowTab, setActiveFollowTab] = useState<'followers' | 'following'>('followers')
  const [activeTheme, setActiveTheme] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('byteai_theme') ?? 'dark'
    return 'dark'
  })
  const [feedPreferences, setFeedPreferences] = useState(mockCurrentUser.feedPreferences)
  const [techStack, setTechStack] = useState(mockCurrentUser.techStack)

  // Lookup data from APIs
  const [allTechStacks, setAllTechStacks] = useState<TechStackResponse[]>([])
  const [allDomains, setAllDomains] = useState<DomainResponse[]>([])
  const [seniorityTypes, setSeniorityTypes] = useState<SeniorityTypeResponse[]>([])
  const [addingTech, setAddingTech] = useState(false)
  const [selectedTechToAdd, setSelectedTechToAdd] = useState<string | null>(null)

  // Content tabs: POSTED vs SAVED, each with bytes/interviews sub-tabs
  type ContentMode = 'posted' | 'saved'
  type ContentKind = 'bytes' | 'interviews'
  const [contentMode, setContentMode] = useState<ContentMode>('posted')
  const [contentKind, setContentKind] = useState<ContentKind>('bytes')

  const [myBytes, setMyBytes] = useState<Post[]>([])
  const [myInterviews, setMyInterviews] = useState<InterviewWithQuestions[]>([])
  const [savedBytes, setSavedBytes] = useState<Post[]>([])
  const [savedInterviews, setSavedInterviews] = useState<InterviewWithQuestions[]>([])
  const [loadingContent, setLoadingContent] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Edit profile
  const [editMode, setEditMode] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editForm, setEditForm] = useState({ displayName: '', bio: '', company: '', roleTitle: '', github: '', linkedin: '', website: '' })

  // Social links from API
  const [socialLinks, setSocialLinks] = useState<SocialLinkResponse[]>([])

  // Auto-pop celebration modal for newly earned badges
  const [autoShowBadge, setAutoShowBadge] = useState<Badge | null>(null)

  useEffect(() => {
    api.getCurrentUser().then((user) => {
      if (user) setCurrentUser(user)
      setUserLoading(false)
    })
    api.getMySocials().then(setSocialLinks)
  }, [])

  // Merge API badges with the canonical ALL_BADGES list
  const mergedBadges: Badge[] = ALL_BADGES.map((b) => {
    const earned = (currentUser?.badges ?? []).find((ab) => ab.name === b.name)
    return earned
      ? { ...b, earned: true, description: earned.description ?? b.description, earnedAt: earned.earnedAt }
      : { ...b, earned: false }
  })

  // Detect newly earned badges and auto-pop the celebration modal
  useEffect(() => {
    if (!currentUser) return
    const earnedNames = (currentUser.badges ?? []).map((b) => b.name)
    const prev: string[] = JSON.parse(localStorage.getItem('byteai_earned_badges') ?? '[]')
    const fresh = earnedNames.filter((n) => !prev.includes(n))
    if (fresh.length > 0) {
      const badge = mergedBadges.find((b) => b.name === fresh[0] && b.earned)
      if (badge) setAutoShowBadge(badge)
    }
    localStorage.setItem('byteai_earned_badges', JSON.stringify(earnedNames))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  useEffect(() => {
    Promise.all([
      api.getTechStacks(),
      api.getDomains(),
      api.getSeniorityTypes(),
    ]).then(([stacks, domains, seniority]) => {
      setAllTechStacks(stacks)
      setAllDomains(domains)
      setSeniorityTypes(seniority)
    })
  }, [])

  useEffect(() => {
    setLoadingContent(true)
    Promise.all([
      api.getMyBytes(),
      api.getMyInterviews(),
      api.getMyBookmarks(),
      api.getMyInterviewBookmarks(),
    ]).then(([myB, myI, savedB, savedI]) => {
      setMyBytes(myB.posts)
      setMyInterviews(myI.interviews)
      setSavedBytes(savedB.posts)
      setSavedInterviews(savedI.interviews)
      setLoadingContent(false)
    })
  }, [])

  const handleDeleteByte = async (id: string) => {
    await api.deleteMyByte(id)
    setMyBytes((prev) => prev.filter((p) => p.id !== id))
    setConfirmDelete(null)
    toast.success('Byte removed')
  }

  const handleDeleteInterview = async (id: string) => {
    await api.deleteMyInterview(id)
    setMyInterviews((prev) => prev.filter((i) => i.id !== id))
    setConfirmDelete(null)
    toast.success('Interview removed')
  }

  const handleUnsave = async (id: string, kind: ContentKind) => {
    const type = kind === 'interviews' ? 'interview' : 'byte'
    await api.toggleBookmark(id, type)
    if (kind === 'bytes') setSavedBytes((prev) => prev.filter((p) => p.id !== id))
    else setSavedInterviews((prev) => prev.filter((i) => i.id !== id))
    toast.success('Removed from saved')
  }

  const feedPreferenceOptions = allDomains.length > 0
    ? allDomains.map((d) => d.label)
    : ['RUST', 'AI / ML', 'ARCHITECTURE', 'DEVOPS', 'SECURITY', 'WASM']

  const techStackOptions = allTechStacks
    .filter((t) => !techStack.includes(t.name))
    .map((t) => ({ value: t.name, label: t.label || t.name }))
  const [notifications, setNotifications] = useState({
    reactions: true,
    comments: true,
    newFollowers: false,
  })
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public')

  // People sheets for followers / following
  const [peopleSheet, setPeopleSheet] = useState<{ type: 'followers' | 'following'; list: PersonResult[] } | null>(null)
  const [miniProfilePerson, setMiniProfilePerson] = useState<PersonResult | null>(null)
  // Bytes modal
  const [showBytesModal, setShowBytesModal] = useState(false)
  // Byte detail — navigating from modal
  const [selectedByte, setSelectedByte] = useState<Post | null>(null)

  const toggleFeedPreference = async (pref: string) => {
    const newPrefs = feedPreferences.includes(pref)
      ? feedPreferences.filter((p) => p !== pref)
      : [...feedPreferences, pref]
    setFeedPreferences(newPrefs)
    await api.updateFeedPreferences(newPrefs)
  }

  const handleRemoveTech = async (tech: string) => {
    const newStack = techStack.filter((t) => t !== tech)
    setTechStack(newStack)
    await api.updateTechStack(newStack)
  }

  const handleAddTech = async (tech: string | null) => {
    if (!tech || techStack.includes(tech)) { setAddingTech(false); setSelectedTechToAdd(null); return }
    const newStack = [...techStack, tech]
    setTechStack(newStack)
    setAddingTech(false)
    setSelectedTechToAdd(null)
    await api.updateTechStack(newStack)
  }

  const handleThemeChange = async (theme: string) => {
    setActiveTheme(theme)
    // Apply theme class to <html> so CSS variables take effect globally
    const html = document.documentElement
    html.classList.remove('theme-light', 'theme-hacker', 'theme-nord')
    if (theme !== 'dark') html.classList.add(`theme-${theme}`)
    localStorage.setItem('byteai_theme', theme)
    await api.updateTheme(theme as 'dark' | 'darker' | 'oled')
  }

  const handleNotificationChange = async (key: keyof typeof notifications) => {
    const newSettings = { ...notifications, [key]: !notifications[key] }
    setNotifications(newSettings)
    await api.updateNotificationSettings({ [key]: newSettings[key] })
  }

  const handlePrivacyChange = async (value: 'public' | 'private') => {
    setPrivacy(value)
    await api.updatePrivacy(value)
  }

  const handleLogout = async () => {
    await api.logout()
    toast.success('Signed out')
    logout()
  }

  const openEditProfile = () => {
    const github = socialLinks.find((s) => s.platform === 'github')?.url ?? ''
    const linkedin = socialLinks.find((s) => s.platform === 'linkedin')?.url ?? ''
    const website = socialLinks.find((s) => s.platform === 'website')?.url ?? ''
    setEditForm({
      displayName: currentUser?.displayName ?? '',
      bio: currentUser?.bio ?? '',
      company: currentUser?.company ?? '',
      roleTitle: currentUser?.roleTitle ?? '',
      github,
      linkedin,
      website,
    })
    setEditMode(true)
  }

  const handleSaveProfile = async () => {
    setEditSaving(true)
    const [profileResult] = await Promise.all([
      api.updateProfile({
        displayName: editForm.displayName.trim() || undefined,
        bio: editForm.bio.trim() || null,
        company: editForm.company.trim() || null,
        roleTitle: editForm.roleTitle.trim() || null,
      }),
      api.updateMySocials([
        { platform: 'github', url: editForm.github.trim(), label: editForm.github.trim() ? editForm.github.replace(/^https?:\/\/(www\.)?github\.com\//, 'github/') : '' },
        { platform: 'linkedin', url: editForm.linkedin.trim(), label: 'linkedin' },
        { platform: 'website', url: editForm.website.trim(), label: editForm.website.replace(/^https?:\/\//, '') },
      ].filter((s) => s.url)),
    ])

    if (profileResult.success) {
      // Refresh user + socials
      const [updatedUser, updatedSocials] = await Promise.all([
        api.getCurrentUser(),
        api.getMySocials(),
      ])
      if (updatedUser) {
        setCurrentUser(updatedUser)
        // Keep cache in sync after profile edit
        setMeCache({
          userId: updatedUser.id,
          username: updatedUser.username,
          displayName: updatedUser.displayName,
          avatarUrl: updatedUser.avatarUrl,
          bio: updatedUser.bio,
          roleTitle: updatedUser.roleTitle,
          company: updatedUser.company,
          level: updatedUser.level,
          bytesCount: myBytes.length,
          followersCount: updatedUser.followersCount ?? 0,
          followingCount: updatedUser.followingCount ?? 0,
          isVerified: updatedUser.isVerified,
        })
      }
      setSocialLinks(updatedSocials)
      setEditMode(false)
      toast.success('Profile updated')
    } else {
      toast.error('Failed to update profile')
    }
    setEditSaving(false)
  }

  return (
    <PhoneFrame>
      {/* ── EDIT PROFILE DRAWER ── */}
      {editMode && (
        <div className="absolute inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div className="flex-1 bg-[rgba(5,5,14,0.7)] backdrop-blur-sm" onClick={() => setEditMode(false)} />

          {/* Panel */}
          <div className="bg-[var(--bg-card)] border-t border-[var(--border-m)] rounded-t-2xl flex flex-col max-h-[90%] overflow-hidden shadow-[0_-16px_64px_rgba(0,0,0,0.6)]">
            {/* Handle + header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--border)] flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold tracking-[0.1em]">EDIT_PROFILE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={editSaving}
                  className="flex items-center gap-1.5 font-mono text-[10px] font-semibold px-4 py-[7px] rounded-full bg-gradient-to-r from-[var(--accent)] to-[#2563eb] text-white tracking-[0.06em] disabled:opacity-50 transition-all hover:shadow-[0_0_16px_var(--accent-glow)]"
                >
                  {editSaving ? (
                    <span className="animate-pulse">SAVING...</span>
                  ) : (
                    <><Check size={11} />SAVE</>
                  )}
                </button>
                <button onClick={() => setEditMode(false)} className="w-7 h-7 rounded-full bg-[var(--bg-el)] border border-[var(--border-m)] flex items-center justify-center hover:border-[var(--red)] hover:text-[var(--red)] transition-all">
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)] px-5 py-4 flex flex-col gap-4">
              {/* Display Name */}
              <div>
                <label className="font-mono text-[10px] text-[var(--t3)] tracking-[0.08em] mb-1.5 block">// DISPLAY_NAME</label>
                <input
                  value={editForm.displayName}
                  onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="Your name"
                  maxLength={60}
                  className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] focus:border-[var(--accent)] rounded-lg px-3 py-2.5 font-mono text-xs text-[var(--t1)] placeholder:text-[var(--t3)] outline-none transition-colors"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="font-mono text-[10px] text-[var(--t3)] tracking-[0.08em] mb-1.5 block">// BIO</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Tell the world what you build..."
                  maxLength={280}
                  rows={3}
                  className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] focus:border-[var(--accent)] rounded-lg px-3 py-2.5 font-mono text-xs text-[var(--t1)] placeholder:text-[var(--t3)] outline-none transition-colors resize-none leading-relaxed"
                />
                <div className="text-right font-mono text-[9px] text-[var(--t3)] mt-0.5">{editForm.bio.length}/280</div>
              </div>

              {/* Role title + company on one line */}
              <div>
                <label className="font-mono text-[10px] text-[var(--t3)] tracking-[0.08em] mb-1.5 block">// ROLE_TITLE @ COMPANY</label>
                <div className="flex items-center gap-2">
                  <input
                    value={editForm.roleTitle}
                    onChange={(e) => setEditForm((f) => ({ ...f, roleTitle: e.target.value }))}
                    placeholder="Sr. Engineer"
                    maxLength={40}
                    className="flex-1 bg-[var(--bg-el)] border border-[var(--border-m)] focus:border-[var(--purple)] rounded-lg px-3 py-2.5 font-mono text-xs text-[var(--t1)] placeholder:text-[var(--t3)] outline-none transition-colors"
                  />
                  <span className="font-mono text-[11px] text-[var(--t3)] flex-shrink-0">@</span>
                  <input
                    value={editForm.company}
                    onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))}
                    placeholder="company.io"
                    maxLength={50}
                    className="flex-1 bg-[var(--bg-el)] border border-[var(--border-m)] focus:border-[var(--cyan)] rounded-lg px-3 py-2.5 font-mono text-xs text-[var(--t1)] placeholder:text-[var(--t3)] outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Social links */}
              <div>
                <label className="font-mono text-[10px] text-[var(--t3)] tracking-[0.08em] mb-2 block">// SOCIAL_LINKS</label>
                <div className="flex flex-col gap-2">
                  {[
                    { key: 'github' as const, icon: <Github size={12} />, placeholder: 'https://github.com/username', label: 'GitHub' },
                    { key: 'linkedin' as const, icon: <span className="font-bold text-[11px]">in</span>, placeholder: 'https://linkedin.com/in/username', label: 'LinkedIn' },
                    { key: 'website' as const, icon: <Globe size={12} />, placeholder: 'https://yoursite.dev', label: 'Website' },
                  ].map(({ key, icon, placeholder, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-[var(--bg)] border border-[var(--border-m)] flex items-center justify-center text-[var(--t3)]">
                        {icon}
                      </div>
                      <input
                        value={editForm[key]}
                        onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="flex-1 bg-[var(--bg-el)] border border-[var(--border-m)] focus:border-[var(--cyan)] rounded-lg px-3 py-2 font-mono text-[11px] text-[var(--t1)] placeholder:text-[var(--t3)] outline-none transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-[13px] pb-[11px] border-b border-[var(--border)] flex-shrink-0 bg-[rgba(5,5,14,0.92)] backdrop-blur-md">
        <div className="flex items-center gap-[9px]">
          <span className="font-mono text-[8px] text-[var(--cyan)] border-[1.5px] border-[var(--cyan)] rounded px-[5px] py-[2px] tracking-[0.05em] shadow-[0_0_10px_var(--cyan)]">
            {'</>'}
          </span>
          <span className="font-mono text-xs font-bold tracking-[0.1em]">PROFILE</span>
        </div>
        <div className="font-mono text-[10px] text-[var(--t2)] flex items-center gap-1.5">
          <span className="text-[var(--green)]">●</span> ONLINE
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
        {/* Hero */}
        <div className="relative px-5 pt-5 pb-4 bg-gradient-to-b from-[rgba(59,130,246,0.06)] to-transparent border-b border-[var(--border)]">
          <div className="flex items-start justify-between mb-[14px]">
            <div className="relative">
              <div className="absolute -inset-[3px] rounded-full bg-[conic-gradient(from_0deg,var(--cyan),var(--accent),var(--purple),var(--cyan))] animate-spin-ring blur-[2px] opacity-70" />
              <div className="relative w-[68px] h-[68px] rounded-full bg-gradient-to-br from-[#131b40] to-[#1e3580] border-2 border-[var(--border-h)] flex items-center justify-center font-mono text-[22px] font-bold text-[var(--cyan)] shadow-[0_0_32px_rgba(34,211,238,0.25)] overflow-hidden">
                {(clerkUser?.imageUrl || currentUser?.avatarUrl)
                  ? <img src={clerkUser?.imageUrl ?? currentUser!.avatarUrl!} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  : (currentUser?.displayName ?? '').split(' ').filter(w => /[a-zA-Z]/.test(w[0])).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
                }
              </div>
              <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[var(--accent)] border-2 border-[var(--bg)] flex items-center justify-center cursor-pointer">
                <Pencil size={9} className="text-white" />
              </div>
            </div>
            <button
              onClick={openEditProfile}
              className="font-mono text-[10px] font-semibold tracking-[0.06em] px-[14px] py-[7px] rounded-full border border-[var(--border-h)] text-[var(--t2)] bg-[var(--bg-el)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              EDIT_PROFILE
            </button>
          </div>

          {userLoading ? (
            <div className="animate-pulse">
              <div className="h-5 w-36 bg-[var(--border-m)] rounded mb-1.5" />
              <div className="h-3 w-24 bg-[var(--border)] rounded mb-2" />
            </div>
          ) : (
            <>
              <div className="text-xl font-extrabold tracking-tight flex items-center gap-[7px]">
                {currentUser?.displayName ?? '—'}
                <span className="text-[13px] text-[var(--accent)] drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]">✦</span>
              </div>
              <div className="font-mono text-[10px] text-[var(--t2)] mt-0.5">
                {currentUser?.username ? `@${currentUser.username}` : ''}
              </div>
              {(currentUser?.roleTitle || currentUser?.seniority || currentUser?.domain || currentUser?.company) && (
                <div className="font-mono text-[11px] text-[var(--t2)] mt-1.5 tracking-[0.04em]">
                  {currentUser.roleTitle
                    ? currentUser.roleTitle
                    : [currentUser.seniority, currentUser.domain].filter(Boolean).join(' · ').toUpperCase()
                  }
                  {currentUser.company && (
                    <span> @ {currentUser.company}</span>
                  )}
                </div>
              )}
            </>
          )}

          <div className="mt-[10px] p-3 bg-[var(--bg-card)] border border-[var(--border-m)] rounded-lg relative">
            <div className="font-mono text-[11px] text-[var(--t3)] mb-1">/*</div>
            {userLoading ? (
              <div className="animate-pulse flex flex-col gap-1.5">
                <div className="h-2.5 bg-[var(--border-m)] rounded w-full" />
                <div className="h-2.5 bg-[var(--border-m)] rounded w-4/5" />
                <div className="h-2.5 bg-[var(--border-m)] rounded w-3/5" />
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-[var(--t2)]">
                {currentUser?.bio || <span className="text-[var(--t3)] italic">No bio yet.</span>}
              </p>
            )}
            <div className="font-mono text-[11px] text-[var(--t3)] mt-1">*/</div>
          </div>

          <div className="flex gap-2 flex-wrap mt-3">
            {socialLinks.length > 0 ? socialLinks.map((link) => (
              <a
                key={link.platform}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-[5px] px-[10px] py-[5px] bg-[var(--bg-el)] border border-[var(--border-m)] rounded-full font-mono text-[10px] text-[var(--t2)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {link.platform === 'github' && <Github size={10} />}
                {link.platform === 'linkedin' && <span className="text-[10px] font-bold">in</span>}
                {link.platform === 'website' && <Globe size={10} />}
                {link.label || link.url.replace(/^https?:\/\//, '')}
              </a>
            )) : (
              <button
                onClick={openEditProfile}
                className="flex items-center gap-[5px] px-[10px] py-[5px] border border-dashed border-[var(--border-m)] rounded-full font-mono text-[10px] text-[var(--t3)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <Plus size={10} /> ADD LINKS
              </button>
            )}
          </div>
        </div>

        {/* XP Card */}
        <div className="mx-5 mt-4 p-3 bg-gradient-to-br from-[rgba(59,130,246,0.08)] to-[rgba(167,139,250,0.06)] border border-[var(--border-m)] rounded-lg">
          <div className="flex items-center justify-between mb-2">
            {userLoading ? (
              <div className="h-6 w-24 bg-[var(--border-m)] rounded-full animate-pulse" />
            ) : (
              <span className="font-mono text-xs font-bold text-[var(--cyan)] bg-[rgba(34,211,238,0.1)] border border-[rgba(34,211,238,0.2)] px-[10px] py-1 rounded-full tracking-[0.06em]">
                PRO_LVL_{currentUser?.level ?? 1}
              </span>
            )}
            {!userLoading && (
              <span className="font-mono text-[10px] text-[var(--t3)]">
                XP to LVL_{(currentUser?.level ?? 1) + 1}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-[var(--border-m)] rounded-full overflow-hidden">
              <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[var(--accent)] via-[var(--cyan)] to-[var(--accent)] bg-[length:200%_100%] animate-xp-shimmer" />
            </div>
            <span className="font-mono text-[10px] text-[var(--t2)]">72%</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 mx-5 mt-4 border border-[var(--border-m)] rounded-lg overflow-hidden">
          {[
            {
              label: 'BYTES', value: myBytes.length, clickable: myBytes.length > 0,
              onClick: () => setShowBytesModal(true),
            },
            { label: 'REACTIONS', value: '—', clickable: false },
            {
              label: 'FOLLOWERS', value: currentUser?.followersCount ?? '—', clickable: true,
              onClick: async () => {
                if (!currentUser) return
                const list = await api.getFollowers(currentUser.id)
                setPeopleSheet({ type: 'followers', list })
              },
            },
            { label: 'DAY STREAK', value: userLoading ? '…' : `🔥 ${currentUser?.streak ?? 0}`, isStreak: true, clickable: false },
          ].map((stat, i) => (
            stat.clickable ? (
              <button
                key={stat.label}
                onClick={stat.onClick}
                className={`py-3 px-2 text-center bg-[var(--bg-card)] ${i < 3 ? 'border-r border-[var(--border-m)]' : ''} hover:bg-[var(--bg-el)] transition-colors`}
              >
                <div className="font-mono text-[15px] font-bold text-[var(--accent)]">{stat.value}</div>
                <div className="font-mono text-[9px] tracking-[0.07em] text-[var(--t3)] mt-[3px] underline underline-offset-2">{stat.label}</div>
              </button>
            ) : (
              <div
                key={stat.label}
                className={`py-3 px-2 text-center bg-[var(--bg-card)] ${i < 3 ? 'border-r border-[var(--border-m)]' : ''} ${stat.isStreak ? 'bg-gradient-to-br from-[rgba(16,217,160,0.06)] to-transparent' : ''}`}
              >
                <div className={`font-mono text-[15px] font-bold ${stat.isStreak ? 'text-[var(--green)]' : 'text-[var(--t1)]'}`}>
                  {stat.value}
                </div>
                <div className="font-mono text-[9px] tracking-[0.07em] text-[var(--t3)] mt-[3px]">{stat.label}</div>
              </div>
            )
          ))}
        </div>

        {/* Badges */}
        <div className="mt-5 px-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[11px] font-bold tracking-[0.12em] text-[var(--t3)]">// BADGES</div>
            <span className="font-mono text-[10px] text-[var(--t3)]">{mergedBadges.filter(b => b.earned).length}/{mergedBadges.length} UNLOCKED</span>
          </div>
        </div>
        <div className="flex gap-2.5 px-5 pb-1 overflow-x-auto scrollbar-none">
          {mergedBadges.map((badge, i) => (
            <BadgeCard
              key={badge.name}
              badge={badge}
              index={i}
              forceOpen={autoShowBadge?.name === badge.name}
              onClose={() => setAutoShowBadge(null)}
            />
          ))}
        </div>

        {/* Next badge to earn */}
        {(() => {
          const nextBadge = mergedBadges.find(b => !b.earned)
          if (!nextBadge) return null
          return (
            <div className="mx-5 mt-3 mb-1 flex items-center gap-3 px-4 py-3 bg-[var(--bg-el)] border border-[var(--border-m)] rounded-xl">
              <div className="text-xl opacity-30 grayscale">{nextBadge.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[9px] tracking-[0.1em] text-[var(--t3)] mb-0.5">// NEXT TO UNLOCK</div>
                <div className="font-mono text-[11px] font-bold text-[var(--t1)]">{nextBadge.label}</div>
                <div className="font-mono text-[9px] text-[var(--t2)] mt-0.5 leading-relaxed">{nextBadge.description}</div>
              </div>
              <div className="w-5 h-5 rounded-full bg-[var(--bg-card)] border border-[var(--border-m)] flex items-center justify-center flex-shrink-0">
                <span className="text-[10px]">🔒</span>
              </div>
            </div>
          )
        })()}

        {/* Content Explorer */}
        <div className="mt-5 px-5">
          {/* Mode toggle — POSTED / SAVED */}
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-[9px] text-[var(--t3)] tracking-[0.1em]">~/</span>
            {(['posted', 'saved'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setContentMode(mode)}
                className={`font-mono text-[10px] px-3 py-1 rounded-full border transition-all tracking-[0.07em] ${
                  contentMode === mode
                    ? mode === 'posted'
                      ? 'border-[var(--cyan)] text-[var(--cyan)] bg-[rgba(34,211,238,0.08)]'
                      : 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-d)]'
                    : 'border-[var(--border-m)] text-[var(--t3)] hover:border-[var(--border-h)] hover:text-[var(--t2)]'
                }`}
              >
                {mode === 'posted' ? '📝 POSTED' : '🔖 SAVED'}
              </button>
            ))}
          </div>

          {/* Kind sub-tabs */}
          <div className="flex items-center gap-1 mb-3 bg-[var(--bg-card)] border border-[var(--border-m)] rounded-lg p-1">
            {(['bytes', 'interviews'] as const).map((kind) => {
              const count = contentMode === 'posted'
                ? (kind === 'bytes' ? myBytes.length : myInterviews.length)
                : (kind === 'bytes' ? savedBytes.length : savedInterviews.length)
              return (
                <button
                  key={kind}
                  onClick={() => setContentKind(kind)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-mono text-[10px] transition-all ${
                    contentKind === kind
                      ? 'bg-[var(--bg-el)] text-[var(--t1)] shadow-sm border border-[var(--border-m)]'
                      : 'text-[var(--t3)] hover:text-[var(--t2)]'
                  }`}
                >
                  <span>{kind === 'bytes' ? '⬡' : '◈'}</span>
                  {kind.toUpperCase()}
                  <span className={`text-[8px] px-1 py-px rounded ${contentKind === kind ? 'bg-[var(--accent-d)] text-[var(--accent)]' : 'bg-[var(--border)] text-[var(--t3)]'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* File listing */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-m)] rounded-lg overflow-hidden">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[rgba(255,255,255,0.02)]">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-[#ff5f57]" />
                <span className="w-2 h-2 rounded-full bg-[#febc2e]" />
                <span className="w-2 h-2 rounded-full bg-[#28c840]" />
              </div>
              <span className="font-mono text-[9px] text-[var(--t3)] tracking-[0.1em] ml-1">
                ~/{contentMode}/{contentKind}
              </span>
            </div>

            {loadingContent ? (
              <div className="py-8 text-center font-mono text-[10px] text-[var(--t3)] animate-pulse">
                <span className="text-[var(--green)]">$</span> loading...
              </div>
            ) : (() => {
              const items = contentMode === 'posted'
                ? (contentKind === 'bytes' ? myBytes : myInterviews)
                : (contentKind === 'bytes' ? savedBytes : savedInterviews)

              if (items.length === 0) {
                const isBytes = contentKind === 'bytes'
                const isPosted = contentMode === 'posted'
                return (
                  <div className="py-10 px-4 flex flex-col items-center gap-3">
                    <div className="text-[40px] opacity-20 select-none">
                      {isBytes ? '⬡' : '◈'}
                    </div>
                    <div className="font-mono text-[10px] text-[var(--t3)] text-center">
                      <span className="text-[var(--green)]">$</span> ls <span className="text-[var(--t3)]">~/</span><span className="text-[var(--cyan)]">{contentKind}</span>
                    </div>
                    <div className="font-mono text-[9px] text-[var(--t3)] text-center leading-relaxed">
                      {isPosted && isBytes && <>No bytes posted yet.<br /><span className="text-[var(--accent)]">→</span> Hit compose to share your first byte</>}
                      {isPosted && !isBytes && <>No interviews shared yet.<br /><span className="text-[var(--accent)]">→</span> Document your interview experiences</>}
                      {!isPosted && isBytes && <>No bytes saved yet.<br /><span className="text-[var(--accent)]">→</span> Bookmark bytes you want to revisit</>}
                      {!isPosted && !isBytes && <>No interviews saved yet.<br /><span className="text-[var(--accent)]">→</span> Save interviews to study later</>}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {[...Array(3)].map((_, i) => (
                        <span key={i} className="w-1 h-1 rounded-full bg-[var(--border-m)]" />
                      ))}
                    </div>
                  </div>
                )
              }

              return (
                <div className="divide-y divide-[var(--border)]">
                  {items.map((item, idx) => {
                    const isPost = 'title' in item && 'body' in item && !('questions' in item)
                    const id = item.id
                    const title = item.title
                    const isConfirming = confirmDelete === id
                    const dateStr = isPost
                      ? (item as Post).createdAt
                      : new Date((item as InterviewWithQuestions).createdAt).toLocaleDateString()

                    return (
                      <div
                        key={id}
                        className={`flex items-center gap-2 px-3 py-2.5 group transition-all ${
                          isConfirming ? 'bg-[rgba(244,63,94,0.06)]' : 'hover:bg-[rgba(255,255,255,0.02)]'
                        }`}
                      >
                        {/* Index */}
                        <span className="font-mono text-[8px] text-[var(--t3)] w-4 flex-shrink-0 select-none">
                          {String(idx + 1).padStart(2, '0')}
                        </span>

                        {/* Icon */}
                        <span className="text-[10px] flex-shrink-0">
                          {contentKind === 'bytes' ? '⬡' : '◈'}
                        </span>

                        {/* Title — clickable */}
                        <button
                          onClick={() => router.push(contentKind === 'bytes' ? `/post/${id}` : `/interviews/${id}`)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <span className="font-mono text-[10px] text-[var(--t1)] truncate block hover:text-[var(--accent)] transition-colors">
                            {title}
                          </span>
                          {contentKind === 'interviews' && (
                            <span className="font-mono text-[8px] text-[var(--t3)]">
                              {(item as InterviewWithQuestions).company && `${(item as InterviewWithQuestions).company} · `}
                              {(item as InterviewWithQuestions).difficulty?.toUpperCase()} · {(item as InterviewWithQuestions).questions?.length ?? 0}Q
                            </span>
                          )}
                        </button>

                        {/* Date */}
                        <span className="font-mono text-[8px] text-[var(--t3)] flex-shrink-0 hidden sm:block">{dateStr}</span>

                        {/* Action — delete for posted, unsave for saved */}
                        {contentMode === 'posted' ? (
                          isConfirming ? (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className="font-mono text-[8px] text-[var(--red)]">rm?</span>
                              <button
                                onClick={() => contentKind === 'bytes' ? handleDeleteByte(id) : handleDeleteInterview(id)}
                                className="font-mono text-[8px] px-2 py-0.5 rounded bg-[var(--red)] text-white"
                              >
                                YES
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="font-mono text-[8px] px-2 py-0.5 rounded border border-[var(--border-m)] text-[var(--t2)]"
                              >
                                NO
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(id)}
                              className="font-mono text-[8px] px-2 py-0.5 rounded border border-[var(--border-m)] text-[var(--t3)] opacity-0 group-hover:opacity-100 transition-all hover:border-[var(--red)] hover:text-[var(--red)] flex-shrink-0"
                            >
                              rm
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => handleUnsave(id, contentKind)}
                            className="flex items-center gap-1 font-mono text-[8px] px-2 py-0.5 rounded border border-[var(--border-m)] text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-d)] flex-shrink-0"
                            title="Remove from saved"
                          >
                            <Bookmark size={9} fill="currentColor" />
                            unsave
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Network */}
        <div className="mt-5 px-5">
          <div className="font-mono text-[11px] font-bold tracking-[0.12em] text-[var(--t3)] mb-3">// NETWORK</div>
          <div className="flex gap-3">
            {(['followers', 'following'] as const).map(type => (
              <button
                key={type}
                onClick={async () => {
                  if (!currentUser) return
                  const list = await api.getFollowers(currentUser.id)
                  setPeopleSheet({ type, list })
                }}
                className="flex-1 py-3 bg-[var(--bg-card)] border border-[var(--border-m)] rounded-lg font-mono text-[11px] text-[var(--t2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
              >
                {type === 'followers' ? (currentUser?.followersCount ?? '—') : (currentUser?.followingCount ?? '—')}
                <div className="font-mono text-[8px] tracking-[0.08em] text-[var(--t3)] mt-0.5">{type.toUpperCase()}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Preferences */}
        <div className="mt-5 px-5">
          <div className="font-mono text-[11px] font-bold tracking-[0.12em] text-[var(--t3)] mb-3">// PREFERENCES</div>

          <div className="mb-4">
            <div className="font-mono text-[11px] text-[var(--t3)] tracking-[0.08em] mb-2">// TECH_STACK</div>
            <div className="flex flex-wrap gap-1.5">
              {techStack.map((tech) => (
                <button
                  key={tech}
                  onClick={() => handleRemoveTech(tech)}
                  className="flex items-center gap-[5px] px-[10px] py-[5px] bg-[var(--accent-d)] border border-[var(--accent)] rounded-full font-mono text-[10px] text-[var(--accent)] transition-all group"
                >
                  {tech}
                  <span className="opacity-50 text-[10px] group-hover:opacity-100 group-hover:text-[var(--red)]">×</span>
                </button>
              ))}
              {addingTech ? (
                <SearchableDropdown
                  options={techStackOptions}
                  value={selectedTechToAdd}
                  onChange={handleAddTech}
                  placeholder="TECH STACK"
                  allLabel="CANCEL"
                  accentColor="accent"
                />
              ) : (
                <button
                  onClick={() => setAddingTech(true)}
                  className="flex items-center gap-[5px] px-[10px] py-[5px] border border-dashed border-[var(--border-m)] rounded-full font-mono text-[10px] text-[var(--t2)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  <Plus size={10} /> ADD
                </button>
              )}
            </div>
          </div>

          <div className="mb-4">
            <div className="font-mono text-[11px] text-[var(--t3)] tracking-[0.08em] mb-2">
              // SHOW_ME_MORE_OF
              {allDomains.length > 0 && (
                <span className="ml-2 text-[var(--green)] text-[9px]">✓ API</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {feedPreferenceOptions.map((pref) => (
                <button
                  key={pref}
                  onClick={() => toggleFeedPreference(pref)}
                  className={`flex items-center gap-[5px] px-3 py-1.5 border-[1.5px] rounded-full font-mono text-[10px] transition-all ${
                    feedPreferences.includes(pref)
                      ? 'border-[var(--purple)] text-[var(--purple)] bg-[var(--purple-d)]'
                      : 'border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg-card)] hover:border-[var(--border-h)]'
                  }`}
                >
                  <span className={`w-[5px] h-[5px] rounded-full ${feedPreferences.includes(pref) ? 'bg-[var(--purple)]' : 'bg-[var(--border-h)]'}`} />
                  {pref}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-1">
            <div className="font-mono text-[11px] text-[var(--t3)] tracking-[0.08em] mb-[10px]">// THEME</div>
            <div className="flex gap-1.5">
              {(themes as { id: string; label: string; color: string }[]).map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className={`flex flex-col items-center gap-[5px] p-2 border-[1.5px] rounded-lg transition-all ${
                    activeTheme === theme.id ? 'border-[var(--accent)]' : 'border-[var(--border-m)] hover:border-[var(--border-h)]'
                  }`}
                >
                  <div className="w-7 h-5 rounded" style={{ background: theme.color, border: '1px solid var(--border-h)' }} />
                  <span className={`font-mono text-[7px] ${activeTheme === theme.id ? 'text-[var(--accent)]' : 'text-[var(--t2)]'}`}>
                    {theme.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="mt-5 px-5">
          <div className="font-mono text-[11px] font-bold tracking-[0.12em] text-[var(--t3)] mb-3">// NOTIFICATIONS</div>
          <div className="flex flex-col">
            {[
              { key: 'reactions', icon: '💡', label: 'Reactions', sub: 'When someone reacts to your Bytes' },
              { key: 'comments', icon: '💬', label: 'Comments', sub: 'When someone replies to your Byte' },
              { key: 'newFollowers', icon: '👤', label: 'New Followers', sub: 'When someone follows you' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-[13px] border-b border-[var(--border)] last:border-b-0">
                <div className="flex items-center gap-[10px]">
                  <span className="text-[15px] w-5 text-center">{item.icon}</span>
                  <div>
                    <div className="font-mono text-xs text-[var(--t1)]">{item.label}</div>
                    <div className="font-mono text-[10px] text-[var(--t3)] mt-0.5">{item.sub}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleNotificationChange(item.key as keyof typeof notifications)}
                  className={`w-9 h-5 rounded-full relative transition-all flex-shrink-0 ${
                    notifications[item.key as keyof typeof notifications] ? 'bg-[var(--accent)]' : 'bg-[var(--border-m)]'
                  }`}
                >
                  <div className={`absolute w-4 h-4 rounded-full bg-white top-0.5 shadow-[0_1px_4px_rgba(0,0,0,0.35)] transition-transform ${
                    notifications[item.key as keyof typeof notifications] ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Account */}
        <div className="mt-5 px-5">
          <div className="font-mono text-[11px] font-bold tracking-[0.12em] text-[var(--t3)] mb-3">// ACCOUNT</div>

          <div className="mb-4">
            <div className="font-mono text-[11px] text-[var(--t3)] tracking-[0.08em] mb-[10px]">// PROFILE_VISIBILITY</div>
            <div className="flex gap-1.5">
              {(['public', 'private'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => handlePrivacyChange(opt)}
                  className={`flex-1 py-2 px-1.5 text-center border-[1.5px] rounded-lg font-mono text-[8px] transition-all flex items-center justify-center gap-1.5 ${
                    privacy === opt
                      ? 'border-[var(--green)] text-[var(--green)] bg-[var(--green-d)]'
                      : 'border-[var(--border-m)] text-[var(--t2)] hover:border-[var(--border-h)]'
                  }`}
                >
                  {opt === 'public' ? <Globe size={10} /> : <Lock size={10} />}
                  {opt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center justify-between py-[13px] border-b border-[var(--border)]">
              <div className="flex items-center gap-[10px]">
                <Github size={15} className="text-[var(--t2)] w-5" />
                <div>
                  <div className="font-mono text-xs text-[var(--t1)]">GitHub</div>
                  <div className="font-mono text-[10px] text-[var(--t3)] mt-0.5">Connected as @alex_xu</div>
                </div>
              </div>
              <span className="font-mono text-[11px] text-[var(--green)]">✓ LINKED</span>
            </div>
            <div className="flex items-center justify-between py-[13px]">
              <div className="flex items-center gap-[10px]">
                <span className="text-[15px] w-5 text-center font-bold">G</span>
                <div>
                  <div className="font-mono text-xs text-[var(--t1)]">Google</div>
                  <div className="font-mono text-[10px] text-[var(--t3)] mt-0.5">Not connected</div>
                </div>
              </div>
              <button className="font-mono text-[11px] text-[var(--accent)]">CONNECT →</button>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="mx-5 mt-5 mb-8 flex items-center justify-center gap-2 py-[13px] border border-[rgba(244,63,94,0.2)] rounded-lg bg-[rgba(244,63,94,0.06)] font-mono text-xs font-bold tracking-[0.07em] text-[var(--red)] transition-all hover:bg-[rgba(244,63,94,0.12)] hover:border-[rgba(244,63,94,0.4)]"
        >
          <LogOut size={14} /> SIGN_OUT
        </button>
      </div>

      {/* ── BYTES MODAL ── */}
      <AnimatePresence>
        {showBytesModal && !selectedByte && (
          <>
            <motion.div key="bytes-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-[80] bg-black/50 backdrop-blur-[2px]" onClick={() => setShowBytesModal(false)} />
            <motion.div key="bytes-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="absolute bottom-0 left-0 right-0 z-[81] bg-[var(--bg-card)] border-t border-[var(--border)] rounded-t-2xl max-h-[75vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 rounded-full bg-[var(--border-m)]" /></div>
              <div className="flex items-center justify-between px-5 py-2 flex-shrink-0 border-b border-[var(--border)]">
                <span className="font-mono text-xs font-bold tracking-[0.08em]">MY BYTES ({myBytes.length})</span>
                <button onClick={() => setShowBytesModal(false)} className="text-[var(--t3)] hover:text-[var(--t1)]"><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
                {myBytes.map(byte => (
                  <button key={byte.id} onClick={() => setSelectedByte(byte)}
                    className="w-full text-left px-5 py-3.5 hover:bg-[var(--bg-el)] transition-colors"
                  >
                    <div className="font-mono text-[11px] font-bold text-[var(--t1)] line-clamp-1">{byte.title}</div>
                    <div className="font-mono text-[9px] text-[var(--t2)] mt-0.5 line-clamp-2 leading-relaxed">{byte.body}</div>
                    <div className="flex gap-3 mt-1.5 font-mono text-[8px] text-[var(--t3)]">
                      <span>❤ {byte.likes ?? 0}</span><span>💬 {byte.comments ?? 0}</span><span>{byte.createdAt}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── BYTE DETAIL (from bytes modal) ── */}
      <AnimatePresence>
        {selectedByte && (
          <>
            <motion.div key="detail-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-[82] bg-black/50 backdrop-blur-[2px]" onClick={() => setSelectedByte(null)} />
            <motion.div key="detail-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="absolute bottom-0 left-0 right-0 z-[83] bg-[var(--bg-card)] border-t border-[var(--border)] rounded-t-2xl max-h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 rounded-full bg-[var(--border-m)]" /></div>
              <div className="flex items-center gap-3 px-5 py-2 flex-shrink-0 border-b border-[var(--border)]">
                <button onClick={() => setSelectedByte(null)} className="font-mono text-[10px] text-[var(--accent)]">← BACK</button>
                <span className="font-mono text-[11px] font-bold text-[var(--t1)] flex-1 truncate">{selectedByte.title}</span>
                <button onClick={() => { setSelectedByte(null); setShowBytesModal(false); router.push(`/post/${selectedByte.id}`) }}
                  className="font-mono text-[9px] px-3 py-1.5 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[#2563eb] text-white">
                  VIEW FULL →
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <p className="text-sm text-[var(--t2)] leading-relaxed">{selectedByte.body}</p>
                <div className="flex gap-3 mt-4 font-mono text-[10px] text-[var(--t3)]">
                  <span>❤ {selectedByte.likes ?? 0}</span><span>💬 {selectedByte.comments ?? 0}</span><span>{selectedByte.createdAt}</span>
                </div>
                {selectedByte.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {selectedByte.tags.map(t => (
                      <span key={t} className="font-mono text-[8px] px-2 py-1 rounded border border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg-el)]">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── FOLLOWERS / FOLLOWING PEOPLE SHEET ── */}
      <AnimatePresence>
        {peopleSheet && !miniProfilePerson && (
          <>
            <motion.div key="people-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-[80] bg-black/50 backdrop-blur-[2px]" onClick={() => setPeopleSheet(null)} />
            <motion.div key="people-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="absolute bottom-0 left-0 right-0 z-[81] bg-[var(--bg-card)] border-t border-[var(--border)] rounded-t-2xl max-h-[75vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 rounded-full bg-[var(--border-m)]" /></div>
              <div className="flex items-center justify-between px-5 py-2 flex-shrink-0 border-b border-[var(--border)]">
                <span className="font-mono text-xs font-bold tracking-[0.08em]">
                  {peopleSheet.type === 'followers' ? 'FOLLOWERS' : 'FOLLOWING'} ({peopleSheet.list.length})
                </span>
                <button onClick={() => setPeopleSheet(null)} className="text-[var(--t3)] hover:text-[var(--t1)]"><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
                {peopleSheet.list.length === 0 ? (
                  <div className="flex items-center justify-center py-12 font-mono text-[10px] text-[var(--t3)]">
                    No {peopleSheet.type} yet
                  </div>
                ) : peopleSheet.list.map(person => (
                  <button key={person.id} onClick={() => setMiniProfilePerson(person)}
                    className="w-full text-left flex items-center gap-3 px-5 py-3 hover:bg-[var(--bg-el)] transition-colors"
                  >
                    <Avatar
                      initials={person.displayName?.[0]?.toUpperCase() ?? person.username[0].toUpperCase()}
                      imageUrl={person.avatarUrl}
                      size="sm"
                      variant="cyan"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[11px] font-bold text-[var(--t1)]">{person.displayName || person.username}</div>
                      <div className="font-mono text-[10px] text-[var(--accent)]">@{person.username}</div>
                      {person.bio && <div className="font-mono text-[9px] text-[var(--t3)] truncate mt-0.5">{person.bio}</div>}
                    </div>
                    <span className="font-mono text-[9px] text-[var(--t3)]">→</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mini profile for a person in followers/following */}
      {miniProfilePerson && (
        <UserMiniProfile
          userId={miniProfilePerson.id}
          username={miniProfilePerson.username}
          displayName={miniProfilePerson.displayName}
          initials={miniProfilePerson.displayName?.[0]?.toUpperCase() ?? miniProfilePerson.username[0].toUpperCase()}
          avatarUrl={miniProfilePerson.avatarUrl}
          onClose={() => setMiniProfilePerson(null)}
        />
      )}
    </PhoneFrame>
  )
}
