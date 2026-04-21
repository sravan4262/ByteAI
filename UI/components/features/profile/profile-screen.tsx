"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Pencil, Globe, Lock, Github, Plus, Bookmark, X, Check, User, Hash, Briefcase, SlidersHorizontal, Bell, Camera, Trash2, Heart, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { Avatar } from '@/components/layout/avatar'
import { SearchableDropdown } from '@/components/ui/searchable-dropdown'
import { useAuth } from '@/hooks/use-auth'

import * as api from '@/lib/api'
import { getMeCache } from '@/lib/user-cache'

const themes = [
  { id: 'dark',   label: 'DARK',   color: '#05050e' },
  { id: 'light',  label: 'LIGHT',  color: '#f4f5fb' },
  { id: 'hacker', label: 'HACKER', color: '#001200' },
  { id: 'nord',   label: 'NORD',   color: '#1a1e2e' },
]
import type { TechStackResponse, Post, InterviewWithQuestions, UserResponse, SocialLinkResponse, PersonResult, DraftResponse } from '@/lib/api'
import { UserMiniProfile } from '@/components/features/profile/user-mini-profile'
import { setMeCache } from '@/lib/user-cache'

// ─── Badge types ──────────────────────────────────────────────────────────────

type Badge = { name: string; label: string; icon: string; earned: boolean; description?: string; earnedAt?: string }

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

function BadgeCard({ badge, index, forceOpen, onClose, isNext }: { badge: Badge; index: number; forceOpen?: boolean; onClose?: () => void; isNext?: boolean }) {
  const [open, setOpen] = useState(false)
  const isFirst = badge.name === 'first_byte' && badge.earned
  useEffect(() => { if (forceOpen) setOpen(true) }, [forceOpen])
  const handleClose = () => { setOpen(false); onClose?.() }

  return (
    <>
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
            : isNext
              ? 'border-[rgba(34,211,238,0.3)] bg-[rgba(34,211,238,0.04)]'
              : 'border-[var(--border)] bg-[rgba(255,255,255,0.015)]'
        }`}
        style={{ animationDelay: badge.earned ? `${index * 0.45}s` : undefined }}
      >
        {badge.earned && <div className="absolute inset-0 pointer-events-none animate-badge-shine" />}

        {badge.earned ? (
          <motion.span className="text-[26px] relative z-10 leading-none select-none"
            animate={isFirst ? { rotate: [0, -6, 6, -3, 3, 0] } : {}}
            transition={{ duration: 0.8, delay: 0.5, repeat: isFirst ? Infinity : 0, repeatDelay: 6 }}>
            {badge.icon}
          </motion.span>
        ) : (
          <div className="relative leading-none select-none">
            <span className="text-[26px] opacity-20 grayscale blur-[1px]">{badge.icon}</span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-[var(--bg-el)] border border-[var(--border-m)] flex items-center justify-center shadow-lg">
                <Lock size={9} className="text-[var(--t3)]" />
              </div>
            </div>
          </div>
        )}

        <span className={`font-mono text-[10px] font-semibold text-center leading-tight relative z-10 ${
          badge.earned ? 'text-[rgba(251,191,36,0.85)]' : isNext ? 'text-[var(--cyan)]' : 'text-[var(--t2)]'
        }`}>
          {badge.earned ? badge.name : isNext ? badge.label : '???'}
        </span>

        {badge.earned && (
          <span className="font-mono text-[10px] text-[rgba(251,191,36,0.5)] tracking-[0.06em] relative z-10">
            {isFirst ? '✦ FIRST' : '✓ EARNED'}
          </span>
        )}
        {!badge.earned && (
          <span className={`font-mono text-[10px] tracking-[0.06em] ${isNext ? 'text-[var(--cyan)]' : 'text-[var(--t3)]'}`}>
            {isNext ? '▶ NEXT' : 'LOCKED'}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div key="badge-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }} className="fixed inset-0 z-[200] flex items-center justify-center" onClick={handleClose}>
            <motion.div initial={{ backdropFilter: 'blur(0px)', backgroundColor: 'transparent' }}
              animate={{ backdropFilter: 'blur(12px)', backgroundColor: 'var(--bg-o75)' }}
              exit={{ backdropFilter: 'blur(0px)', backgroundColor: 'transparent' }} className="absolute inset-0" />
            {badge.earned ? (
              <div className="relative flex items-center justify-center" onClick={(e) => { e.stopPropagation(); handleClose() }}>
                {PARTICLES.map((p, pi) => (
                  <motion.div key={pi} className="absolute rounded-full pointer-events-none"
                    style={{ width: p.size, height: p.size, backgroundColor: p.color, top: '50%', left: '50%', marginTop: -p.size / 2, marginLeft: -p.size / 2 }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: p.x, y: p.y, opacity: 0, scale: 0 }}
                    transition={{ duration: 0.7 + p.delay, delay: p.delay, ease: [0.2, 0, 0.8, 1] }} />
                ))}
                {[1, 2, 3].map((ring) => (
                  <motion.div key={ring} className="absolute rounded-full border border-[rgba(251,191,36,0.4)] pointer-events-none"
                    style={{ width: 80, height: 80 }} initial={{ scale: 0.5, opacity: 0.8 }}
                    animate={{ scale: 1.5 + ring * 0.8, opacity: 0 }} transition={{ duration: 0.9, delay: ring * 0.12, ease: 'easeOut' }} />
                ))}
                <motion.div initial={{ scale: 0.4, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.5, opacity: 0, rotate: 8 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  onClick={handleClose}
                  className="relative flex flex-col items-center gap-4 px-10 py-8 bg-[var(--bg-card)] border border-[rgba(251,191,36,0.4)] rounded-2xl shadow-[0_0_60px_rgba(251,191,36,0.25),0_0_120px_rgba(251,191,36,0.1)] cursor-pointer">
                  <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none animate-badge-shine" />
                  <motion.div className="relative" animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}>
                    <div className="absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.35)_0%,transparent_70%)] blur-md" />
                    <span className="text-[56px] leading-none relative z-10">{badge.icon}</span>
                  </motion.div>
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="font-mono text-sm font-bold text-[rgba(251,191,36,0.95)] tracking-[0.12em]">{badge.name}</span>
                    <span className="font-mono text-xs text-[var(--t2)] text-center max-w-[200px] leading-relaxed">{badge.description ?? 'A rare achievement.'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(251,191,36,0.12)] border border-[rgba(251,191,36,0.3)]">
                    <span className="text-xs">✦</span>
                    <span className="font-mono text-xs text-[rgba(251,191,36,0.8)] tracking-[0.1em]">BADGE UNLOCKED</span>
                  </div>
                  <span className="font-mono text-xs text-[var(--t3)]">tap to close</span>
                </motion.div>
              </div>
            ) : (
              <motion.div initial={{ scale: 0.7, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 10 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                onClick={handleClose}
                className="relative flex flex-col items-center gap-4 px-10 py-8 bg-[var(--bg-card)] border border-[var(--border-m)] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] cursor-pointer mx-6">
                <motion.div animate={{ x: [0, -6, 6, -4, 4, -2, 2, 0] }} transition={{ duration: 0.5, delay: 0.15 }}
                  className="w-14 h-14 rounded-full bg-[var(--bg-el)] border border-[var(--border-m)] flex items-center justify-center">
                  <Lock size={22} className="text-[var(--t3)]" />
                </motion.div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className="font-mono text-sm font-bold text-[var(--t2)] tracking-[0.1em]">LOCKED</span>
                  <span className="font-mono text-xs text-[var(--t3)] text-center max-w-[200px] leading-relaxed">Keep building to unlock this badge.</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-el)] border border-[var(--border-m)]">
                  <span className="font-mono text-xs text-[var(--t3)] tracking-[0.1em]">🔒 NOT YET EARNED</span>
                </div>
                <span className="font-mono text-xs text-[var(--t3)]">tap to close</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Profile nav ──────────────────────────────────────────────────────────────

type ProfileTab = 'profile' | 'bytes' | 'interviews' | 'prefs' | 'alerts'

const PROFILE_NAV: { id: ProfileTab; icon: React.ElementType; label: string; color: string; activeBg: string }[] = [
  { id: 'profile',    icon: User,              label: 'PROFILE', color: 'var(--accent)', activeBg: 'rgba(59,130,246,0.1)'  },
  { id: 'bytes',      icon: Hash,              label: 'BYTES',   color: 'var(--cyan)',   activeBg: 'rgba(34,211,238,0.08)' },
  { id: 'interviews', icon: Briefcase,         label: 'INTRVW',  color: 'var(--purple)', activeBg: 'rgba(168,85,247,0.08)' },
  { id: 'prefs',      icon: SlidersHorizontal, label: 'PREFS',   color: 'var(--green)',  activeBg: 'rgba(16,217,160,0.08)' },
  { id: 'alerts',     icon: Bell,              label: 'ALERTS',  color: 'var(--orange)', activeBg: 'rgba(249,115,22,0.08)' },
]

// ─── Main component ────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const { logout, user: authUser } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<ProfileTab>('profile')
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null)
  const [userLoading, setUserLoading] = useState(true)

  // Content tabs
  type BytesSubTab = 'posted' | 'saved' | 'drafts'
  type InterviewsSubTab = 'posted' | 'saved'
  const [bytesTab, setBytesTab] = useState<BytesSubTab>('posted')
  const [interviewsTab, setInterviewsTab] = useState<InterviewsSubTab>('posted')

  const [activeTheme, setActiveTheme] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('byteai_theme') ?? 'dark'
    return 'dark'
  })
  const [techStack, setTechStack] = useState<string[]>([])

  // Lookup data
  const [allTechStacks, setAllTechStacks] = useState<TechStackResponse[]>([])
  const [addingTech, setAddingTech] = useState(false)
  const [selectedTechToAdd, setSelectedTechToAdd] = useState<string | null>(null)

  // Content data
  const [myBytes, setMyBytes] = useState<Post[]>([])
  const [myInterviews, setMyInterviews] = useState<InterviewWithQuestions[]>([])
  const [savedBytes, setSavedBytes] = useState<Post[]>([])
  const [savedInterviews, setSavedInterviews] = useState<InterviewWithQuestions[]>([])
  const [myDrafts, setMyDrafts] = useState<DraftResponse[]>([])
  const [loadingDrafts, setLoadingDrafts] = useState(false)
  const [loadingContent, setLoadingContent] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmDeleteDraft, setConfirmDeleteDraft] = useState<string | null>(null)

  // Edit profile
  const [editMode, setEditMode] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editForm, setEditForm] = useState({ username: '', displayName: '', bio: '', company: '', roleTitle: '', github: '', linkedin: '', websites: [''], customAvatarUrl: '' })
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarZoom, setAvatarZoom] = useState(1)
  const [showCropModal, setShowCropModal] = useState(false)
  const [cropStagingZoom, setCropStagingZoom] = useState(1)

  // Social links
  const [socialLinks, setSocialLinks] = useState<SocialLinkResponse[]>([])

  // Auto-pop badge celebration
  const [autoShowBadge, setAutoShowBadge] = useState<Badge | null>(null)

  // Notification / privacy
  const [notifications, setNotifications] = useState({ reactions: true, comments: true, newFollowers: true, unfollows: true })
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public')

  // People sheets
  const [peopleSheet, setPeopleSheet] = useState<{ type: 'followers' | 'following'; list: PersonResult[] } | null>(null)
  const [miniProfilePerson, setMiniProfilePerson] = useState<PersonResult | null>(null)

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    api.getCurrentUser().then((user) => {
      if (user) {
        setCurrentUser(user)
        if (user.techStack) setTechStack(user.techStack)
      }
      setUserLoading(false)
    })
    api.getMySocials().then(setSocialLinks)
    api.getMyPreferences().then((prefs) => {
      if (!prefs) return
      setActiveTheme(prefs.theme)
      setPrivacy(prefs.visibility as 'public' | 'private')
      setNotifications({ reactions: prefs.notifReactions, comments: prefs.notifComments, newFollowers: prefs.notifFollowers, unfollows: prefs.notifUnfollows })
    })
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') api.getCurrentUser().then((user) => { if (user) setCurrentUser(user) })
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => {
    api.getTechStacks().then(setAllTechStacks)
  }, [])

  useEffect(() => {
    setLoadingContent(true)
    Promise.all([api.getMyBytes(), api.getMyInterviews(), api.getMyBookmarks(), api.getMyInterviewBookmarks()]).then(([myB, myI, savedB, savedI]) => {
      setMyBytes(myB.posts); setMyInterviews(myI.interviews); setSavedBytes(savedB.posts); setSavedInterviews(savedI.interviews)
      setLoadingContent(false)
    })
  }, [])

  // Merge + sort badges (earned first)
  const mergedBadges: Badge[] = ALL_BADGES
    .map((b) => {
      const earned = (currentUser?.badges ?? []).find((ab) => ab.name === b.name)
      return earned ? { ...b, earned: true, description: earned.description ?? b.description, earnedAt: earned.earnedAt } : { ...b, earned: false }
    })
    .sort((a, b) => (a.earned === b.earned ? 0 : a.earned ? -1 : 1))

  // Auto-pop newly earned badge
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

  // ── Handlers ────────────────────────────────────────────────────────────────

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

  const handleUnsaveByte = async (id: string) => {
    await api.toggleBookmark(id, 'byte')
    setSavedBytes((prev) => prev.filter((p) => p.id !== id))
    toast.success('Removed from saved')
  }

  const handleUnsaveInterview = async (id: string) => {
    await api.toggleBookmark(id, 'interview')
    setSavedInterviews((prev) => prev.filter((i) => i.id !== id))
    toast.success('Removed from saved')
  }

  const handleLoadDrafts = async () => {
    setLoadingDrafts(true)
    try { const drafts = await api.getMyDrafts(); setMyDrafts(drafts) }
    finally { setLoadingDrafts(false) }
  }

  const handleDeleteDraft = async (id: string) => {
    await api.deleteDraft(id)
    setMyDrafts((prev) => prev.filter((d) => d.id !== id))
    setConfirmDeleteDraft(null)
    toast.success('Draft deleted')
  }

  const handleRemoveTech = async (tech: string) => {
    const next = techStack.filter((t) => t !== tech); setTechStack(next); await api.updateTechStack(next)
  }

  const handleAddTech = async (tech: string | null) => {
    if (!tech || techStack.includes(tech)) { setAddingTech(false); setSelectedTechToAdd(null); return }
    const next = [...techStack, tech]; setTechStack(next); setAddingTech(false); setSelectedTechToAdd(null)
    await api.updateTechStack(next)
  }

  const handleThemeChange = async (theme: string) => {
    setActiveTheme(theme)
    const html = document.documentElement
    html.classList.remove('theme-light', 'theme-hacker', 'theme-nord')
    if (theme !== 'dark') html.classList.add(`theme-${theme}`)
    if (theme === 'light') html.classList.remove('dark'); else html.classList.add('dark')
    localStorage.setItem('byteai_theme', theme)
    await api.updateTheme(theme)
  }

  const handleNotificationChange = async (key: keyof typeof notifications) => {
    const next = { ...notifications, [key]: !notifications[key] }
    setNotifications(next)
    const apiMap: Record<string, string> = { reactions: 'notifReactions', comments: 'notifComments', newFollowers: 'notifFollowers', unfollows: 'notifUnfollows' }
    await api.updateNotificationSettings({ [apiMap[key]]: next[key] } as Parameters<typeof api.updateNotificationSettings>[0])
  }

  const handlePrivacyChange = async (value: 'public' | 'private') => {
    setPrivacy(value); await api.updatePrivacy(value)
  }

  const handleLogout = async () => {
    await logout(); toast.success('Signed out')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'Escape') {
        e.preventDefault()
        handleLogout()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Canvas-based zoom crop — works with object URLs (new file) and http URLs (existing photo)
  function applyZoomCrop(imageUrl: string, zoom: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 512; canvas.height = 512
        const srcSize = Math.min(img.width, img.height) / zoom
        const srcX = (img.width - srcSize) / 2
        const srcY = (img.height - srcSize) / 2
        canvas.getContext('2d')!.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, 512, 512)
        canvas.toBlob(
          blob => blob ? resolve(new File([blob], 'avatar.webp', { type: 'image/webp' })) : reject(new Error('Canvas toBlob failed')),
          'image/webp', 0.9
        )
      }
      img.onerror = () => reject(new Error('Image load failed'))
      img.src = imageUrl
    })
  }

  const openEditProfile = () => {
    const github = socialLinks.find((s) => s.platform === 'github')?.url ?? ''
    const linkedin = socialLinks.find((s) => s.platform === 'linkedin')?.url ?? ''
    const websiteUrls = socialLinks.filter((s) => s.platform === 'website').map((s) => s.url)
    setEditForm({ username: currentUser?.username ?? '', displayName: currentUser?.displayName ?? '', bio: currentUser?.bio ?? '', company: currentUser?.company ?? '', roleTitle: currentUser?.roleTitle ?? '', github, linkedin, websites: websiteUrls.length > 0 ? websiteUrls : [''], customAvatarUrl: currentUser?.avatarUrl ?? '' })
    setPendingAvatarFile(null)
    // Seed existing uploaded photo so the thumbnail shows on open
    setAvatarPreview(currentUser?.avatarUrl?.startsWith('http') ? currentUser.avatarUrl : null)
    setAvatarZoom(1)
    setCropStagingZoom(1)
    setEditMode(true)
  }

  const handleSaveProfile = async () => {
    setEditSaving(true)
    try {
      // Determine final avatar URL — apply canvas crop if new file or zoom was changed
      let finalAvatarUrl = editForm.customAvatarUrl === '__upload__' ? (currentUser?.avatarUrl ?? '') : editForm.customAvatarUrl
      let didUpload = false

      if (avatarPreview && (pendingAvatarFile || avatarZoom !== 1)) {
        // New file selected OR existing photo zoomed — crop via canvas then upload
        try {
          const croppedFile = await applyZoomCrop(avatarPreview, avatarZoom)
          finalAvatarUrl = await api.uploadAvatar(croppedFile)
          didUpload = true
        } catch {
          toast.error('Photo upload failed — profile saved without it')
          finalAvatarUrl = currentUser?.avatarUrl ?? ''
        }
      } else if (avatarPreview?.startsWith('http') && !pendingAvatarFile) {
        // Existing photo, zoom unchanged — keep as is without re-uploading
        finalAvatarUrl = avatarPreview
      }

      try {
        await Promise.all([
          api.updateProfile({ username: editForm.username.trim() || undefined, displayName: editForm.displayName.trim() || undefined, bio: editForm.bio.trim() || null, company: editForm.company.trim() || null, roleTitle: editForm.roleTitle.trim() || null, customAvatarUrl: didUpload ? undefined : finalAvatarUrl }),
          api.updateMySocials([
            { platform: 'github', url: editForm.github.trim(), label: editForm.github.trim() ? editForm.github.replace(/^https?:\/\/(www\.)?github\.com\//, 'github/') : '' },
            { platform: 'linkedin', url: editForm.linkedin.trim(), label: 'linkedin' },
            ...editForm.websites.map((w) => w.trim()).filter(Boolean).map((url) => ({ platform: 'website', url, label: url.replace(/^https?:\/\//, '') })),
          ].filter((s) => s.url)),
        ])

        const [updatedUser, updatedSocials] = await Promise.all([api.getCurrentUser(), api.getMySocials()])
        if (updatedUser) {
          setCurrentUser(updatedUser)
          setMeCache({ userId: updatedUser.id, username: updatedUser.username, displayName: updatedUser.displayName, avatarUrl: updatedUser.avatarUrl, bio: updatedUser.bio, roleTitle: updatedUser.roleTitle, company: updatedUser.company, level: updatedUser.level, bytesCount: myBytes.length, followersCount: updatedUser.followersCount ?? 0, followingCount: updatedUser.followingCount ?? 0, isVerified: updatedUser.isVerified })
        }
        setSocialLinks(updatedSocials)
        setPendingAvatarFile(null)
        setAvatarPreview(null)
        setAvatarZoom(1)
        setEditMode(false)
        toast.success('Profile updated')
      } catch {
        toast.error("Profile couldn't be saved. Please try again.")
      }
    } finally {
      setEditSaving(false)
    }
  }

  // ── XP level meta ──────────────────────────────────────────────────────────

  const LEVEL_META: Record<number, { name: string; icon: string; xpRequired: number }> = {
    1:  { name: 'NEWCOMER',    icon: '🌱', xpRequired: 0     },
    2:  { name: 'EXPLORER',    icon: '🔭', xpRequired: 500   },
    3:  { name: 'CONTRIBUTOR', icon: '⚙️',  xpRequired: 1500  },
    4:  { name: 'BUILDER',     icon: '🔨', xpRequired: 3000  },
    5:  { name: 'CRAFTSMAN',   icon: '🛠️',  xpRequired: 5000  },
    6:  { name: 'SPECIALIST',  icon: '🎯', xpRequired: 8000  },
    7:  { name: 'EXPERT',      icon: '🧠', xpRequired: 12000 },
    8:  { name: 'MENTOR',      icon: '📚', xpRequired: 18000 },
    9:  { name: 'AUTHORITY',   icon: '🏆', xpRequired: 25000 },
    10: { name: 'LEGEND',      icon: '⭐', xpRequired: 35000 },
    11: { name: 'GRANDMASTER', icon: '👑', xpRequired: 50000 },
    12: { name: 'PIONEER',     icon: '🚀', xpRequired: 75000 },
  }

  const techStackOptions = allTechStacks.filter((t) => !techStack.includes(t.name)).map((t) => ({ value: t.name, label: t.label || t.name }))

  // ── Section renders ────────────────────────────────────────────────────────

  const lvl     = currentUser?.level ?? 1
  const xp      = currentUser?.xp ?? 0
  const curMeta = LEVEL_META[lvl] ?? LEVEL_META[1]
  const nxtMeta = LEVEL_META[lvl + 1]
  const xpInLvl = xp - curMeta.xpRequired
  const xpNeeded = nxtMeta ? nxtMeta.xpRequired - curMeta.xpRequired : 1
  const pct      = nxtMeta ? Math.min(100, Math.round((xpInLvl / xpNeeded) * 100)) : 100
  const xpToGo   = nxtMeta ? Math.max(0, nxtMeta.xpRequired - xp) : 0

  const hasGithub   = !!socialLinks.find(s => s.platform === 'github')
  const hasLinkedin = !!socialLinks.find(s => s.platform === 'linkedin')
  const githubLink  = socialLinks.find(s => s.platform === 'github')
  const linkedinLink = socialLinks.find(s => s.platform === 'linkedin')
  const websiteLinks = socialLinks.filter(s => s.platform === 'website')
  const firstLockedIdx = mergedBadges.findIndex(b => !b.earned)

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <PhoneFrame>
      {/* ── EDIT PROFILE DRAWER ── */}
      {editMode && (
        <div className="absolute inset-0 z-50 flex flex-col">
          <div className="flex-1 bg-[var(--bg-o70)] backdrop-blur-sm" onClick={() => setEditMode(false)} />
          <div className="bg-[var(--bg-card)] border-t border-[var(--border-h)] rounded-t-2xl flex flex-col max-h-[90%] overflow-hidden shadow-[0_-16px_64px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--border-h)] flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold tracking-[0.1em]">EDIT_PROFILE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleSaveProfile} disabled={editSaving}
                  className="flex items-center gap-1.5 font-mono text-xs font-semibold px-4 py-[7px] rounded-full bg-gradient-to-r from-[var(--accent)] to-[#2563eb] text-white tracking-[0.06em] disabled:opacity-50 transition-all hover:shadow-[0_0_16px_var(--accent-glow)]">
                  {editSaving ? <span className="animate-pulse">SAVING...</span> : <><Check size={11} />SAVE</>}
                </button>
                <button onClick={() => setEditMode(false)} className="w-7 h-7 rounded-full bg-[var(--bg-el)] border border-[var(--border-h)] flex items-center justify-center hover:border-[var(--red)] hover:text-[var(--red)] transition-all">
                  <X size={12} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)] px-5 py-4 flex flex-col gap-4">
              {/* Avatar selection */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.08em]">AVATAR</span>
                </div>
                <div className="flex flex-col gap-4">

                  {/* ── Row 1: Provider photo ── */}
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] text-[var(--t2)] tracking-[0.06em]">PROVIDER PHOTO</span>
                    <button type="button"
                      onClick={() => { const providerUrl = authUser?.user_metadata?.avatar_url ?? ''; setPendingAvatarFile(null); setAvatarPreview(providerUrl || null); setAvatarZoom(1); setEditForm(f => ({ ...f, customAvatarUrl: providerUrl })) }}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border-2 transition-all w-fit ${editForm.customAvatarUrl === (authUser?.user_metadata?.avatar_url ?? '') && !pendingAvatarFile ? 'border-[var(--cyan)] bg-[rgba(34,211,238,0.08)]' : 'border-[var(--border-m)] hover:border-[var(--border-h)]'}`}>
                      {authUser?.user_metadata?.avatar_url
                        ? <img src={authUser.user_metadata.avatar_url} alt="provider" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                        : <div className="w-8 h-8 rounded-full bg-[var(--bg-el)] border border-[var(--border-m)] flex items-center justify-center font-mono text-xs text-[var(--t2)]">{(currentUser?.displayName ?? '?')[0]}</div>
                      }
                      <span className="font-mono text-xs text-[var(--t1)]">Use my Google / GitHub photo</span>
                      {editForm.customAvatarUrl === (authUser?.user_metadata?.avatar_url ?? '') && !pendingAvatarFile && <Check size={12} className="text-[var(--cyan)] ml-1" />}
                    </button>
                  </div>

                  {/* ── Row 2: Dev avatars ── */}
                  <div className="flex flex-col gap-1.5">
                    <span className="font-mono text-[10px] text-[var(--t2)] tracking-[0.06em]">DEV AVATAR</span>
                    <div className="flex gap-2 flex-wrap">
                      {['🤖', '👾', '🦾', '🧑‍💻', '🐙', '⚡', '🚀', '🛸'].map(emoji => (
                        <button key={emoji} type="button"
                          onClick={() => { setPendingAvatarFile(null); setAvatarPreview(null); setEditForm(f => ({ ...f, customAvatarUrl: emoji })) }}
                          className={`w-11 h-11 rounded-xl text-2xl flex items-center justify-center border-2 transition-all ${editForm.customAvatarUrl === emoji && !pendingAvatarFile ? 'border-[var(--cyan)] bg-[rgba(34,211,238,0.1)]' : 'border-[var(--border-m)] hover:border-[var(--border-h)]'}`}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Row 3: Upload photo ── */}
                  <div className="flex flex-col gap-2">
                    <span className="font-mono text-[10px] text-[var(--t2)] tracking-[0.06em]">UPLOAD PHOTO</span>
                    <div className="flex items-center gap-3">
                      <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all font-mono text-xs font-bold w-fit ${pendingAvatarFile || avatarPreview ? 'border-[var(--green)] bg-[rgba(16,217,160,0.08)] text-[var(--green)]' : 'border-[var(--accent)] bg-[rgba(59,130,246,0.08)] text-[var(--accent)] hover:bg-[rgba(59,130,246,0.14)]'}`}>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            setPendingAvatarFile(file)
                            setAvatarPreview(URL.createObjectURL(file))
                            setCropStagingZoom(1)
                            setAvatarZoom(1)
                            setShowCropModal(true)
                            setEditForm(f => ({ ...f, customAvatarUrl: '__upload__' }))
                          }} />
                        <Camera size={13} />
                        {pendingAvatarFile || avatarPreview ? 'CHANGE PHOTO' : 'CHOOSE FROM DEVICE'}
                      </label>

                      {/* Confirmed thumbnail + edit/remove */}
                      {avatarPreview && (
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => { setCropStagingZoom(avatarZoom); setShowCropModal(true) }}
                            className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-[var(--green)] flex-shrink-0 group">
                            <img src={avatarPreview} alt="preview" className="w-full h-full object-cover"
                              style={{ transform: `scale(${avatarZoom})`, transformOrigin: 'center' }} />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Pencil size={10} className="text-white" />
                            </div>
                          </button>
                          <button type="button"
                            onClick={() => { setPendingAvatarFile(null); setAvatarPreview(null); setAvatarZoom(1); setEditForm(f => ({ ...f, customAvatarUrl: '' })) }}
                            className="font-mono text-[10px] text-[var(--red)] hover:opacity-80">
                            <X size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Username */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.08em]">USERNAME</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[var(--t3)]">@</span>
                  <input value={editForm.username} onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                    placeholder="your_handle" maxLength={30}
                    className="w-full bg-[var(--bg-el)] border border-[var(--border-h)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)] rounded-lg pl-7 pr-3 py-2.5 font-mono text-xs text-[var(--t1)] placeholder:text-[var(--t2)] outline-none transition-all" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.08em]">DISPLAY_NAME</span>
                </div>
                <input value={editForm.displayName} onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="Your name" maxLength={60}
                  className="w-full bg-[var(--bg-el)] border border-[var(--border-h)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)] rounded-lg px-3 py-2.5 font-mono text-xs text-[var(--t1)] placeholder:text-[var(--t2)] outline-none transition-all" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.08em]">BIO</span>
                </div>
                <textarea value={editForm.bio} onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Tell the world what you build..." maxLength={280} rows={3}
                  className="w-full bg-[var(--bg-el)] border border-[var(--border-h)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)] rounded-lg px-3 py-2.5 font-mono text-xs text-[var(--t1)] placeholder:text-[var(--t2)] outline-none transition-all resize-none leading-relaxed" />
                <div className="text-right font-mono text-xs text-[var(--t3)] mt-0.5">{editForm.bio.length}/280</div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.08em]">ROLE_TITLE @ COMPANY</span>
                </div>
                <div className="flex items-center gap-2">
                  <input value={editForm.roleTitle} onChange={(e) => setEditForm((f) => ({ ...f, roleTitle: e.target.value }))} placeholder="Sr. Engineer" maxLength={40}
                    className="flex-1 bg-[var(--bg-el)] border border-[var(--border-h)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)] rounded-lg px-3 py-2.5 font-mono text-xs text-[var(--t1)] placeholder:text-[var(--t2)] outline-none transition-all" />
                  <span className="font-mono text-sm text-[var(--t2)] opacity-60 flex-shrink-0">@</span>
                  <input value={editForm.company} onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))} placeholder="company.io" maxLength={50}
                    className="flex-1 bg-[var(--bg-el)] border border-[var(--border-h)] focus:border-[var(--green)] focus:shadow-[0_0_0_3px_rgba(16,217,160,0.12)] rounded-lg px-3 py-2.5 font-mono text-xs text-[var(--t1)] placeholder:text-[var(--t2)] outline-none transition-all" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.08em]">SOCIAL_LINKS</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-[var(--bg)] border border-[var(--border-h)] flex items-center justify-center text-[var(--t2)]"><Github size={12} /></div>
                    <input value={editForm.github} onChange={(e) => setEditForm((f) => ({ ...f, github: e.target.value }))} placeholder="https://github.com/username"
                      className="flex-1 bg-[var(--bg-el)] border border-[var(--border-h)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)] rounded-lg px-3 py-2 font-mono text-xs text-[var(--t1)] placeholder:text-[var(--t2)] outline-none transition-all" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-[var(--bg)] border border-[var(--border-h)] flex items-center justify-center text-[var(--t2)]"><span className="font-bold text-sm">in</span></div>
                    <input value={editForm.linkedin} onChange={(e) => setEditForm((f) => ({ ...f, linkedin: e.target.value }))} placeholder="https://linkedin.com/in/username"
                      className="flex-1 bg-[var(--bg-el)] border border-[var(--border-h)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)] rounded-lg px-3 py-2 font-mono text-xs text-[var(--t1)] placeholder:text-[var(--t2)] outline-none transition-all" />
                  </div>
                  {editForm.websites.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-[var(--bg)] border border-[var(--border-h)] flex items-center justify-center text-[var(--t2)]"><Globe size={12} /></div>
                      <input value={url} onChange={(e) => { const next = [...editForm.websites]; next[idx] = e.target.value; setEditForm((f) => ({ ...f, websites: next })) }} placeholder="https://yoursite.dev"
                        className="flex-1 bg-[var(--bg-el)] border border-[var(--border-h)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)] rounded-lg px-3 py-2 font-mono text-xs text-[var(--t1)] placeholder:text-[var(--t2)] outline-none transition-all" />
                      {editForm.websites.length > 1 && (
                        <button type="button" onClick={() => setEditForm((f) => ({ ...f, websites: f.websites.filter((_, i) => i !== idx) }))} className="text-[var(--t3)] hover:text-red-400 transition-colors flex-shrink-0"><X size={14} /></button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setEditForm((f) => ({ ...f, websites: [...f.websites, ''] }))}
                    className="flex items-center gap-1.5 font-mono text-xs text-[var(--accent)] hover:underline mt-1 w-fit">
                    <Plus size={10} /> ADD WEBSITE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="flex items-center justify-between px-5 py-[13px] pb-[11px] border-b border-[var(--border-h)] flex-shrink-0 bg-[var(--bg-o92)] backdrop-blur-md">
        <div className="flex items-center gap-[9px]">
          <span className="font-mono text-sm text-[var(--cyan)] border-[1.5px] border-[var(--cyan)] rounded px-[5px] py-[2px] tracking-[0.05em] shadow-[0_0_10px_var(--cyan)]">{'</>'}</span>
          <span className="font-mono text-xs font-bold tracking-[0.1em]">PROFILE</span>
        </div>
        <div className="font-mono text-xs text-[var(--t2)] flex items-center gap-1.5">
          <span className="text-[var(--green)]">●</span> ONLINE
        </div>
      </header>

      {/* ── TWO-COLUMN BODY ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left nav */}
        <nav className="w-[68px] flex-shrink-0 flex flex-col gap-1 pt-1.5 pb-1 border-r border-[var(--border-h)] bg-[var(--bg-card)]">
          {PROFILE_NAV.map(({ id, icon: Icon, label }) => {
            const active = activeTab === id
            return (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center justify-center gap-1.5 py-3 mx-1.5 rounded-lg border transition-all relative ${
                  active
                    ? 'border-[var(--accent)] bg-[rgba(59,130,246,0.15)] text-[var(--accent)] shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                    : 'border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]'
                }`}>
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-[var(--accent)]" />}
                <Icon size={15} />
                <span className="font-mono text-[10px] font-bold tracking-[0.05em]">{label}</span>
              </button>
            )
          })}

          {/* Spacer + sign out at bottom */}
          <div className="flex-1" />
          <button onClick={handleLogout}
            className="flex flex-col items-center justify-center gap-1.5 py-3 mx-1.5 mb-1.5 rounded-lg border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(244,63,94,0.4)] hover:bg-[rgba(244,63,94,0.08)] hover:text-[var(--red)] transition-all group">
            <LogOut size={15} />
            <span className="font-mono text-[10px] font-bold tracking-[0.05em]">SIGN OUT</span>
            <span className="flex flex-col items-center gap-0 opacity-50 group-hover:opacity-80 transition-opacity">
              <span className="font-mono text-[9px] tracking-[0.04em]">Ctrl</span>
              <span className="font-mono text-[9px] font-black leading-none">+</span>
              <span className="font-mono text-[9px] tracking-[0.04em]">Shift</span>
              <span className="font-mono text-[9px] font-black leading-none">+</span>
              <span className="font-mono text-[9px] tracking-[0.04em]">Esc</span>
            </span>
          </button>
        </nav>

        {/* ── RIGHT CONTENT ── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">

          {/* ══ PROFILE TAB ══ */}
          {activeTab === 'profile' && (
            <div className="flex flex-col">

              {/* Hero */}
              <div className="p-4 border-b border-[var(--border-h)] bg-gradient-to-b from-[rgba(59,130,246,0.05)] to-transparent">
                <div className="flex items-start justify-between mb-3">
                  <div className="relative">
                    <div className="absolute -inset-[3px] rounded-full bg-[conic-gradient(from_0deg,var(--cyan),var(--accent),var(--purple),var(--cyan))] animate-spin-ring blur-[2px] opacity-70" />
                    <div className="relative w-[60px] h-[60px] rounded-full bg-gradient-to-br from-[#131b40] to-[#1e3580] border-2 border-[var(--border-h)] flex items-center justify-center font-mono text-[18px] font-bold text-[var(--cyan)] shadow-[0_0_24px_rgba(34,211,238,0.2)] overflow-hidden">
                      {(() => {
                        if (avatarPreview) return <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                        const customAvatar = currentUser?.avatarUrl
                        const isEmoji = customAvatar && !customAvatar.startsWith('http')
                        if (isEmoji) return <span className="text-[28px] leading-none select-none">{customAvatar}</span>
                        const imgSrc = customAvatar ?? getMeCache()?.avatarUrl ?? null
                        if (imgSrc) return <img src={imgSrc} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        return (currentUser?.displayName ?? '').split(' ').filter(w => /[a-zA-Z]/.test(w[0])).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
                      })()}
                    </div>
                    <div className="absolute bottom-0 right-0 w-[18px] h-[18px] rounded-full bg-[var(--accent)] border-2 border-[var(--bg)] flex items-center justify-center cursor-pointer">
                      <Pencil size={7} className="text-white" />
                    </div>
                  </div>
                  <button onClick={openEditProfile}
                    className="font-mono text-xs font-semibold tracking-[0.06em] px-3 py-[6px] rounded-full border border-[rgba(59,130,246,0.35)] text-[var(--accent)] bg-[rgba(59,130,246,0.1)] transition-all hover:bg-[rgba(59,130,246,0.18)]">
                    EDIT
                  </button>
                </div>

                {userLoading ? (
                  <div className="animate-pulse flex flex-col gap-1.5 mb-2">
                    <div className="h-4 w-32 bg-[var(--border-m)] rounded" />
                    <div className="h-3 w-20 bg-[var(--border)] rounded" />
                  </div>
                ) : (
                  <>
                    <div className="text-lg font-extrabold tracking-tight flex items-center gap-1.5">
                      {currentUser?.displayName ?? '—'}
                      <span className="text-[11px] text-[var(--accent)] drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]">✦</span>
                    </div>
                    <div className="font-mono text-[11px] text-[var(--t2)] mt-0.5">{currentUser?.username ? `@${currentUser.username}` : ''}</div>
                    {(currentUser?.roleTitle || currentUser?.company) && (
                      <div className="font-mono text-xs text-[var(--t2)] mt-0.5">
                        {currentUser.roleTitle}{currentUser.company && ` @ ${currentUser.company}`}
                      </div>
                    )}
                  </>
                )}

                {/* Bio */}
                <div className="mt-2.5 p-2.5 bg-[var(--bg-card)] border border-[var(--border-h)] rounded-lg">
                  <div className="font-mono text-xs text-[var(--t3)] mb-0.5">/*</div>
                  {userLoading ? (
                    <div className="animate-pulse flex flex-col gap-1"><div className="h-2 bg-[var(--border-m)] rounded w-full" /><div className="h-2 bg-[var(--border-m)] rounded w-4/5" /></div>
                  ) : (
                    <p className="text-xs leading-relaxed text-[var(--t2)]">{currentUser?.bio || <span className="text-[var(--t3)] italic">No bio yet.</span>}</p>
                  )}
                  <div className="font-mono text-xs text-[var(--t3)] mt-0.5">*/</div>
                </div>

                {/* Social links */}
                <div className="flex gap-1.5 flex-wrap mt-2.5">
                  {hasGithub && (
                    <a href={githubLink!.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-[4px] px-[8px] py-[4px] bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.3)] rounded-full font-mono text-[10px] text-[var(--accent)] transition-all hover:bg-[rgba(59,130,246,0.15)]">
                      <Github size={10} />{githubLink!.label || 'github'}
                    </a>
                  )}
                  {hasLinkedin && (
                    <a href={linkedinLink!.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-[4px] px-[8px] py-[4px] bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.3)] rounded-full font-mono text-[10px] text-[var(--accent)] transition-all hover:bg-[rgba(59,130,246,0.15)]">
                      <span className="font-bold text-[10px]">in</span>linkedin
                    </a>
                  )}
                  {websiteLinks.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-[4px] px-[8px] py-[4px] bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.3)] rounded-full font-mono text-[10px] text-[var(--accent)] transition-all hover:bg-[rgba(59,130,246,0.15)]">
                      <Globe size={10} />{link.label || link.url.replace(/^https?:\/\//, '')}
                    </a>
                  ))}
                  {(!hasGithub || !hasLinkedin || websiteLinks.length === 0) && (
                    <span className="font-mono text-[10px] text-[var(--t2)] self-center opacity-50">+ add links</span>
                  )}
                  {!hasGithub && (
                    <button onClick={openEditProfile} className="flex items-center gap-[4px] px-[8px] py-[4px] border border-[rgba(59,130,246,0.3)] rounded-full font-mono text-[10px] text-[var(--accent)] bg-[rgba(59,130,246,0.08)] transition-all hover:bg-[rgba(59,130,246,0.15)]">
                      <Github size={10} />+ GITHUB
                    </button>
                  )}
                  {!hasLinkedin && (
                    <button onClick={openEditProfile} className="flex items-center gap-[4px] px-[8px] py-[4px] border border-[rgba(59,130,246,0.3)] rounded-full font-mono text-[10px] text-[var(--accent)] bg-[rgba(59,130,246,0.08)] transition-all hover:bg-[rgba(59,130,246,0.15)]">
                      <span className="font-bold text-[10px]">in</span>+ LINKEDIN
                    </button>
                  )}
                  {websiteLinks.length === 0 && (
                    <button onClick={openEditProfile} className="flex items-center gap-[4px] px-[8px] py-[4px] border border-[rgba(59,130,246,0.3)] rounded-full font-mono text-[10px] text-[var(--accent)] bg-[rgba(59,130,246,0.08)] transition-all hover:bg-[rgba(59,130,246,0.15)]">
                      <Globe size={10} />+ WEBSITE
                    </button>
                  )}
                </div>
              </div>

              {/* XP Card */}
              <div className="mx-4 mt-4 rounded-xl border border-[rgba(34,211,238,0.22)] bg-gradient-to-br from-[rgba(34,211,238,0.08)] to-[rgba(59,130,246,0.05)] relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,0.14),transparent_65%)] pointer-events-none" />
                {userLoading ? (
                  <div className="p-3.5 flex flex-col gap-3 animate-pulse">
                    <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-[var(--border-m)]" /><div className="flex flex-col gap-1.5 flex-1"><div className="h-3 w-28 rounded bg-[var(--border-m)]" /><div className="h-2 w-16 rounded bg-[var(--border)]" /></div></div>
                    <div className="h-2 rounded-full bg-[var(--border-m)]" />
                  </div>
                ) : (
                  <div className="p-3.5 relative z-10">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[rgba(34,211,238,0.12)] border border-[rgba(34,211,238,0.25)] flex items-center justify-center text-[20px] shadow-[0_0_16px_rgba(34,211,238,0.2)]">{curMeta.icon}</div>
                        <div>
                          <div className="font-mono text-xs font-bold text-[var(--cyan)] tracking-[0.1em]">LVL {lvl} · {curMeta.name}</div>
                          <div className="font-mono text-xs text-[var(--t2)] mt-0.5">{xp.toLocaleString()} XP earned</div>
                        </div>
                      </div>
                      {nxtMeta && (
                        <div className="text-right">
                          <div className="font-mono text-[10px] text-[var(--t2)] leading-none mb-0.5">NEXT UP</div>
                          <div className="font-mono text-xs font-bold text-[var(--t1)] flex items-center gap-1 justify-end">{nxtMeta.icon} {nxtMeta.name}</div>
                        </div>
                      )}
                    </div>
                    <div className="relative h-2 bg-[var(--border-m)] rounded-full overflow-hidden border border-[var(--border)]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] via-[var(--cyan)] to-[var(--accent)] bg-[length:200%_100%] animate-xp-shimmer shadow-[0_0_8px_rgba(34,211,238,0.5)]" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="font-mono text-xs text-[var(--cyan)] font-bold">{pct}%</span>
                      {nxtMeta ? <span className="font-mono text-xs text-[var(--t2)]">{xpToGo.toLocaleString()} XP to go</span> : <span className="font-mono text-xs text-[var(--cyan)]">MAX LEVEL ✦</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 mx-4 mt-3 border border-[var(--border-h)] rounded-xl overflow-hidden">
                {[
                  { label: 'BYTES',     value: myBytes.length,                      clickable: true,  onClick: () => setActiveTab('bytes') },
                  { label: 'FOLLOWING', value: currentUser?.followingCount ?? '—',   clickable: true,  onClick: async () => { if (!currentUser) return; const list = await api.getFollowing(currentUser.id); setPeopleSheet({ type: 'following', list }) } },
                  { label: 'FOLLOWERS', value: currentUser?.followersCount ?? '—',   clickable: true,  onClick: async () => { if (!currentUser) return; const list = await api.getFollowers(currentUser.id); setPeopleSheet({ type: 'followers', list }) } },
                  { label: 'STREAK',    value: userLoading ? '…' : `🔥 ${currentUser?.streak ?? 0}`, clickable: false, isStreak: true },
                ].map((stat, i) => (
                  stat.clickable ? (
                    <button key={stat.label} onClick={stat.onClick}
                      className={`py-3 px-1 text-center bg-[var(--bg-card)] ${i < 3 ? 'border-r border-[var(--border-m)]' : ''} hover:bg-[var(--bg-el)] transition-colors`}>
                      <div className="font-mono text-base font-bold text-[var(--accent)]">{stat.value}</div>
                      <div className="font-mono text-[10px] tracking-[0.07em] text-[var(--t2)] mt-[3px] underline underline-offset-2">{stat.label}</div>
                    </button>
                  ) : (
                    <div key={stat.label} className={`py-3 px-1 text-center bg-[var(--bg-card)] ${i < 3 ? 'border-r border-[var(--border-m)]' : ''} ${'isStreak' in stat && stat.isStreak ? 'bg-gradient-to-br from-[rgba(16,217,160,0.06)] to-transparent' : ''}`}>
                      <div className={`font-mono text-base font-bold ${'isStreak' in stat && stat.isStreak ? 'text-[var(--green)]' : 'text-[var(--t1)]'}`}>{stat.value}</div>
                      <div className="font-mono text-[10px] tracking-[0.07em] text-[var(--t2)] mt-[3px]">{stat.label}</div>
                    </div>
                  )
                ))}
              </div>

              {/* Badges */}
              <div className="mt-4 px-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                    <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.08em]">BADGES</span>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--t2)]">{mergedBadges.filter(b => b.earned).length}/{mergedBadges.length} UNLOCKED</span>
                </div>
              </div>
              <div className="flex gap-2 px-4 pb-1 overflow-x-auto scrollbar-none">
                {mergedBadges.map((badge, i) => (
                  <BadgeCard key={badge.name} badge={badge} index={i}
                    forceOpen={autoShowBadge?.name === badge.name} onClose={() => setAutoShowBadge(null)}
                    isNext={i === firstLockedIdx} />
                ))}
              </div>

              {/* Account Visibility */}
              <div className="mx-4 mt-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.08em]">VISIBILITY</span>
                </div>
                <div className="flex gap-2">
                  {(['public', 'private'] as const).map((opt) => (
                    <button key={opt} onClick={() => handlePrivacyChange(opt)}
                      className={`flex-1 py-2 px-2 text-center border-[1.5px] rounded-lg font-mono text-xs transition-all flex items-center justify-center gap-1.5 ${
                        privacy === opt ? 'border-[var(--green)] text-[var(--green)] bg-[var(--green-d)]' : 'border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)]'
                      }`}>
                      {opt === 'public' ? <Globe size={11} /> : <Lock size={9} />}
                      {opt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ BYTES TAB ══ */}
          {activeTab === 'bytes' && (
            <div className="flex flex-col">
              {/* Sub-tabs */}
              <div className="flex gap-2 px-4 py-3 border-b border-[var(--border-h)] sticky top-0 bg-[var(--bg)] z-10">
                {([
                  { id: 'posted', label: 'POSTED', count: myBytes.length },
                  { id: 'saved',  label: 'SAVED',  count: savedBytes.length },
                  { id: 'drafts', label: 'DRAFTS', count: myDrafts.length },
                ] as const).map(({ id, label, count }) => {
                  const active = bytesTab === id
                  return (
                    <button key={id}
                      onClick={() => { setBytesTab(id); if (id === 'drafts' && myDrafts.length === 0) handleLoadDrafts() }}
                      className={`font-mono text-[10px] font-bold tracking-[0.08em] px-4 py-1.5 rounded-lg border transition-all ${
                        active
                          ? 'border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)] shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                          : 'border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]'
                      }`}>
                      {label}{count > 0 && <span className="ml-1 opacity-60">({count})</span>}
                    </button>
                  )
                })}
              </div>

              {/* Content */}
              {bytesTab === 'drafts' ? (
                loadingDrafts ? (
                  <div className="py-10 flex justify-center gap-1.5">{[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--orange)] animate-bounce opacity-60" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
                ) : myDrafts.length === 0 ? (
                  <div className="py-12 flex flex-col items-center gap-3 px-5">
                    <div className="text-2xl opacity-30">◎</div>
                    <p className="font-mono text-xs font-bold text-[var(--t2)]">NO DRAFTS</p>
                    <p className="font-mono text-xs text-[var(--t2)] text-center leading-relaxed">Save work-in-progress from the compose screen</p>
                    <button onClick={() => router.push('/compose')} className="font-mono text-xs px-3 py-1.5 rounded-lg border border-[rgba(249,115,22,0.3)] text-[var(--orange)] bg-[rgba(249,115,22,0.07)] transition-all hover:opacity-80">→ COMPOSE</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 p-4">
                    {myDrafts.map((draft) => {
                      const isConfirming = confirmDeleteDraft === draft.id
                      const dateStr = new Date(draft.updatedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })
                      const preview = draft.title || draft.body?.slice(0, 80) || '(untitled)'
                      return (
                        <div key={draft.id} className={`group relative rounded-xl border transition-all ${
                          isConfirming
                            ? 'border-[var(--red)] bg-[rgba(244,63,94,0.06)]'
                            : 'border-[var(--border-h)] bg-[var(--bg-card)] hover:border-[var(--accent)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)]'
                        }`}>
                          <button onClick={() => router.push(`/compose?draftId=${draft.id}`)} className="w-full text-left p-4">
                            <p className="font-bold text-base text-[var(--t1)] leading-snug mb-2 pr-8">{preview}</p>
                            {draft.body && draft.title && (
                              <p className="text-xs text-[var(--t2)] leading-relaxed line-clamp-2 mb-3">{draft.body.slice(0, 120)}</p>
                            )}
                            <div className="flex items-center gap-3">
                              {draft.language && (
                                <span className="font-mono text-[10px] px-2.5 py-1 rounded border border-[rgba(249,115,22,0.3)] text-[var(--orange)] bg-[rgba(249,115,22,0.07)]">
                                  {draft.language}
                                </span>
                              )}
                              <span className="font-mono text-[10px] text-[var(--t2)] ml-auto">{dateStr}</span>
                            </div>
                          </button>
                          <div className="absolute top-3 right-3">
                            {isConfirming ? (
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => handleDeleteDraft(draft.id)} className="font-mono text-[10px] px-2.5 py-1.5 rounded-lg bg-[var(--red)] text-white font-bold">YES</button>
                                <button onClick={() => setConfirmDeleteDraft(null)} className="font-mono text-[10px] px-2.5 py-1.5 rounded-lg border border-[var(--border-h)] text-[var(--t1)] hover:text-[var(--t1)]">NO</button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDeleteDraft(draft.id)} className="font-mono text-[10px] font-bold px-3 py-1.5 rounded-lg border border-[rgba(244,63,94,0.5)] text-[var(--red)] bg-[rgba(244,63,94,0.1)] hover:bg-[rgba(244,63,94,0.2)] hover:border-[var(--red)] transition-all tracking-wide">
                                rm
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              ) : loadingContent ? (
                <div className="py-10 flex justify-center gap-1.5">{[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)] animate-bounce opacity-60" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
              ) : (bytesTab === 'posted' ? myBytes : savedBytes).length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-3 px-5">
                  <div className="text-2xl opacity-30">⬡</div>
                  <p className="font-mono text-xs font-bold text-[var(--t2)]">{bytesTab === 'posted' ? 'NO BYTES YET' : 'NOTHING SAVED'}</p>
                  <p className="font-mono text-xs text-[var(--t2)] text-center leading-relaxed">{bytesTab === 'posted' ? 'Share a technique, pattern, or lesson' : 'Bookmark bytes to revisit later'}</p>
                  {bytesTab === 'posted' && <button onClick={() => router.push('/compose')} className="font-mono text-xs px-3 py-1.5 rounded-lg border border-[rgba(34,211,238,0.3)] text-[var(--cyan)] bg-[rgba(34,211,238,0.07)] transition-all hover:opacity-80">→ POST A BYTE</button>}
                </div>
              ) : (
                <div className="flex flex-col gap-3 p-4">
                  {(bytesTab === 'posted' ? myBytes : savedBytes).map((byte) => {
                    const isConfirming = confirmDelete === byte.id
                    const dateStr = new Date(byte.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })
                    return (
                      <div
                        key={byte.id}
                        className={`group relative rounded-xl border transition-all ${
                          isConfirming
                            ? 'border-[var(--red)] bg-[rgba(244,63,94,0.06)]'
                            : 'border-[var(--border-h)] bg-[var(--bg-card)] hover:border-[var(--accent)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)]'
                        }`}
                      >
                        <button
                          onClick={() => !isConfirming && router.push(`/post/${byte.id}`)}
                          className="w-full text-left p-4"
                        >
                          <p className="font-bold text-base text-[var(--t1)] leading-snug mb-2 pr-8">{byte.title}</p>
                          {byte.body && (
                            <p className="text-xs text-[var(--t2)] leading-relaxed line-clamp-2 mb-3">{byte.body}</p>
                          )}
                          {byte.tags && byte.tags.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap mb-3">
                              {byte.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="font-mono text-[10px] py-1 px-2.5 rounded border border-[var(--border-h)] text-[var(--t1)] bg-[var(--bg-el)]">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5 font-mono text-xs text-[var(--t1)]">
                              <Heart size={12} className="text-[var(--red)]" /> {byte.likes ?? 0}
                            </span>
                            <span className="flex items-center gap-1.5 font-mono text-xs text-[var(--t1)]">
                              <MessageSquare size={12} className="text-[var(--accent)]" /> {byte.comments ?? 0}
                            </span>
                            <span className="font-mono text-[10px] text-[var(--t2)] ml-auto">{dateStr}</span>
                          </div>
                        </button>

                        {/* Action button — top-right corner */}
                        <div className="absolute top-3 right-3">
                          {bytesTab === 'posted' ? (
                            isConfirming ? (
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => handleDeleteByte(byte.id)} className="font-mono text-[10px] px-2.5 py-1.5 rounded-lg bg-[var(--red)] text-white font-bold">YES</button>
                                <button onClick={() => setConfirmDelete(null)} className="font-mono text-[10px] px-2.5 py-1.5 rounded-lg border border-[var(--border-h)] text-[var(--t1)] hover:text-[var(--t1)]">NO</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(byte.id)}
                                className="font-mono text-[10px] font-bold px-3 py-1.5 rounded-lg border border-[rgba(244,63,94,0.5)] text-[var(--red)] bg-[rgba(244,63,94,0.1)] hover:bg-[rgba(244,63,94,0.2)] hover:border-[var(--red)] transition-all tracking-wide"
                              >
                                rm
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => handleUnsaveByte(byte.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-mono text-[9px] px-2 py-1 rounded-md border border-[rgba(59,130,246,0.3)] text-[var(--accent)] bg-[rgba(59,130,246,0.06)] hover:bg-[rgba(59,130,246,0.14)]"
                            >
                              <Bookmark size={9} /> unsave
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ INTERVIEWS TAB ══ */}
          {activeTab === 'interviews' && (
            <div className="flex flex-col">
              {/* Sub-tabs */}
              <div className="flex gap-2 px-4 py-3 border-b border-[var(--border-h)] sticky top-0 bg-[var(--bg)] z-10">
                {([
                  { id: 'posted', label: 'POSTED', count: myInterviews.length },
                  { id: 'saved',  label: 'SAVED',  count: savedInterviews.length },
                ] as const).map(({ id, label, count }) => {
                  const active = interviewsTab === id
                  return (
                    <button key={id} onClick={() => setInterviewsTab(id)}
                      className={`font-mono text-[10px] font-bold tracking-[0.08em] px-4 py-1.5 rounded-lg border transition-all ${
                        active
                          ? 'border-[var(--purple)] bg-[rgba(167,139,250,0.12)] text-[var(--purple)] shadow-[0_0_12px_rgba(167,139,250,0.2)]'
                          : 'border-[rgba(167,139,250,0.2)] bg-[rgba(167,139,250,0.03)] text-[var(--t1)] hover:border-[var(--purple)] hover:bg-[rgba(167,139,250,0.07)] hover:text-[var(--purple)]'
                      }`}>
                      {label}{count > 0 && <span className="ml-1 opacity-60">({count})</span>}
                    </button>
                  )
                })}
              </div>

              {/* Content */}
              {loadingContent ? (
                <div className="py-10 flex justify-center gap-1.5">{[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--purple)] animate-bounce opacity-60" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
              ) : (interviewsTab === 'posted' ? myInterviews : savedInterviews).length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-3 px-5">
                  <div className="text-2xl opacity-30">◈</div>
                  <p className="font-mono text-xs font-bold text-[var(--t2)]">{interviewsTab === 'posted' ? 'NO INTERVIEWS YET' : 'NONE SAVED'}</p>
                  <p className="font-mono text-xs text-[var(--t2)] text-center leading-relaxed">{interviewsTab === 'posted' ? 'Document your interview experience' : 'Save interviews to study later'}</p>
                  {interviewsTab === 'posted' && <button onClick={() => router.push('/interviews')} className="font-mono text-xs px-3 py-1.5 rounded-lg border border-[rgba(168,85,247,0.3)] text-[var(--purple)] bg-[rgba(168,85,247,0.07)] transition-all hover:opacity-80">→ SHARE ONE</button>}
                </div>
              ) : (
                <div className="flex flex-col gap-3 p-4">
                  {(interviewsTab === 'posted' ? myInterviews : savedInterviews).map((interview) => {
                    const isConfirming = confirmDelete === interview.id
                    const dateStr = new Date(interview.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })
                    const diffColor = interview.difficulty?.toLowerCase() === 'hard'
                      ? 'text-[var(--red)] border-[rgba(244,63,94,0.35)] bg-[rgba(244,63,94,0.07)]'
                      : interview.difficulty?.toLowerCase() === 'medium'
                      ? 'text-[var(--orange)] border-[rgba(249,115,22,0.35)] bg-[rgba(249,115,22,0.07)]'
                      : 'text-[var(--green)] border-[rgba(16,217,160,0.35)] bg-[rgba(16,217,160,0.07)]'
                    return (
                      <div key={interview.id} className={`group relative rounded-xl border transition-all ${
                        isConfirming
                          ? 'border-[var(--red)] bg-[rgba(244,63,94,0.06)]'
                          : 'border-[var(--border-h)] bg-[var(--bg-card)] hover:border-[var(--purple)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)]'
                      }`}>
                        <button onClick={() => !isConfirming && router.push(`/interviews/${interview.id}`)} className="w-full text-left p-4">
                          <p className="font-bold text-base text-[var(--t1)] leading-snug mb-2 pr-16">{interview.title}</p>
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            {interview.company && (
                              <span className="font-mono text-[10px] px-2.5 py-1 rounded border border-[var(--border-h)] text-[var(--t1)] bg-[var(--bg-el)]">{interview.company}</span>
                            )}
                            {interview.difficulty && (
                              <span className={`font-mono text-[10px] px-2.5 py-1 rounded border font-bold ${diffColor}`}>{interview.difficulty.toUpperCase()}</span>
                            )}
                            <span className="font-mono text-[10px] px-2.5 py-1 rounded border border-[var(--border-h)] text-[var(--t2)] bg-[var(--bg-el)]">{interview.questions?.length ?? 0}Q</span>
                          </div>
                          <span className="font-mono text-[10px] text-[var(--t2)]">{dateStr}</span>
                        </button>
                        <div className="absolute top-3 right-3">
                          {interviewsTab === 'posted' ? (
                            isConfirming ? (
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => handleDeleteInterview(interview.id)} className="font-mono text-[9px] px-2.5 py-1 rounded-md bg-[var(--red)] text-white font-bold tracking-wide">YES</button>
                                <button onClick={() => setConfirmDelete(null)} className="font-mono text-[10px] px-2.5 py-1 rounded-md border border-[var(--border-h)] text-[var(--t1)] hover:text-[var(--t1)]">NO</button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDelete(interview.id)} className="font-mono text-[10px] font-bold px-3 py-1.5 rounded-lg border border-[rgba(244,63,94,0.5)] text-[var(--red)] bg-[rgba(244,63,94,0.1)] hover:bg-[rgba(244,63,94,0.2)] hover:border-[var(--red)] transition-all tracking-wide">rm</button>
                            )
                          ) : (
                            <button onClick={() => handleUnsaveInterview(interview.id)} className="flex items-center gap-1.5 font-mono text-[10px] font-bold px-3 py-1.5 rounded-lg border border-[rgba(168,85,247,0.4)] text-[var(--purple)] bg-[rgba(168,85,247,0.08)] hover:bg-[rgba(168,85,247,0.18)] transition-all">
                              <Bookmark size={10} fill="currentColor" /> unsave
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ PREFS TAB ══ */}
          {activeTab === 'prefs' && (
            <div className="flex flex-col p-4 gap-5">
              {/* Tech stack */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.08em]">TECH_STACK</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {techStack.map((tech) => (
                    <button key={tech} onClick={() => handleRemoveTech(tech)}
                      className="flex items-center gap-[5px] px-[10px] py-[5px] bg-[var(--accent-d)] border border-[var(--accent)] rounded-full font-mono text-xs text-[var(--accent)] transition-all group">
                      {tech}
                      <span className="opacity-50 text-xs group-hover:opacity-100 group-hover:text-[var(--red)]">×</span>
                    </button>
                  ))}
                  {addingTech ? (
                    <>
                      <SearchableDropdown options={techStackOptions} value={selectedTechToAdd} onChange={handleAddTech} placeholder="TECH STACK" showAllOption={false} accentColor="accent" />
                      <button onClick={() => { setAddingTech(false); setSelectedTechToAdd(null) }}
                        className="flex items-center gap-[5px] px-[10px] py-[5px] border border-[rgba(244,63,94,0.3)] rounded-full font-mono text-xs text-[var(--red)] bg-[rgba(244,63,94,0.06)] transition-all hover:bg-[rgba(244,63,94,0.12)]">
                        CANCEL
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setAddingTech(true)}
                      className="flex items-center gap-[5px] px-[10px] py-[5px] border border-[rgba(59,130,246,0.3)] rounded-full font-mono text-xs text-[var(--accent)] bg-[rgba(59,130,246,0.08)] transition-all hover:bg-[rgba(59,130,246,0.15)] hover:border-[rgba(59,130,246,0.5)]">
                      <Plus size={10} /> ADD
                    </button>
                  )}
                </div>
              </div>

              {/* Theme */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.08em]">THEME</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(themes as { id: string; label: string; color: string }[]).map((theme) => (
                    <button key={theme.id} onClick={() => handleThemeChange(theme.id)}
                      className={`flex flex-col items-center gap-[5px] p-2.5 border-[1.5px] rounded-xl transition-all ${
                        activeTheme === theme.id ? 'border-[var(--accent)]' : 'border-[var(--border-m)] hover:border-[var(--border-h)]'
                      }`}>
                      <div className="w-8 h-6 rounded" style={{ background: theme.color, border: '1px solid var(--border-h)' }} />
                      <span className={`font-mono text-[10px] ${activeTheme === theme.id ? 'text-[var(--accent)]' : 'text-[var(--t2)]'}`}>{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ ALERTS TAB ══ */}
          {activeTab === 'alerts' && (
            <div className="flex flex-col p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.08em]">NOTIFICATIONS</span>
              </div>
              <div className="flex flex-col rounded-xl border border-[var(--border-h)] overflow-hidden">
                {[
                  { key: 'reactions',    icon: '💡', label: 'Reactions',    sub: 'When someone reacts to your bytes' },
                  { key: 'comments',     icon: '💬', label: 'Comments',     sub: 'When someone replies to your byte' },
                  { key: 'newFollowers', icon: '👤', label: 'New Followers', sub: 'When someone follows you' },
                  { key: 'unfollows',    icon: '👻', label: 'Unfollows',     sub: 'When someone unfollows you' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-h)] last:border-b-0 bg-[var(--bg-card)]">
                    <div className="flex items-center gap-3">
                      <span className="text-base w-5 text-center">{item.icon}</span>
                      <div>
                        <div className="font-mono text-xs text-[var(--t1)]">{item.label}</div>
                        <div className="font-mono text-[10px] text-[var(--t2)] mt-0.5">{item.sub}</div>
                      </div>
                    </div>
                    <button onClick={() => handleNotificationChange(item.key as keyof typeof notifications)}
                      className={`w-9 h-5 rounded-full relative transition-all flex-shrink-0 ${notifications[item.key as keyof typeof notifications] ? 'bg-[var(--accent)]' : 'bg-[var(--border-m)]'}`}>
                      <div className={`absolute w-4 h-4 rounded-full bg-white top-0.5 shadow-[0_1px_4px_rgba(0,0,0,0.35)] transition-transform ${notifications[item.key as keyof typeof notifications] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── PEOPLE SHEET ── */}
      <AnimatePresence>
        {peopleSheet && !miniProfilePerson && (
          <>
            <motion.div key="people-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-[80] bg-black/50 backdrop-blur-[2px]" onClick={() => setPeopleSheet(null)} />
            <motion.div key="people-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="absolute bottom-0 left-0 right-0 z-[81] bg-[var(--bg-card)] border-t border-[var(--border-h)] rounded-t-2xl max-h-[75vh] flex flex-col"
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 rounded-full bg-[var(--border-m)]" /></div>
              <div className="flex items-center justify-between px-5 py-2 flex-shrink-0 border-b border-[var(--border-h)]">
                <span className="font-mono text-xs font-bold tracking-[0.08em]">
                  {peopleSheet.type === 'followers' ? 'FOLLOWERS' : 'FOLLOWING'} ({peopleSheet.list.length})
                </span>
                <button onClick={() => setPeopleSheet(null)} className="text-[var(--t3)] hover:text-[var(--t1)]"><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-h)]">
                {peopleSheet.list.length === 0 ? (
                  <div className="flex items-center justify-center py-12 font-mono text-xs text-[var(--t3)]">No {peopleSheet.type} yet</div>
                ) : peopleSheet.list.map(person => (
                  <button key={person.id} onClick={() => setMiniProfilePerson(person)}
                    className="w-full text-left flex items-center gap-3 px-5 py-3 hover:bg-[var(--bg-el)] transition-colors">
                    <Avatar initials={person.displayName?.[0]?.toUpperCase() ?? person.username[0].toUpperCase()} imageUrl={person.avatarUrl} size="sm" variant="cyan" />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm font-bold text-[var(--t1)]">{person.displayName || person.username}</div>
                      <div className="font-mono text-xs text-[var(--accent)]">@{person.username}</div>
                      {person.bio && <div className="font-mono text-xs text-[var(--t2)] truncate mt-0.5">{person.bio}</div>}
                    </div>
                    <span className="font-mono text-xs text-[var(--t2)]">→</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MINI PROFILE ── */}
      {miniProfilePerson && (
        <UserMiniProfile
          userId={miniProfilePerson.id} username={miniProfilePerson.username} displayName={miniProfilePerson.displayName}
          initials={miniProfilePerson.displayName?.[0]?.toUpperCase() ?? miniProfilePerson.username[0].toUpperCase()}
          avatarUrl={miniProfilePerson.avatarUrl}
          onClose={() => { setMiniProfilePerson(null); api.getCurrentUser().then((user) => { if (user) setCurrentUser(user) }) }}
        />
      )}

      {/* ── CROP MODAL ── */}
      {showCropModal && avatarPreview && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border-h)] rounded-2xl p-6 mx-4 w-full max-w-sm flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.08em]">ADJUST PHOTO</span>
              </div>
              <button onClick={() => { setShowCropModal(false); setCropStagingZoom(avatarZoom) }}
                className="w-7 h-7 rounded-full border border-[var(--border-m)] flex items-center justify-center text-[var(--t3)] hover:text-[var(--t1)] hover:border-[var(--border-h)] transition-all">
                <X size={12} />
              </button>
            </div>

            {/* Large circular preview */}
            <div className="flex justify-center">
              <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-[var(--cyan)] shadow-[0_0_32px_rgba(34,211,238,0.2)] relative flex-shrink-0">
                <img
                  src={avatarPreview}
                  alt="crop preview"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: `scale(${cropStagingZoom})`, transformOrigin: 'center' }}
                />
              </div>
            </div>

            {/* Zoom slider */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between font-mono text-[10px] text-[var(--t2)]">
                <span>ZOOM</span>
                <span className="text-[var(--cyan)]">{cropStagingZoom.toFixed(1)}×</span>
              </div>
              <input type="range" min="1" max="3" step="0.05"
                value={cropStagingZoom}
                onChange={(e) => setCropStagingZoom(Number(e.target.value))}
                className="w-full accent-[var(--cyan)] h-1.5" />
              <div className="flex justify-between font-mono text-[9px] text-[var(--t3)]">
                <span>1×</span><span>3×</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowCropModal(false); setCropStagingZoom(avatarZoom) }}
                className="flex-1 py-2.5 font-mono text-xs font-bold border border-[var(--border-m)] rounded-xl text-[var(--t2)] hover:border-[var(--border-h)] transition-all">
                CANCEL
              </button>
              <button
                onClick={() => { setAvatarZoom(cropStagingZoom); setShowCropModal(false) }}
                className="flex-1 py-2.5 font-mono text-xs font-bold rounded-xl bg-[var(--cyan)] text-[var(--bg)] hover:opacity-90 transition-all">
                DONE
              </button>
            </div>
          </div>
        </div>
      )}
    </PhoneFrame>
  )
}
