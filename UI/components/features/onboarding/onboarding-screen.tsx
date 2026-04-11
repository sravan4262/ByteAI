"use client"

import { useState, useEffect } from 'react'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { Avatar } from '@/components/layout/avatar'
import { ByteAILogo } from '@/components/layout/byteai-logo'
import { useAuth } from '@/hooks/use-auth'
import * as api from '@/lib/api'
import type { SeniorityTypeResponse, DomainResponse, TechStackResponse } from '@/lib/api'

export function OnboardingScreen() {
  const { completeOnboarding } = useAuth()
  const [seniorityOptions, setSeniorityOptions] = useState<SeniorityTypeResponse[]>([])
  const [domainOptions, setDomainOptions] = useState<DomainResponse[]>([])
  const [techStackOptions, setTechStackOptions] = useState<TechStackResponse[]>([])
  const [selectedSeniority, setSelectedSeniority] = useState<SeniorityTypeResponse | null>(null)
  const [selectedDomain, setSelectedDomain] = useState<DomainResponse | null>(null)
  const [selectedTechStack, setSelectedTechStack] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load seniority + domains on mount
  useEffect(() => {
    api.getSeniorityTypes().then(setSeniorityOptions)
    api.getDomains().then(setDomainOptions)
  }, [])

  // Load tech stacks whenever domain changes
  useEffect(() => {
    if (!selectedDomain) { setTechStackOptions([]); return }
    api.getTechStacks(selectedDomain.id).then(setTechStackOptions)
    setSelectedTechStack([])
  }, [selectedDomain])

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
    await api.saveOnboardingData({
      seniority: selectedSeniority.name,
      domain: selectedDomain.name,
      techStack: selectedTechStack,
    })
    setIsLoading(false)
    completeOnboarding()
  }

  const progressPercent =
    ([selectedSeniority, selectedDomain, selectedTechStack.length > 0].filter(Boolean).length / 3) * 100

  return (
    <PhoneFrame>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-[13px] pb-[11px] border-b border-[var(--border)] flex-shrink-0 bg-[rgba(5,5,14,0.92)] backdrop-blur-md">
        <ByteAILogo size="sm" showText />
        <Avatar initials="AX" size="xs" />
      </header>

      {/* Progress bar */}
      <div className="px-5 py-[13px] pb-[9px] flex-shrink-0">
        <div className="flex justify-between mb-2">
          <span className="font-mono text-[10px] tracking-[0.08em] text-[var(--t2)]">SETUP_PROFILE</span>
          <span className="font-mono text-[10px] tracking-[0.08em] text-[var(--t2)]">STEP_02 / 03</span>
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
          {/* Seniority */}
          <div>
            <div className="font-mono text-[11px] tracking-[0.1em] text-[var(--t3)] mb-3">// SELECT_SENIORITY</div>
            <div className="grid grid-cols-2 gap-2">
              {seniorityOptions.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setSelectedSeniority(level)}
                  className={`py-3 px-4 rounded-lg border font-mono text-[11px] tracking-[0.05em] transition-all flex items-center gap-2 ${
                    selectedSeniority?.id === level.id
                      ? 'border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)]'
                      : 'border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg-el)] hover:border-[var(--border-h)]'
                  }`}
                >
                  <span>{level.icon}</span>{level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Domain */}
          <div>
            <div className="font-mono text-[11px] tracking-[0.1em] text-[var(--t3)] mb-3">// SELECT_DOMAIN</div>
            <div className="grid grid-cols-2 gap-2">
              {domainOptions.map((domain) => (
                <button
                  key={domain.id}
                  onClick={() => setSelectedDomain(domain)}
                  className={`py-3 px-4 rounded-lg border font-mono text-[11px] tracking-[0.05em] transition-all flex items-center gap-2 ${
                    selectedDomain?.id === domain.id
                      ? 'border-[var(--cyan)] bg-[rgba(34,211,238,0.08)] text-[var(--cyan)]'
                      : 'border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg-el)] hover:border-[var(--border-h)]'
                  }`}
                >
                  <span>{domain.icon}</span>{domain.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tech Stack — loaded from API when domain is selected */}
          {selectedDomain && techStackOptions.length > 0 && (
            <div>
              <div className="font-mono text-[11px] tracking-[0.1em] text-[var(--t3)] mb-1">// SELECT_TECH_STACK</div>
              <div className="font-mono text-[10px] text-[var(--t3)] mb-3">
                {selectedTechStack.length}/6 selected
              </div>
              <div className="flex flex-wrap gap-2">
                {techStackOptions.map((tech) => (
                  <button
                    key={tech.id}
                    onClick={() => toggleTechStack(tech.name)}
                    disabled={!selectedTechStack.includes(tech.name) && selectedTechStack.length >= 6}
                    className={`py-1.5 px-3 rounded-full border font-mono text-[11px] transition-all ${
                      selectedTechStack.includes(tech.name)
                        ? 'border-[var(--green)] bg-[var(--green-d)] text-[var(--green)]'
                        : 'border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg-el)] hover:border-[var(--border-h)] disabled:opacity-40'
                    }`}
                  >
                    {tech.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleComplete}
            disabled={!selectedSeniority || !selectedDomain || isLoading}
            className="w-full py-[14px] bg-gradient-to-br from-[var(--accent)] to-[#2563eb] rounded-lg font-mono text-xs font-bold tracking-[0.1em] text-white shadow-[0_4px_24px_var(--accent-glow)] transition-all hover:shadow-[0_8px_36px_var(--accent-glow)] hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? 'SETTING UP...' : 'ENTER BYTEAI →'}
          </button>
        </div>
      </div>
    </PhoneFrame>
  )
}
