"use client"

import { useState, useEffect, useRef } from 'react'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { ByteAILogo } from '@/components/layout/byteai-logo'
import { useAuth } from '@/hooks/use-auth'

import { toast } from 'sonner'
import { setTokenProvider } from '@/lib/api/http'
import { handleMutationError } from '@/lib/api/handle-error'
import * as api from '@/lib/api'
import type { SeniorityTypeResponse, DomainResponse, TechStackResponse } from '@/lib/api'
import { getMeCache } from '@/lib/user-cache'

export function OnboardingScreen() {
  const { completeOnboarding, getToken } = useAuth()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Onboarding lives outside AuthGuard, so wire the token provider here
  useEffect(() => {
    setTokenProvider(getToken)
  }, [getToken])

  const [seniorityOptions, setSeniorityOptions] = useState<SeniorityTypeResponse[]>([])
  const [domainOptions, setDomainOptions] = useState<DomainResponse[]>([])
  const [techStackByDomain, setTechStackByDomain] = useState<Record<string, TechStackResponse[]>>({})
  const [selectedSeniority, setSelectedSeniority] = useState<SeniorityTypeResponse | null>(null)
  const [selectedDomains, setSelectedDomains] = useState<DomainResponse[]>([])
  const [selectedTechStack, setSelectedTechStack] = useState<string[]>([])
  const [bio, setBio] = useState('')
  const [company, setCompany] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [bioFocused, setBioFocused] = useState(false)
  const [techSearch, setTechSearch] = useState('')
  const [activeStep, setActiveStep] = useState<'seniority' | 'domain' | 'tech' | 'review'>('seniority')

  useEffect(() => {
    api.getSeniorityTypes().then(setSeniorityOptions)
    api.getDomains().then(setDomainOptions)
  }, [])

  const toggleDomain = (domain: DomainResponse) => {
    setSelectedDomains(prev => {
      const isSelected = prev.some(d => d.id === domain.id)
      if (isSelected) {
        // Remove domain and deselect its tech stacks
        const remaining = prev.filter(d => d.id !== domain.id)
        const removedStacks = (techStackByDomain[domain.id] ?? []).map(t => t.name)
        setSelectedTechStack(s => s.filter(t => !removedStacks.includes(t)))
        return remaining
      }
      return [...prev, domain]
    })
  }

  // Load tech stacks for any newly selected domains not yet fetched
  const goToTech = async () => {
    const unfetched = selectedDomains.filter(d => !techStackByDomain[d.id])
    if (unfetched.length > 0) {
      const results = await Promise.all(unfetched.map(d => api.getTechStacks(undefined, d.id)))
      setTechStackByDomain(prev => {
        const next = { ...prev }
        unfetched.forEach((d, i) => { next[d.id] = results[i] })
        return next
      })
    }
    setActiveStep('tech')
  }

  const MAX_TECH = 6

  const toggleTechStack = (name: string) => {
    setSelectedTechStack(prev => {
      if (prev.includes(name)) return prev.filter(t => t !== name)
      if (prev.length >= MAX_TECH) return prev
      return [...prev, name]
    })
  }

  const handleComplete = async () => {
    if (!selectedSeniority || selectedDomains.length === 0) return
    if (selectedTechStack.length === 0) {
      toast.error('Please select at least one technology.')
      setActiveStep('tech')
      return
    }
    setIsLoading(true)
    try {
      await api.saveOnboardingData({
        seniority: selectedSeniority.name,
        domains: selectedDomains.map(d => d.name),
        techStack: selectedTechStack,
        bio: bio.trim() || null,
        company: company.trim() || null,
        roleTitle: roleTitle.trim() || null,
      })
      completeOnboarding()
    } catch (err) {
      handleMutationError(err, "Onboarding couldn't be saved. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const steps = [
    { id: 'seniority', completed: !!selectedSeniority },
    { id: 'domain', completed: selectedDomains.length > 0 },
    { id: 'tech', completed: selectedTechStack.length > 0 },
    { id: 'review', completed: true },
  ]

  const currentStepIndex = steps.findIndex(s => s.id === activeStep)
  const progressPercent = ((currentStepIndex + 1) / steps.length) * 100

  const wordCount = bio.trim() ? bio.trim().split(/\s+/).length : 0
  const initials = ((getMeCache()?.displayName?.[0] ?? '') + ('')).toUpperCase() || '?'

  // Flatten all tech stacks for selected domains, filtered by search
  const allTechStacks = selectedDomains.flatMap(d =>
    (techStackByDomain[d.id] ?? []).map(t => ({ ...t, domainId: d.id, domainLabel: d.label }))
  )
  const filteredTechStacks = techSearch.trim()
    ? allTechStacks.filter(t => t.label.toLowerCase().includes(techSearch.toLowerCase()))
    : null // null = show grouped

  return (
    <PhoneFrame>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-[13px] pb-[11px] border-b border-[var(--border)] flex-shrink-0 bg-[var(--bg-o92)] backdrop-blur-md">
        <ByteAILogo size="sm" showText />
        {getMeCache()?.avatarUrl
          ? <img src={getMeCache()?.avatarUrl ?? undefined} alt="avatar" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover ring-1 ring-[var(--border-h)]" />
          : <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center font-mono text-[10px] font-bold text-white">{initials}</div>
        }
      </header>

      {/* Progress bar */}
      <div className="px-5 pt-[13px] pb-[9px] flex-shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2.5">
            <span className="w-[3px] h-4 rounded-full bg-[var(--accent)] flex-shrink-0" />
            <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.05em]">SETUP PROFILE</span>
          </div>
          <span className="font-mono text-[10px] text-[var(--t2)]">{currentStepIndex + 1} / 4</span>
        </div>
        <div className="h-0.5 bg-[var(--border-m)] rounded-sm overflow-hidden">
          <div
            className="h-full rounded-sm bg-gradient-to-r from-[var(--accent)] via-[var(--cyan)] to-[var(--accent)] bg-[length:200%_100%] animate-xp-shimmer shadow-[0_0_8px_rgba(34,211,238,0.3)] transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
        <div className="px-5 pb-8 flex flex-col gap-6">

          {/* ── IDENTITY CARD ── */}
          <div className="rounded-xl border border-[var(--border-m)] overflow-hidden shadow-[0_0_40px_rgba(59,130,246,0.04)]">
            {/* Titlebar */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[rgba(255,255,255,0.02)] border-b border-[var(--border)]">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              </div>
              <span className="font-mono text-[10px] text-[var(--t2)] tracking-[0.08em] ml-1">~/user.profile.init</span>
            </div>

            {/* Author line */}
            <div className="px-4 py-4 flex items-center gap-3 border-b border-[var(--border)] bg-[rgba(59,130,246,0.03)]">
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-[2px] rounded-full bg-[conic-gradient(from_0deg,var(--accent),var(--cyan),var(--purple),var(--accent))] animate-spin-ring opacity-60 blur-[1px]" />
                {getMeCache()?.avatarUrl
                  ? <img src={getMeCache()?.avatarUrl ?? undefined} referrerPolicy="no-referrer" className="relative w-11 h-11 rounded-full object-cover ring-2 ring-[var(--bg)]" />
                  : <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center font-mono text-sm font-bold text-white ring-2 ring-[var(--bg)]">{initials}</div>
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-mono text-[12px] font-bold text-[var(--t1)] truncate">
                  {getMeCache()?.displayName ?? 'Developer'}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 min-w-0 overflow-hidden">
                  <input
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="Sr. Engineer"
                    maxLength={40}
                    style={{ width: `${Math.max(roleTitle.length, 'Sr. Engineer'.length) + 1}ch` }}
                    className="font-mono text-xs font-medium text-[var(--accent)] bg-transparent outline-none placeholder:text-[var(--t3)] border-b border-dashed border-[var(--border-h)] focus:border-solid focus:border-[var(--accent)] transition-all min-w-0 flex-shrink-0"
                  />
                  <span className="font-mono text-[10px] font-bold text-[var(--t2)] flex-shrink-0 px-0.5 opacity-60">@</span>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="your-company.io"
                    maxLength={50}
                    style={{ width: `${Math.max(company.length, 'your-company.io'.length) + 1}ch` }}
                    className="font-mono text-xs font-medium text-[var(--green)] bg-transparent outline-none placeholder:text-[var(--t3)] border-b border-dashed border-[var(--border-h)] focus:border-solid focus:border-[var(--green)] transition-all min-w-0 flex-shrink-0"
                  />
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="flex">
              <div className="flex flex-col pt-3 pb-3 pl-3 pr-2 border-r border-[var(--border)] bg-[rgba(255,255,255,0.01)] select-none gap-0">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className="font-mono text-[9px] text-[var(--t3)] leading-[18px]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                ))}
              </div>
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  onFocus={() => setBioFocused(true)}
                  onBlur={() => setBioFocused(false)}
                  maxLength={280}
                  rows={5}
                  placeholder={`Building things that matter.\nOpen source contributor.\nCoffee → code → repeat.`}
                  className="w-full bg-transparent px-3 pt-3 pb-3 font-mono text-[11px] text-[var(--t1)] placeholder:text-[var(--t2)] resize-none outline-none leading-[18px] transition-colors"
                />
                {bioFocused && (
                  <div className="absolute inset-x-0 top-3 h-[18px] bg-[rgba(59,130,246,0.04)] pointer-events-none" />
                )}
              </div>
            </div>

            <div className={`flex items-center justify-between px-4 py-2 border-t border-[var(--border)] bg-[rgba(255,255,255,0.01)] transition-colors ${bioFocused ? 'border-[rgba(59,130,246,0.3)]' : ''}`}>
              <span className="font-mono text-xs text-[var(--t2)]">
                {bio.length === 0
                  ? <span className="text-[var(--t2)]">// commit message</span>
                  : <span className="text-[var(--accent)]">✓ {wordCount} word{wordCount !== 1 ? 's' : ''}</span>
                }
              </span>
              <span className={`font-mono text-[10px] ${bio.length > 250 ? 'text-[var(--red)]' : 'text-[var(--t2)]'}`}>
                {bio.length}/280
              </span>
            </div>
          </div>

          {/* ── STEP: SENIORITY ── */}
          {activeStep === 'seniority' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="w-[3px] h-4 rounded-full bg-[var(--accent)] flex-shrink-0" />
                <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.05em]">SENIORITY</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {seniorityOptions.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => { setSelectedSeniority(level); setActiveStep('domain') }}
                    className={`py-3 px-4 rounded-lg border font-mono text-[11px] tracking-[0.05em] transition-all flex items-center gap-2 ${
                      selectedSeniority?.id === level.id
                        ? 'border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)] shadow-[0_0_16px_rgba(59,130,246,0.2)]'
                        : 'border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)]'
                    }`}
                  >
                    <span>{level.icon}</span>{level.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: DOMAIN ── */}
          {activeStep === 'domain' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <button onClick={() => setActiveStep('seniority')} className="text-[var(--accent)] hover:text-[var(--t1)] leading-none">←</button>
                <span className="w-[3px] h-4 rounded-full bg-[var(--accent)] flex-shrink-0" />
                <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.05em]">DOMAIN</span>
                {selectedDomains.length > 0 && (
                  <span className="ml-auto font-mono text-[10px] text-[var(--accent)]">{selectedDomains.length} selected</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {domainOptions.map((domain) => {
                  const isSelected = selectedDomains.some(d => d.id === domain.id)
                  return (
                    <button
                      key={domain.id}
                      onClick={() => toggleDomain(domain)}
                      className={`py-3 px-4 rounded-lg border font-mono text-[11px] tracking-[0.05em] transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)] shadow-[0_0_16px_rgba(59,130,246,0.2)]'
                          : 'border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)]'
                      }`}
                    >
                      <span>{domain.icon}</span>
                      <span className="flex-1 text-left">{domain.label}</span>
                      {isSelected && <span className="text-[var(--accent)] text-[10px]">✓</span>}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={goToTech}
                disabled={selectedDomains.length === 0}
                className="w-full py-2.5 px-4 bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg font-mono text-[11px] text-[var(--t2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {selectedDomains.length === 0 ? 'Select at least 1 domain' : `Continue with ${selectedDomains.length} domain${selectedDomains.length > 1 ? 's' : ''} →`}
              </button>
            </div>
          )}

          {/* ── STEP: TECH STACK ── */}
          {activeStep === 'tech' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <button onClick={() => setActiveStep('domain')} className="text-[var(--accent)] hover:text-[var(--cyan)] leading-none">←</button>
                <span className="w-[3px] h-4 rounded-full bg-[var(--accent)] flex-shrink-0" />
                <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.05em]">TECH STACK</span>
                {selectedTechStack.length > 0 && (
                  <span className="ml-auto font-mono text-[10px] text-[var(--accent)]">{selectedTechStack.length}/{MAX_TECH} selected</span>
                )}
              </div>

              <input
                type="text"
                value={techSearch}
                onChange={(e) => setTechSearch(e.target.value)}
                placeholder="Search across all domains..."
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--border-m)] bg-[var(--bg-el)] font-mono text-xs text-[var(--t1)] placeholder:text-[var(--t2)] outline-none focus:border-[var(--accent)] transition-colors"
              />

              <div className="flex flex-col gap-5 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[var(--border-m)]">
                {filteredTechStacks
                  ? /* search mode — flat list */
                    <div className="flex flex-wrap gap-2">
                      {filteredTechStacks.map((tech) => {
                        const isSelected = selectedTechStack.includes(tech.name)
                        const isDisabled = !isSelected && selectedTechStack.length >= MAX_TECH
                        return (
                          <button
                            key={tech.id}
                            onClick={() => toggleTechStack(tech.name)}
                            disabled={isDisabled}
                            className={`py-1.5 px-3 rounded-lg border font-mono text-[11px] transition-all inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                              isSelected
                                ? 'border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)] shadow-[0_0_16px_rgba(59,130,246,0.2)]'
                                : 'border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)]'
                            }`}
                          >
                            {tech.label}
                            {isSelected && <span className="text-[10px]">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  : /* grouped by domain */
                    selectedDomains.map((domain) => (
                      <div key={domain.id}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">{domain.icon}</span>
                          <span className="font-mono text-[10px] font-bold text-[var(--t2)] tracking-[0.06em] uppercase">{domain.label}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(techStackByDomain[domain.id] ?? []).map((tech) => {
                            const isSelected = selectedTechStack.includes(tech.name)
                            const isDisabled = !isSelected && selectedTechStack.length >= MAX_TECH
                            return (
                              <button
                                key={tech.id}
                                onClick={() => toggleTechStack(tech.name)}
                                disabled={isDisabled}
                                className={`py-1.5 px-3 rounded-lg border font-mono text-[11px] transition-all inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                                  isSelected
                                    ? 'border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)] shadow-[0_0_16px_rgba(59,130,246,0.2)]'
                                    : 'border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)]'
                                }`}
                              >
                                {tech.label}
                                {isSelected && <span className="text-[10px]">✓</span>}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))
                }
              </div>

              <button
                onClick={() => setActiveStep('review')}
                disabled={selectedTechStack.length === 0}
                className="w-full py-2.5 px-4 bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg font-mono text-[11px] text-[var(--t2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {selectedTechStack.length === 0 ? 'Select at least 1 technology' : 'Continue →'}
              </button>
            </div>
          )}

          {/* ── STEP: REVIEW ── */}
          {activeStep === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <button onClick={() => setActiveStep('tech')} className="text-[var(--accent)] hover:text-[var(--cyan)] leading-none">←</button>
                <span className="w-[3px] h-4 rounded-full bg-[var(--purple)] flex-shrink-0" />
                <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.05em]">REVIEW</span>
              </div>

              <div className="space-y-4 p-4 rounded-xl border border-[var(--border-m)] bg-[var(--bg-el)]">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                    <span className="font-mono text-[11px] font-bold text-[var(--t1)] tracking-[0.05em]">SENIORITY</span>
                  </div>
                  <div className="inline-flex items-center gap-2 py-2 px-3 rounded-lg border border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)] font-mono text-[11px]">
                    <span>{selectedSeniority?.icon}</span>{selectedSeniority?.label}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                    <span className="font-mono text-[11px] font-bold text-[var(--t1)] tracking-[0.05em]">DOMAINS</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedDomains.map(d => (
                      <span key={d.id} className="inline-flex items-center gap-1.5 py-2 px-3 rounded-lg border border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)] font-mono text-[11px]">
                        <span>{d.icon}</span>{d.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                    <span className="font-mono text-[11px] font-bold text-[var(--t1)] tracking-[0.05em]">TECH STACK</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTechStack.map(tech => (
                      <span key={tech} className="py-1.5 px-3 rounded-lg border border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)] font-mono text-[11px]">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleComplete}
                disabled={isLoading}
                className="w-full py-[14px] bg-gradient-to-br from-[var(--accent)] to-[#2563eb] rounded-lg font-mono text-xs font-bold tracking-[0.1em] text-white shadow-[0_4px_24px_var(--accent-glow)] transition-all hover:shadow-[0_8px_36px_var(--accent-glow)] hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? 'SETTING UP...' : 'ENTER BYTEAI →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  )
}
