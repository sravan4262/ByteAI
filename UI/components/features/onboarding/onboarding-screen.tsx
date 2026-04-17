"use client"

import { useState, useEffect, useRef } from 'react'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { ByteAILogo } from '@/components/layout/byteai-logo'
import { useAuth } from '@/hooks/use-auth'

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
  const [techStackOptions, setTechStackOptions] = useState<TechStackResponse[]>([])
  const [selectedSeniority, setSelectedSeniority] = useState<SeniorityTypeResponse | null>(null)
  const [selectedDomain, setSelectedDomain] = useState<DomainResponse | null>(null)
  const [selectedTechStack, setSelectedTechStack] = useState<string[]>([])
  const [bio, setBio] = useState('')
  const [company, setCompany] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [bioFocused, setBioFocused] = useState(false)

  // Search states
  const [techSearch, setTechSearch] = useState('')
  const [activeStep, setActiveStep] = useState<'seniority' | 'domain' | 'tech' | 'review'>('seniority')

  useEffect(() => {
    api.getSeniorityTypes().then(setSeniorityOptions)
    api.getDomains().then(setDomainOptions)
  }, [])

  // Load tech stacks when domain is selected
  useEffect(() => {
    if (!selectedDomain) { setTechStackOptions([]); return }
    api.getTechStacks(undefined, selectedDomain.id).then(setTechStackOptions)
    setSelectedTechStack([])
  }, [selectedDomain])

  const filteredTechStack = techStackOptions.filter(t =>
    t.label.toLowerCase().includes(techSearch.toLowerCase())
  )

  const toggleTechStack = (name: string) => {
    if (selectedTechStack.includes(name)) {
      setSelectedTechStack(selectedTechStack.filter((t) => t !== name))
    } else if (selectedTechStack.length < 6) {
      setSelectedTechStack([...selectedTechStack, name])
    }
  }

  const handleComplete = async () => {
    if (!selectedSeniority || !selectedDomain) return
    setIsLoading(true)
    try {
      await api.saveOnboardingData({
        seniority: selectedSeniority.name,
        domain: selectedDomain.name,
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
    { id: 'seniority', label: 'Seniority', completed: !!selectedSeniority },
    { id: 'domain', label: 'Domain', completed: !!selectedDomain },
    { id: 'tech', label: 'Tech Stack', completed: selectedTechStack.length > 0 },
    { id: 'review', label: 'Review', completed: true },
  ]

  const currentStepIndex = steps.findIndex(s => s.id === activeStep)
  const progressPercent = ((currentStepIndex + 1) / steps.length) * 100

  const wordCount = bio.trim() ? bio.trim().split(/\s+/).length : 0
  const initials = ((getMeCache()?.displayName?.[0] ?? '') + ('')).toUpperCase() || '?'

  return (
    <PhoneFrame>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-[13px] pb-[11px] border-b border-[var(--border)] flex-shrink-0 bg-[var(--bg-o92)] backdrop-blur-md">
        <ByteAILogo size="sm" showText />
        {getMeCache()?.avatarUrl
          ? <img src={getMeCache()?.avatarUrl} alt="avatar" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover ring-1 ring-[var(--border-h)]" />
          : <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center font-mono text-[10px] font-bold text-white">{initials}</div>
        }
      </header>

      {/* Progress bar */}
      <div className="px-5 pt-[13px] pb-[9px] flex-shrink-0">
        <div className="flex justify-between mb-2">
          <span className="font-mono text-[10px] tracking-[0.08em] text-[var(--t2)]">SETUP_PROFILE</span>
          <span className="font-mono text-[10px] tracking-[0.08em] text-[var(--t2)]">STEP_{currentStepIndex + 1} / 4</span>
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
              <span className="font-mono text-[10px] text-[var(--t3)] tracking-[0.08em] ml-1">~/user.profile.init</span>
            </div>

            {/* Author line */}
            <div className="px-4 py-4 flex items-center gap-3 border-b border-[var(--border)] bg-[rgba(59,130,246,0.03)]">
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-[2px] rounded-full bg-[conic-gradient(from_0deg,var(--accent),var(--cyan),var(--purple),var(--accent))] animate-spin-ring opacity-60 blur-[1px]" />
                {getMeCache()?.avatarUrl
                  ? <img src={getMeCache()?.avatarUrl} referrerPolicy="no-referrer" className="relative w-11 h-11 rounded-full object-cover ring-2 ring-[var(--bg)]" />
                  : <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center font-mono text-sm font-bold text-white ring-2 ring-[var(--bg)]">{initials}</div>
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-mono text-[12px] font-bold text-[var(--t1)] truncate">
                  {getMeCache()?.displayName ?? 'Developer'}
                </div>

                <div className="flex items-center gap-1 mt-1 min-w-0 overflow-hidden">
                  <input
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="Sr. Engineer"
                    maxLength={40}
                    style={{ width: `${Math.max(roleTitle.length, 'Sr. Engineer'.length) + 1}ch` }}
                    className="font-mono text-[11px] text-[var(--purple)] bg-transparent outline-none placeholder:text-[var(--border-h)] border-b border-dashed border-[var(--border-m)] focus:border-[var(--purple)] transition-[width,border-color] min-w-0 flex-shrink-0"
                  />
                  <span className="font-mono text-[11px] text-[var(--t3)] flex-shrink-0">@</span>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="your-company.io"
                    maxLength={50}
                    style={{ width: `${Math.max(company.length, 'your-company.io'.length) + 1}ch` }}
                    className="font-mono text-[11px] text-[var(--cyan)] bg-transparent outline-none placeholder:text-[var(--border-h)] border-b border-dashed border-[var(--border-m)] focus:border-[var(--cyan)] transition-[width,border-color] min-w-0 flex-shrink-0"
                  />
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="flex">
              <div className="flex flex-col pt-3 pb-3 pl-3 pr-2 border-r border-[var(--border)] bg-[rgba(255,255,255,0.01)] select-none gap-0">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className="font-mono text-[9px] text-[var(--border-h)] leading-[18px]">
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
                  className={`w-full bg-transparent px-3 pt-3 pb-3 font-mono text-[11px] text-[var(--t1)] placeholder:text-[var(--border-h)] resize-none outline-none leading-[18px] transition-colors`}
                />
                {bioFocused && (
                  <div className="absolute inset-x-0 top-3 h-[18px] bg-[rgba(59,130,246,0.04)] pointer-events-none" />
                )}
              </div>
            </div>

            <div className={`flex items-center justify-between px-4 py-2 border-t border-[var(--border)] bg-[rgba(255,255,255,0.01)] transition-colors ${bioFocused ? 'border-[rgba(59,130,246,0.3)]' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[9px] text-[var(--t3)]">
                  {bio.length === 0
                    ? <span className="text-[var(--t3)]">// commit message</span>
                    : <span className="text-[var(--green)]">✓ {wordCount} word{wordCount !== 1 ? 's' : ''}</span>
                  }
                </span>
              </div>
              <span className={`font-mono text-[9px] ${bio.length > 250 ? 'text-[var(--red)]' : 'text-[var(--t3)]'}`}>
                {bio.length}/280
              </span>
            </div>
          </div>

          {/* ── STEP: SENIORITY ── */}
          {activeStep === 'seniority' && (
            <div className="space-y-4">
              <div className="font-mono text-[11px] tracking-[0.1em] text-[var(--t3)]">// SELECT_SENIORITY</div>
              <div className="grid grid-cols-2 gap-2">
                {seniorityOptions.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => { setSelectedSeniority(level); setActiveStep('domain') }}
                    className={`py-3 px-4 rounded-lg border font-mono text-[11px] tracking-[0.05em] transition-all flex items-center gap-2 ${
                      selectedSeniority?.id === level.id
                        ? 'border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)] shadow-[0_0_16px_rgba(59,130,246,0.15)]'
                        : 'border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg-el)] hover:border-[var(--border-h)]'
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
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveStep('seniority')} className="text-[var(--accent)] hover:text-[var(--cyan)]">
                  ←
                </button>
                <div className="font-mono text-[11px] tracking-[0.1em] text-[var(--t3)]">// SELECT_DOMAIN</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {domainOptions.map((domain) => (
                  <button
                    key={domain.id}
                    onClick={() => { setSelectedDomain(domain); setActiveStep('tech') }}
                    className={`py-3 px-4 rounded-lg border font-mono text-[11px] tracking-[0.05em] transition-all flex items-center gap-2 ${
                      selectedDomain?.id === domain.id
                        ? 'border-[var(--cyan)] bg-[rgba(34,211,238,0.08)] text-[var(--cyan)] shadow-[0_0_16px_rgba(34,211,238,0.12)]'
                        : 'border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg-el)] hover:border-[var(--border-h)]'
                    }`}
                  >
                    <span>{domain.icon}</span>{domain.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: TECH STACK ── */}
          {activeStep === 'tech' && selectedDomain && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveStep('domain')} className="text-[var(--accent)] hover:text-[var(--cyan)]">
                  ←
                </button>
                <div className="font-mono text-[11px] tracking-[0.1em] text-[var(--t3)]">// SELECT_TECH_STACK</div>
              </div>
              <div className="font-mono text-[10px] text-[var(--t3)]">{selectedTechStack.length}/6 selected</div>
              <div className="relative">
                <input
                  type="text"
                  value={techSearch}
                  onChange={(e) => setTechSearch(e.target.value)}
                  placeholder="Search technologies..."
                  className="w-full px-4 py-3 rounded-lg border border-[var(--border-m)] bg-[var(--bg-el)] font-mono text-[12px] text-[var(--t1)] outline-none focus:border-[var(--green)] transition-colors"
                />
              </div>
              <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                {filteredTechStack.map((tech) => (
                  <button
                    key={tech.id}
                    onClick={() => toggleTechStack(tech.name)}
                    disabled={!selectedTechStack.includes(tech.name) && selectedTechStack.length >= 6}
                    className={`py-2 px-3 rounded-lg border font-mono text-[11px] transition-all inline-flex items-center gap-2 whitespace-nowrap ${
                      selectedTechStack.includes(tech.name)
                        ? 'border-[var(--green)] bg-[var(--green-d)] text-[var(--green)]'
                        : 'border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg-el)] hover:border-[var(--border-h)] disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    {tech.label}
                    {selectedTechStack.includes(tech.name) && <span>✓</span>}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setActiveStep('review')}
                className="w-full py-2 mt-4 px-4 bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg font-mono text-[11px] text-[var(--t2)] hover:bg-[var(--bg)] transition-all"
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP: REVIEW ── */}
          {activeStep === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveStep('tech')} className="text-[var(--accent)] hover:text-[var(--cyan)]">
                  ←
                </button>
                <div className="font-mono text-[11px] tracking-[0.1em] text-[var(--t3)]">// REVIEW</div>
              </div>

              <div className="space-y-3 p-4 rounded-lg border border-[var(--border-m)] bg-[var(--bg-el)]">
                <div>
                  <div className="font-mono text-[10px] text-[var(--t3)] mb-1">Seniority</div>
                  <div className="font-mono text-[12px] text-[var(--accent)] flex items-center gap-2">
                    <span>{selectedSeniority?.icon}</span>{selectedSeniority?.label}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-[var(--t3)] mb-1">Domain</div>
                  <div className="font-mono text-[12px] text-[var(--cyan)] flex items-center gap-2">
                    <span>{selectedDomain?.icon}</span>{selectedDomain?.label}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-[var(--t3)] mb-1">Tech Stack</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedTechStack.map(tech => (
                      <span key={tech} className="px-2 py-1 rounded bg-[var(--green-d)] text-[var(--green)] font-mono text-[10px]">
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
