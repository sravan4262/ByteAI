"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X, AlertTriangle, Plus, Zap, Briefcase } from 'lucide-react'
import { CodeEditor } from '@/components/ui/code-editor'
import { CreatableDropdown } from '@/components/ui/creatable-dropdown'
import { MultiSelectDropdown, type DropdownOption } from '@/components/ui/multi-select-dropdown'
import { SearchableDropdown } from '@/components/ui/searchable-dropdown'
import { toast } from 'sonner'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { ByteAILogo } from '@/components/layout/byteai-logo'
import { ErrorModal, resolveErrorModal } from '@/components/ui/error-modal'
import { ApiError, type ModerationReason } from '@/lib/api/http'
import * as api from '@/lib/api'
import { useFeatureFlag } from '@/hooks/use-feature-flags'

type ComposeType = 'byte' | 'interview' | null

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'EASY' },
  { value: 'medium', label: 'MEDIUM' },
  { value: 'hard', label: 'HARD' },
]

interface QuestionPair {
  id: string
  question: string
  answer: string
}

export function ComposeScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [composeType, setComposeType] = useState<ComposeType>(() => {
    const t = searchParams.get('type')
    if (t === 'byte') return 'byte'
    if (t === 'interview') return 'interview'
    return null
  })

  // Sync state with URL so browser back/forward works
  useEffect(() => {
    const t = searchParams.get('type')
    if (t === 'byte') setComposeType('byte')
    else if (t === 'interview') setComposeType('interview')
    else setComposeType(null)
  }, [searchParams])

  // ── Byte state ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [codeContent, setCodeContent] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('')
  const [selectedTechStacks, setSelectedTechStacks] = useState<string[]>([])
  const [techStackOptions, setTechStackOptions] = useState<DropdownOption[]>([])
  const [reachEstimate, setReachEstimate] = useState(1200)
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const hasReachEstimate = useFeatureFlag('reach-estimate')
  const [showEscModal, setShowEscModal] = useState(false)
  const [postError, setPostError] = useState<{ errorCode: string; reason?: string; reasons?: ModerationReason[] } | null>(null)

  // ── Interview state ─────────────────────────────────────────────────────────
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [companyOptions, setCompanyOptions] = useState<string[]>([])
  const [roleOptions, setRoleOptions] = useState<string[]>([])
  const [locationOptions, setLocationOptions] = useState<string[]>([])
  const [questions, setQuestions] = useState<QuestionPair[]>([
    { id: crypto.randomUUID(), question: '', answer: '' },
  ])
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isInterviewLoading, setIsInterviewLoading] = useState(false)
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null)

  // ── Load draft from URL ─────────────────────────────────────────────────────
  useEffect(() => {
    const urlDraftId = searchParams.get('draftId')
    if (!urlDraftId) return
    api.getMyDrafts().then((drafts) => {
      const draft = drafts.find((d) => d.id === urlDraftId)
      if (!draft) return
      setDraftId(draft.id)
      setTitle(draft.title ?? '')
      setContent(draft.body ?? '')
      setCodeContent(draft.codeSnippet ?? '')
      setSelectedLanguage(draft.language ?? '')
    })
  // Only run on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load tech stack options ─────────────────────────────────────────────────
  useEffect(() => {
    api.getTechStacks().then((stacks) =>
      setTechStackOptions(stacks.map((s) => ({ value: s.name, label: s.label })))
    )
  }, [])

  // ── Load interview filter options ───────────────────────────────────────────
  useEffect(() => {
    api.getInterviewCompanies().then(setCompanyOptions)
    api.getInterviewRoles().then(setRoleOptions)
    api.getInterviewLocations().then(setLocationOptions)
  }, [])

  // ── Reach estimate ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasReachEstimate || content.length <= 10) return
    const fetchReach = async () => {
      const { reach } = await api.getReachEstimate(content, selectedLanguage ? [selectedLanguage] : [])
      setReachEstimate(reach)
    }
    fetchReach()
  }, [hasReachEstimate, content, selectedLanguage])

  // ── ESC → confirm discard (byte only) ──────────────────────────────────────
  useEffect(() => {
    if (composeType !== 'byte') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (title.trim() || content.trim() || codeContent.trim()) {
          setShowEscModal(true)
        } else {
          router.push('/feed')
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [composeType, title, content, codeContent, router])

  // ── Byte handlers ───────────────────────────────────────────────────────────
  const handleDiscardAndLeave = () => {
    setTitle('')
    setContent('')
    setCodeContent('')
    setShowEscModal(false)
    router.push('/feed')
  }

  const handleSaveDraft = async () => {
    if (!title.trim() && !content.trim() && !codeContent.trim()) {
      toast.error('Add a title or some content before saving a draft')
      return
    }
    setIsSavingDraft(true)
    try {
      const saved = await api.saveDraft({
        draftId: draftId ?? undefined,
        title: title.trim() || undefined,
        content: content || undefined,
        code: codeContent ? { language: selectedLanguage, content: codeContent } : undefined,
        tags: [],
      })
      setDraftId(saved.id)
      toast.success('Draft saved')
    } catch {
      toast.error('Failed to save draft')
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handlePostByte = async () => {
    if (!title.trim() || !content.trim() || selectedTechStacks.length === 0) return
    setIsLoading(true)
    try {
      await api.createPost({
        title: title.trim(),
        content,
        code: codeContent ? { language: selectedLanguage, content: codeContent } : undefined,
        techStackNames: selectedTechStacks,
      })
      if (draftId) {
        await api.deleteDraft(draftId).catch(() => {})
      }
      toast.success('Byte posted!')
      router.push('/feed')
    } catch (err) {
      if (err instanceof ApiError) {
        setPostError({ errorCode: err.errorCode, reason: err.reason, reasons: err.reasons })
      } else {
        setPostError({ errorCode: 'POST_FAILED' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ── Interview handlers ──────────────────────────────────────────────────────
  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), question: '', answer: '' },
    ])
  }

  const removeQuestion = (id: string) => {
    if (questions.length === 1) return
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const updateQuestion = (id: string, field: 'question' | 'answer', value: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    )
  }

  const handlePostInterview = async () => {
    if (!company.trim()) { toast.error('Company is required'); return }
    if (!role.trim()) { toast.error('Role is required'); return }
    if (!location.trim()) { toast.error('Location is required'); return }
    const validQuestions = questions.filter((q) => q.question.trim() && q.answer.trim())
    if (validQuestions.length === 0) {
      toast.error('At least one complete Q&A pair is required')
      return
    }
    const autoTitle = [role.trim(), `@ ${company.trim()}`].join(' ')
    setIsInterviewLoading(true)
    try {
      await api.createInterviewWithQuestions({
        title: autoTitle,
        company: company.trim(),
        role: role.trim(),
        location: location.trim(),
        difficulty,
        questions: validQuestions.map((q) => ({ question: q.question.trim(), answer: q.answer.trim() })),
        isAnonymous,
      })
      toast.success('Interview Byte posted!')
      router.push('/interviews')
    } catch (err) {
      if (err instanceof ApiError) {
        setPostError({ errorCode: err.errorCode, reason: err.reason, reasons: err.reasons })
      } else {
        toast.error('Failed to post interview byte')
      }
    } finally {
      setIsInterviewLoading(false)
    }
  }

  // ── Selection landing ──────────────────────────────────────────────────────
  if (composeType === null) {
    return (
      <PhoneFrame>
        <header className="flex items-center justify-between px-5 py-[13px] pb-[11px] border-b border-[var(--border-h)] flex-shrink-0 bg-[var(--bg-o92)] backdrop-blur-md">
          <ByteAILogo size="sm" showText={false} />
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center text-[var(--t2)] transition-all hover:text-[var(--t1)]"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 flex flex-col px-5 pt-6 pb-5 gap-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--t1)]">New Post</h1>
            <p className="text-sm text-[var(--t1)] mt-1">What are you sharing today?</p>
          </div>

          {/* Byte card */}
          <button
            onClick={() => router.push('/compose?type=byte')}
            className="w-full text-left rounded-xl border border-[var(--border-h)] bg-[var(--bg-card)] overflow-hidden transition-all hover:border-[rgba(59,130,246,0.6)] hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] group"
          >
            <div className="h-px bg-gradient-to-r from-[var(--accent)] via-[rgba(59,130,246,0.3)] to-transparent" />
            <div className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] flex items-center justify-center flex-shrink-0">
                  <Zap size={18} className="text-[var(--accent)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)]" />
                    <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.08em]">NEW BYTE</span>
                  </div>
                  <p className="text-xs text-[var(--t1)] mt-0.5">Share a technique, pattern, or lesson learned</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['up to 300 chars', 'code snippets', 'tech tags'].map((hint) => (
                  <span key={hint} className="font-mono text-[10px] px-2.5 py-1 rounded-lg border border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.08)] text-[var(--accent)]">
                    {hint}
                  </span>
                ))}
              </div>
              <div className="flex justify-end">
                <span className="font-mono text-xs font-bold tracking-[0.08em] text-[var(--accent)] bg-[rgba(59,130,246,0.22)] border border-[rgba(59,130,246,0.6)] shadow-[0_0_10px_rgba(59,130,246,0.18)] px-5 py-2.5 rounded-lg group-hover:shadow-[0_0_18px_rgba(59,130,246,0.3)] group-hover:-translate-y-0.5 transition-all">
                  START BYTE →
                </span>
              </div>
            </div>
          </button>

          {/* Interview card */}
          <button
            onClick={() => router.push('/compose?type=interview')}
            className="w-full text-left rounded-xl border border-[var(--border-h)] bg-[var(--bg-card)] overflow-hidden transition-all hover:border-[rgba(167,139,250,0.5)] hover:shadow-[0_0_20px_rgba(167,139,250,0.08)] group"
          >
            <div className="h-px bg-gradient-to-r from-[var(--purple)] via-[rgba(167,139,250,0.3)] to-transparent" />
            <div className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.2)] flex items-center justify-center flex-shrink-0">
                  <Briefcase size={18} className="text-[var(--purple)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-[3px] h-3.5 rounded-full bg-[var(--purple)]" />
                    <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.08em]">NEW INTERVIEW</span>
                  </div>
                  <p className="text-xs text-[var(--t1)] mt-0.5">Share real interview Q&amp;A with the community</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['company & role', 'Q&A pairs', 'anonymous option'].map((hint) => (
                  <span key={hint} className="font-mono text-[10px] px-2.5 py-1 rounded-lg border border-[rgba(167,139,250,0.35)] bg-[rgba(167,139,250,0.08)] text-[var(--purple)]">
                    {hint}
                  </span>
                ))}
              </div>
              <div className="flex justify-end">
                <span className="font-mono text-xs font-bold tracking-[0.08em] text-[var(--purple)] bg-[rgba(167,139,250,0.15)] border border-[rgba(167,139,250,0.5)] shadow-[0_0_10px_rgba(167,139,250,0.15)] px-5 py-2.5 rounded-lg group-hover:shadow-[0_0_18px_rgba(167,139,250,0.3)] group-hover:-translate-y-0.5 transition-all">
                  START INTERVIEW →
                </span>
              </div>
            </div>
          </button>
        </div>
      </PhoneFrame>
    )
  }

  return (
    <PhoneFrame>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-[13px] pb-[11px] border-b border-[var(--border-h)] flex-shrink-0 bg-[var(--bg-o92)] backdrop-blur-md">
        <ByteAILogo size="sm" showText={false} />
        <button
          onClick={() => router.push('/compose')}
          className="w-8 h-8 flex items-center justify-center text-[var(--t2)] transition-all hover:text-[var(--t1)]"
        >
          <X size={16} />
        </button>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
        {composeType === 'byte' ? (
          <div className="px-5 py-5 flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-extrabold">New Byte</h1>
              <p className="font-mono text-[10px] md:text-xs tracking-[0.08em] text-[var(--t1)] mt-0.5">Share your insight with others</p>
            </div>

            {/* Title input */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)]" />
                <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">TITLE <span className="text-[var(--red)]">*</span></span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                placeholder="Give your byte a clear title..."
                className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-xl px-4 py-3 text-sm text-[var(--t1)] outline-none transition-all placeholder:text-[var(--t2)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]"
              />
            </div>

            {/* Content textarea */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)]" />
                  <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">CONTENT <span className="text-[var(--red)]">*</span></span>
                </div>
                <span className={`font-mono text-[10px] tracking-[0.1em] ${content.length >= 280 ? 'text-[var(--red)]' : 'text-[var(--accent)]'}`}>
                  {content.length} / 300
                </span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 300))}
                placeholder="Share a technique, pattern, or lesson learned..."
                className="w-full h-36 bg-[var(--bg-el)] border border-[var(--border-m)] rounded-xl px-4 py-3 text-sm text-[var(--t1)] outline-none resize-none transition-all placeholder:text-[var(--t2)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]"
              />
            </div>

            {/* Tech stack */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)]" />
                  <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">TECH STACK <span className="text-[var(--red)]">*</span></span>
                </div>
                {selectedTechStacks.length > 0 && (
                  <span className="font-mono text-[10px] text-[var(--accent)]">{selectedTechStacks.length} selected</span>
                )}
              </div>
              <MultiSelectDropdown
                options={techStackOptions}
                values={selectedTechStacks}
                onChange={setSelectedTechStacks}
                placeholder="SELECT TECH STACKS"
                accentColor="accent"
                creatable
                className="w-full [&>button]:w-full [&>button]:justify-between"
              />
            </div>

            {/* Code snippet */}
            <CodeEditor
              value={codeContent}
              language={selectedLanguage}
              onChange={setCodeContent}
              onLanguageChange={setSelectedLanguage}
            />

            {/* Reach estimate */}
            {hasReachEstimate && (
              <div className="border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)]" />
                    <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">REACH EST</span>
                  </div>
                  <div className="font-mono text-xl font-bold text-[var(--t1)] mt-1">
                    {reachEstimate.toLocaleString()} <span className="text-[var(--green)] text-base">↗</span>
                  </div>
                </div>
                <div className="font-mono text-[10px] text-[var(--t2)] text-right leading-relaxed">
                  devs who may<br />see this byte
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 py-5 flex flex-col gap-5">
            <div>
              <h1 className="text-xl font-extrabold">New Interview Byte</h1>
              <p className="font-mono text-[10px] md:text-xs tracking-[0.08em] text-[var(--t1)] mt-0.5">Share interview Q&A with the community</p>
            </div>

            {/* Anonymous toggle */}
            <button
              onClick={() => setIsAnonymous((v) => !v)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 text-left ${
                isAnonymous
                  ? 'border-[rgba(167,139,250,0.5)] bg-[rgba(167,139,250,0.07)] shadow-[0_0_16px_rgba(167,139,250,0.12)]'
                  : 'border-[var(--border-m)] bg-[var(--bg-el)] hover:border-[var(--border-h)]'
              }`}
            >
              {/* Ghost icon */}
              <span className={`text-xl select-none transition-all duration-200 ${isAnonymous ? 'opacity-100' : 'opacity-40'}`}>
                👻
              </span>
              <div className="flex-1">
                <div className={`font-mono text-[10px] font-bold tracking-[0.1em] transition-colors ${isAnonymous ? 'text-[var(--purple)]' : 'text-[var(--t2)]'}`}>
                  {isAnonymous ? 'POSTING ANONYMOUSLY' : 'POST ANONYMOUSLY'}
                </div>
                <div className="font-mono text-[10px] text-[var(--t2)] mt-[3px] leading-relaxed">
                  {isAnonymous
                    ? 'Your identity is hidden — only the content is visible'
                    : 'Hide your identity — your name won\'t appear on this post'}
                </div>
              </div>
              {/* Toggle pill */}
              <div className={`relative w-9 h-5 rounded-full transition-all duration-200 flex-shrink-0 ${isAnonymous ? 'bg-[var(--purple)]' : 'bg-[var(--border-m)]'}`}>
                <span className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all duration-200 ${isAnonymous ? 'left-[18px]' : 'left-[3px]'}`} />
              </div>
            </button>

            {/* Company + Role */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-[3px] h-3.5 rounded-full bg-[var(--purple)] flex-shrink-0" />
                  <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">COMPANY <span className="text-[var(--red)]">*</span></span>
                </div>
                <CreatableDropdown
                  options={companyOptions}
                  value={company}
                  onChange={setCompany}
                  placeholder="e.g. Meta"
                  accentColor="purple"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-[3px] h-3.5 rounded-full bg-[var(--purple)] flex-shrink-0" />
                  <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">ROLE <span className="text-[var(--red)]">*</span></span>
                </div>
                <CreatableDropdown
                  options={roleOptions}
                  value={role}
                  onChange={setRole}
                  placeholder="e.g. Senior SWE"
                  accentColor="purple"
                />
              </div>
            </div>

            {/* Location + Difficulty */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-[3px] h-3.5 rounded-full bg-[var(--purple)] flex-shrink-0" />
                  <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">LOCATION <span className="text-[var(--red)]">*</span></span>
                </div>
                <CreatableDropdown
                  options={locationOptions}
                  value={location}
                  onChange={setLocation}
                  placeholder="e.g. San Francisco"
                  accentColor="purple"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-[3px] h-3.5 rounded-full bg-[var(--purple)] flex-shrink-0" />
                  <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">DIFFICULTY <span className="text-[var(--red)]">*</span></span>
                </div>
                <SearchableDropdown
                  options={DIFFICULTY_OPTIONS}
                  value={difficulty}
                  onChange={(v) => { if (v === 'easy' || v === 'medium' || v === 'hard') setDifficulty(v) }}
                  placeholder="DIFFICULTY"
                  showAllOption={false}
                  accentColor="purple"
                  className="w-full [&>button]:w-full [&>button]:justify-between"
                />
              </div>
            </div>

            {/* Questions */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-[3px] h-3.5 rounded-full bg-[var(--purple)] flex-shrink-0" />
                <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">QUESTIONS ({questions.length})</span>
              </div>

              <div className="flex flex-col gap-4">
                {questions.map((q, index) => (
                  <div
                    key={q.id}
                    className="bg-[var(--bg-card)] border border-[var(--border-h)] rounded-xl overflow-hidden"
                  >
                    <div className="h-px bg-gradient-to-r from-[var(--purple)] via-[rgba(167,139,250,0.3)] to-transparent" />
                    {/* Question header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-h)] bg-[rgba(167,139,250,0.04)]">
                      <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">
                        Q{index + 1}
                      </span>
                      {questions.length > 1 && (
                        <div className="flex items-center gap-1.5">
                          {confirmingRemoveId === q.id ? (
                            <>
                              <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.05em]">DELETE?</span>
                              <button
                                onClick={() => { removeQuestion(q.id); setConfirmingRemoveId(null) }}
                                className="font-mono text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[rgba(244,63,94,0.4)] bg-[rgba(244,63,94,0.08)] text-[var(--red)] hover:border-[rgba(244,63,94,0.7)] hover:bg-[rgba(244,63,94,0.15)] transition-all"
                              >
                                YES
                              </button>
                              <button
                                onClick={() => setConfirmingRemoveId(null)}
                                className="font-mono text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)] transition-all"
                              >
                                NO
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setConfirmingRemoveId(q.id)}
                              className="font-mono text-xs font-bold px-3 py-1.5 rounded-lg border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(244,63,94,0.4)] hover:bg-[rgba(244,63,94,0.08)] hover:text-[var(--red)] transition-all tracking-[0.05em]"
                            >
                              rm
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="px-4 py-3 flex flex-col gap-3">
                      {/* Question */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-[3px] h-3 rounded-full bg-[var(--accent)]" />
                          <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">QUESTION</span>
                        </div>
                        <textarea
                          value={q.question}
                          onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                          placeholder="What was the interview question?"
                          rows={2}
                          className="w-full bg-[var(--bg-el)] border border-[var(--border-h)] rounded-xl px-3 py-2 font-mono text-xs text-[var(--t1)] outline-none resize-none transition-all placeholder:text-[var(--t2)] focus:border-[var(--accent)] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.15)]"
                        />
                      </div>

                      {/* Answer */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-[3px] h-3 rounded-full bg-[var(--green)]" />
                          <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">ANSWER</span>
                        </div>
                        <textarea
                          value={q.answer}
                          onChange={(e) => updateQuestion(q.id, 'answer', e.target.value)}
                          placeholder="What was the ideal answer or your approach?"
                          rows={3}
                          className="w-full bg-[var(--bg-el)] border border-[var(--border-h)] rounded-xl px-3 py-2 font-mono text-xs text-[var(--t1)] outline-none resize-none transition-all placeholder:text-[var(--t2)] focus:border-[var(--green)] focus:shadow-[0_0_0_2px_rgba(16,217,160,0.12)]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add question button */}
              <button
                onClick={addQuestion}
                className="mt-3 w-full flex items-center justify-center gap-2 py-3 border border-[rgba(167,139,250,0.25)] bg-[rgba(167,139,250,0.03)] rounded-xl font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em] transition-all hover:border-[var(--purple)] hover:bg-[rgba(167,139,250,0.07)] hover:text-[var(--purple)]"
              >
                <Plus size={12} /> ADD QUESTION
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Post error modal */}
      {postError && (
        <ErrorModal
          {...resolveErrorModal(postError.errorCode, postError.reason)}
          reasons={postError.reasons}
          onClose={() => setPostError(null)}
          onRetry={postError.errorCode === 'AI_QUOTA_EXHAUSTED' ? () => { setPostError(null); handlePostByte() } : undefined}
        />
      )}

      {/* ESC discard confirmation modal */}
      {showEscModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--bg-o80)] backdrop-blur-sm rounded-[inherit]">
          <div className="w-[300px] bg-[var(--bg-card)] border border-[var(--border-h)] rounded-xl p-6 flex flex-col gap-4 shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={17} className="text-[var(--orange)] flex-shrink-0" />
              <span className="font-mono text-sm font-bold tracking-[0.07em] text-[var(--t1)]">DISCARD BYTE?</span>
            </div>
            <p className="font-mono text-xs text-[var(--t2)] leading-relaxed">
              Your draft will be cleared and you&apos;ll be taken back to the feed. This cannot be undone.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => { setShowEscModal(false); setPostError(null) }}
                className="flex-1 py-2.5 border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-xl font-mono text-xs font-bold tracking-[0.07em] text-[var(--t1)] transition-all hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]"
              >
                KEEP EDITING
              </button>
              <button
                onClick={handleDiscardAndLeave}
                className="flex-1 py-2.5 bg-[var(--red)] rounded-xl font-mono text-xs font-bold tracking-[0.07em] text-white transition-all hover:opacity-90"
              >
                DISCARD →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {composeType === 'byte' ? (
        <div className="flex gap-3 px-5 py-4 border-t border-[var(--border-h)] flex-shrink-0">
          <button
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isLoading}
            className="flex-1 py-[13px] border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-xl font-mono text-xs font-bold tracking-[0.08em] text-[var(--t1)] transition-all hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingDraft ? 'SAVING...' : draftId ? 'DRAFT ✓' : 'DRAFT'}
          </button>
          <button
            onClick={handlePostByte}
            disabled={!title.trim() || !content.trim() || selectedTechStacks.length === 0 || isLoading}
            className="flex-1 py-[13px] rounded-xl font-mono text-[10px] font-bold tracking-[0.1em] text-[var(--accent)] bg-[rgba(59,130,246,0.22)] border border-[rgba(59,130,246,0.6)] shadow-[0_0_10px_rgba(59,130,246,0.18)] transition-all hover:border-[var(--accent)] hover:shadow-[0_0_14px_rgba(59,130,246,0.25)] hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isLoading ? 'POSTING...' : 'POST BYTE →'}
          </button>
        </div>
      ) : (
        <div className="flex gap-3 px-5 py-4 border-t border-[var(--border-h)] flex-shrink-0">
          <button
            onClick={() => router.push('/compose')}
            className="flex-1 py-[13px] border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-xl font-mono text-[10px] font-bold tracking-[0.08em] text-[var(--t1)] transition-all hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]"
          >
            ← BACK
          </button>
          <button
            onClick={handlePostInterview}
            disabled={!company.trim() || !role.trim() || !location.trim() || isInterviewLoading}
            className="flex-1 py-[13px] bg-gradient-to-br from-[var(--purple)] to-[#5b21b6] rounded-xl font-mono text-[10px] font-bold tracking-[0.1em] text-white shadow-[0_4px_24px_rgba(167,139,250,0.4)] transition-all hover:shadow-[0_8px_36px_rgba(167,139,250,0.5)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInterviewLoading ? 'POSTING...' : 'POST INTERVIEW →'}
          </button>
        </div>
      )}
    </PhoneFrame>
  )
}
