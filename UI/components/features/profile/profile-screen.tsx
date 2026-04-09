"use client"

import { useState } from 'react'
import { LogOut, Pencil, Globe, Lock, Github } from 'lucide-react'
import { toast } from 'sonner'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { Avatar } from '@/components/layout/avatar'
import { useAuth } from '@/hooks/use-auth'
import { mockCurrentUser, mockUsers, themes, feedPreferenceOptions } from '@/lib/mock-data'
import * as api from '@/lib/api'

export function ProfileScreen() {
  const { logout } = useAuth()
  const [activeFollowTab, setActiveFollowTab] = useState<'followers' | 'following'>('followers')
  const [activeTheme, setActiveTheme] = useState('darker')
  const [feedPreferences, setFeedPreferences] = useState(mockCurrentUser.feedPreferences)
  const [techStack, setTechStack] = useState(mockCurrentUser.techStack)
  const [notifications, setNotifications] = useState({
    reactions: true,
    comments: true,
    newFollowers: false,
  })
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public')

  const followers = mockUsers.slice(1, 4)

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

  const handleThemeChange = async (theme: string) => {
    setActiveTheme(theme)
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

  return (
    <PhoneFrame>
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
              <div className="relative w-[68px] h-[68px] rounded-full bg-gradient-to-br from-[#131b40] to-[#1e3580] border-2 border-[var(--border-h)] flex items-center justify-center font-mono text-[22px] font-bold text-[var(--cyan)] shadow-[0_0_32px_rgba(34,211,238,0.25)]">
                {mockCurrentUser.initials}
              </div>
              <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[var(--accent)] border-2 border-[var(--bg)] flex items-center justify-center cursor-pointer">
                <Pencil size={9} className="text-white" />
              </div>
            </div>
            <button className="font-mono text-[10px] font-semibold tracking-[0.06em] px-[14px] py-[7px] rounded-full border border-[var(--border-h)] text-[var(--t2)] bg-[var(--bg-el)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]">
              EDIT_PROFILE
            </button>
          </div>

          <div className="text-xl font-extrabold tracking-tight flex items-center gap-[7px]">
            {mockCurrentUser.displayName}
            <span className="text-[13px] text-[var(--accent)] drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]">✦</span>
          </div>
          <div className="font-mono text-[10px] text-[var(--t2)] mt-0.5">@{mockCurrentUser.username}</div>
          <div className="font-mono text-[11px] text-[var(--t2)] mt-1.5 tracking-[0.04em]">
            {mockCurrentUser.role} @ {mockCurrentUser.company}
          </div>

          <div className="mt-[10px] p-3 bg-[var(--bg-card)] border border-[var(--border-m)] rounded-lg relative">
            <div className="font-mono text-[11px] text-[var(--t3)] mb-1">/*</div>
            <p className="text-xs leading-relaxed text-[var(--t2)]">{mockCurrentUser.bio}</p>
            <div className="font-mono text-[11px] text-[var(--t3)] mt-1">*/</div>
          </div>

          <div className="flex gap-2 flex-wrap mt-3">
            {mockCurrentUser.links.map((link) => (
              <button
                key={link.type}
                className="flex items-center gap-[5px] px-[10px] py-[5px] bg-[var(--bg-el)] border border-[var(--border-m)] rounded-full font-mono text-[10px] text-[var(--t2)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {link.type === 'github' && <Github size={10} />}
                {link.type === 'linkedin' && <span className="text-[10px] font-bold">in</span>}
                {link.type === 'website' && <Globe size={10} />}
                {link.label}
              </button>
            ))}
          </div>
        </div>

        {/* XP Card */}
        <div className="mx-5 mt-4 p-3 bg-gradient-to-br from-[rgba(59,130,246,0.08)] to-[rgba(167,139,250,0.06)] border border-[var(--border-m)] rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs font-bold text-[var(--cyan)] bg-[rgba(34,211,238,0.1)] border border-[rgba(34,211,238,0.2)] px-[10px] py-1 rounded-full tracking-[0.06em]">
              PRO_LVL_{mockCurrentUser.level}
            </span>
            <span className="font-mono text-[10px] text-[var(--t3)]">
              {mockCurrentUser.xpToNextLevel.toLocaleString()} XP to LVL_{mockCurrentUser.level + 1}
            </span>
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
            { label: 'BYTES', value: mockCurrentUser.bytes },
            { label: 'REACTIONS', value: `${(mockCurrentUser.reactions / 1000).toFixed(1)}k` },
            { label: 'FOLLOWERS', value: `${(mockCurrentUser.followers / 1000).toFixed(1)}k` },
            { label: 'DAY STREAK', value: `🔥 ${mockCurrentUser.streak}`, isStreak: true },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`py-3 px-2 text-center bg-[var(--bg-card)] ${i < 3 ? 'border-r border-[var(--border-m)]' : ''} ${stat.isStreak ? 'bg-gradient-to-br from-[rgba(16,217,160,0.06)] to-transparent' : ''}`}
            >
              <div className={`font-mono text-[15px] font-bold ${stat.isStreak ? 'text-[var(--green)]' : 'text-[var(--t1)]'}`}>
                {stat.value}
              </div>
              <div className="font-mono text-[9px] tracking-[0.07em] text-[var(--t3)] mt-[3px]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div className="mt-5 px-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[11px] font-bold tracking-[0.12em] text-[var(--t3)]">// BADGES</div>
            <button className="font-mono text-[10px] text-[var(--accent)]">VIEW ALL →</button>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-1 overflow-x-auto scrollbar-none">
          {mockCurrentUser.badges.map((badge, i) => (
            <div
              key={badge.id}
              className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-3 min-w-[76px] bg-[var(--bg-card)] border rounded-lg cursor-pointer ${
                badge.earned
                  ? 'border-[rgba(251,191,36,0.3)] bg-[rgba(251,191,36,0.04)] shadow-[0_0_20px_rgba(251,191,36,0.08)] animate-badge-float hover:shadow-[0_12px_32px_rgba(251,191,36,0.18)]'
                  : 'border-[var(--border-m)] opacity-30 grayscale'
              }`}
              style={{ animationDelay: badge.earned ? `${i * 0.5}s` : undefined }}
            >
              <span className="text-[22px]">{badge.icon}</span>
              <span className={`font-mono text-[9px] font-semibold text-center leading-tight ${badge.earned ? 'text-[rgba(251,191,36,0.9)]' : 'text-[var(--t2)]'}`}>
                {badge.name}
              </span>
            </div>
          ))}
        </div>

        {/* Network */}
        <div className="mt-5 px-5">
          <div className="font-mono text-[11px] font-bold tracking-[0.12em] text-[var(--t3)] mb-3">// NETWORK</div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-m)] rounded-lg overflow-hidden">
            <div className="flex border-b border-[var(--border)]">
              {(['followers', 'following'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFollowTab(tab)}
                  className={`flex-1 text-center py-[10px] font-mono text-[11px] border-b-2 transition-all ${
                    activeFollowTab === tab ? 'text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--t2)] border-transparent'
                  }`}
                >
                  {tab.toUpperCase()} <span className="ml-1">{tab === 'followers' ? '2.1k' : '318'}</span>
                </button>
              ))}
            </div>
            <div className="px-[14px]">
              {followers.map((user) => (
                <div key={user.id} className="flex items-center gap-[10px] py-[11px] border-b border-[var(--border)] last:border-b-0">
                  <Avatar initials={user.initials} size="sm" variant={user.id === '2' ? 'purple' : user.id === '3' ? 'green' : 'orange'} />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] font-bold text-[var(--t1)]">@{user.username}</div>
                    <div className="font-mono text-[10px] text-[var(--t2)] mt-px truncate">{user.role} @ {user.company}</div>
                  </div>
                  <button className="font-mono text-[7.5px] px-[10px] py-1 rounded-full border border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg-el)] transition-all whitespace-nowrap hover:border-[var(--red)] hover:text-[var(--red)]">
                    REMOVE
                  </button>
                </div>
              ))}
            </div>
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
              <button className="flex items-center gap-[5px] px-[10px] py-[5px] border border-dashed border-[var(--border-m)] rounded-full font-mono text-[10px] text-[var(--t2)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]">
                + ADD
              </button>
            </div>
          </div>

          <div className="mb-4">
            <div className="font-mono text-[11px] text-[var(--t3)] tracking-[0.08em] mb-2">// SHOW_ME_MORE_OF</div>
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
    </PhoneFrame>
  )
}
