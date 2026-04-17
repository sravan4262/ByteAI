"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X, ChevronDown, AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { CodeEditor } from '@/components/ui/code-editor'
import { CreatableDropdown } from '@/components/ui/creatable-dropdown'
import { toast } from 'sonner'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { ByteAILogo } from '@/components/layout/byteai-logo'
import { ErrorModal, resolveErrorModal } from '@/components/ui/error-modal'
import { ApiError } from '@/lib/api/http'
import * as api from '@/lib/api'
import { useFeatureFlag } from '@/hooks/use-feature-flags'

type ComposeType = 'byte' | 'interview'

interface QuestionPair {
  id: string
  question: string
  answer: string
}

export function ComposeScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [composeType, setComposeType] = useState<ComposeType>(
    searchParams.get('type') === 'interview' ? 'interview' : 'byte'
  )
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)

  // ── Byte state ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [codeContent, setCodeContent] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('')
  const [reachEstimate, setReachEstimate] = useState(1200)
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const hasReachEstimate = useFeatureFlag('reach-estimate')
  const [showEscModal, setShowEscModal] = useState(false)
  const [postError, setPostError] = useState<{ errorCode: string; reason?: string } | null>(null)

  // ── Interview state ─────────────────────────────────────────────────────────
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [companyOptions, setCompanyOptions] = useState<string[]>([])
  const [roleOptions, setRoleOptions] = useState<string[]>([])
  const [locationOptions, setLocationOptions] = useState<string[]>([])
  const [questions, setQuestions] = useState<QuestionPair[]>([
    { id: crypto.randomUUID(), question: '', answer: '' },
  ])
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isInterviewLoading, setIsInterviewLoading] = useState(false)

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
    if (!content.trim()) return
    setIsLoading(true)
    try {
      await api.createPost({
        title: title.trim() || undefined,
        content,
        code: codeContent ? { language: selectedLanguage, content: codeContent } : undefined,
        tags: [],
      })
      if (draftId) {
        await api.deleteDraft(draftId).catch(() => {})
      }
      toast.success('Byte posted!')
      router.push('/feed')
    } catch (err) {
      if (err instanceof ApiError) {
        setPostError({ errorCode: err.errorCode, reason: err.reason })
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
    if (!role.trim() && !company.trim()) {
      toast.error('At least a role or company is required')
      return
    }
    const validQuestions = questions.filter((q) => q.question.trim() && q.answer.trim())
    if (validQuestions.length === 0) {
      toast.error('At least one complete Q&A pair is required')
      return
    }
    // Auto-generate title from role + company
    const autoTitle = [role.trim(), company.trim() ? `@ ${company.trim()}` : '']
      .filter(Boolean).join(' ')
    setIsInterviewLoading(true)
    try {
      await api.createInterviewWithQuestions({
        title: autoTitle,
        company: company.trim() || undefined,
        role: role.trim() || undefined,
        location: location.trim() || undefined,
        questions: validQuestions.map((q) => ({ question: q.question.trim(), answer: q.answer.trim() })),
        isAnonymous,
      })
      toast.success('Interview Byte posted!')
      router.push('/interviews')
    } catch {
      toast.error('Failed to post interview byte')
    } finally {
      setIsInterviewLoading(false)
    }
  }

  return (
    <PhoneFrame>
      {/* Header — always visible with type switcher */}
      <header className="flex items-center justify-between px-5 py-[13px] pb-[11px] border-b border-[var(--border)] flex-shrink-0 bg-[var(--bg-o92)] backdrop-blur-md">
        <ByteAILogo size="sm" showText={false} />
        <div className="flex items-center gap-3">
          {/* Type selector */}
          <div className="relative">
            <button
              onClick={() => setShowTypeDropdown((o) => !o)}
              className="flex items-center gap-1.5 font-mono text-[10px] px-3 py-1.5 rounded-lg border border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg-el)] hover:border-[var(--border-h)] hover:text-[var(--t1)] transition-all"
            >
              {composeType === 'byte' ? 'NEW BYTE' : 'NEW INTERVIEW'}
              <ChevronDown size={10} className={`transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showTypeDropdown && (
              <div className="absolute top-full right-0 mt-1 z-50 w-44 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
                {(['byte', 'interview'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => { setComposeType(type); setShowTypeDropdown(false) }}
                    className={`w-full text-left font-mono text-[10px] px-4 py-2.5 transition-all ${
                      composeType === type
                        ? 'text-[var(--accent)] bg-[var(--accent-d)]'
                        : 'text-[var(--t2)] hover:text-[var(--t1)] hover:bg-white/5'
                    }`}
                  >
                    {type === 'byte' ? '✦ NEW BYTE' : '🎯 NEW INTERVIEW'}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => router.push('/feed')}
            className="w-8 h-8 flex items-center justify-center text-[var(--t2)] transition-all hover:text-[var(--t1)]"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
        {composeType === 'byte' ? (
          <div className="px-5 py-5 flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-extrabold">New Byte</h1>
              <p className="font-mono text-xs text-[var(--t2)] mt-1">// Share your insight to 8,400+ AI devs</p>
            </div>

            {/* Title input */}
            <div>
              <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--t3)]">// TITLE</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                placeholder="Give your byte a clear title..."
                className="w-full mt-2 bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg px-4 py-3 font-mono text-sm text-[var(--t1)] outline-none transition-all placeholder:text-[var(--t3)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]"
              />
            </div>

            {/* Content textarea */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--t3)]">// CONTENT_BUFFER</span>
                <span className={`font-mono text-[10px] tracking-[0.1em] ${content.length >= 280 ? 'text-[var(--red)]' : 'text-[var(--accent)]'}`}>
                  {content.length} / 300
                </span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 300))}
                placeholder="Share a technique, pattern, or lesson learned..."
                className="w-full h-36 bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg px-4 py-3 font-mono text-sm text-[var(--t1)] outline-none resize-none transition-all placeholder:text-[var(--t3)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]"
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
              <div className="bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] tracking-[0.1em] text-[var(--t3)]">// REACH_EST</div>
                  <div className="font-mono text-xl font-bold text-[var(--t1)] mt-1">
                    {reachEstimate.toLocaleString()} <span className="text-[var(--green)] text-base">↗</span>
                  </div>
                </div>
                <div className="font-mono text-[10px] text-[var(--t3)] text-right leading-relaxed">
                  devs who may<br />see this byte
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 py-5 flex flex-col gap-5">
            <div>
              <h1 className="text-xl font-extrabold">New Interview Byte</h1>
              <p className="font-mono text-[9px] text-[var(--purple)] mt-1">
                // Share interview Q&A with the community
              </p>
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
                <div className="font-mono text-[8px] text-[var(--t3)] mt-[3px] leading-relaxed">
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
                <div className="font-mono text-[8px] tracking-[0.1em] text-[var(--t3)] mb-2">// COMPANY</div>
                <CreatableDropdown
                  options={companyOptions}
                  value={company}
                  onChange={setCompany}
                  placeholder="e.g. Meta"
                  accentColor="purple"
                />
              </div>
              <div>
                <div className="font-mono text-[8px] tracking-[0.1em] text-[var(--t3)] mb-2">// ROLE</div>
                <CreatableDropdown
                  options={roleOptions}
                  value={role}
                  onChange={setRole}
                  placeholder="e.g. Senior SWE"
                  accentColor="purple"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <div className="font-mono text-[8px] tracking-[0.1em] text-[var(--t3)] mb-2">// LOCATION</div>
              <CreatableDropdown
                options={locationOptions}
                value={location}
                onChange={setLocation}
                placeholder="e.g. San Francisco"
                accentColor="purple"
              />
            </div>

            {/* Questions */}
            <div>
              <div className="font-mono text-[8px] tracking-[0.1em] text-[var(--t3)] mb-3">
                // QUESTIONS ({questions.length})
              </div>

              <div className="flex flex-col gap-4">
                {questions.map((q, index) => (
                  <div
                    key={q.id}
                    className="bg-[var(--bg-card)] border border-[var(--border-m)] rounded-lg overflow-hidden"
                  >
                    {/* Question header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[rgba(167,139,250,0.04)]">
                      <span className="font-mono text-[9px] text-[var(--purple)] tracking-[0.08em]">
                        Q{index + 1}
                      </span>
                      {questions.length > 1 && (
                        <button
                          onClick={() => removeQuestion(q.id)}
                          className="text-[var(--t3)] hover:text-[var(--red)] transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    <div className="px-4 py-3 flex flex-col gap-3">
                      {/* Question */}
                      <div>
                        <div className="font-mono text-[8px] tracking-[0.1em] text-[var(--t3)] mb-1.5">QUESTION</div>
                        <textarea
                          value={q.question}
                          onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                          placeholder="What was the interview question?"
                          rows={2}
                          className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg px-3 py-2 font-mono text-[11px] text-[var(--t1)] outline-none resize-none transition-all placeholder:text-[var(--t3)] focus:border-[var(--purple)] focus:shadow-[0_0_0_2px_rgba(167,139,250,0.1)]"
                        />
                      </div>

                      {/* Answer */}
                      <div>
                        <div className="font-mono text-[8px] tracking-[0.1em] text-[var(--t3)] mb-1.5">ANSWER</div>
                        <textarea
                          value={q.answer}
                          onChange={(e) => updateQuestion(q.id, 'answer', e.target.value)}
                          placeholder="What was the ideal answer or your approach?"
                          rows={3}
                          className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg px-3 py-2 font-mono text-[11px] text-[var(--t1)] outline-none resize-none transition-all placeholder:text-[var(--t3)] focus:border-[var(--green)] focus:shadow-[0_0_0_2px_rgba(16,217,160,0.1)]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add question button */}
              <button
                onClick={addQuestion}
                className="mt-3 w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[var(--border-m)] rounded-lg font-mono text-[10px] text-[var(--t2)] transition-all hover:border-[var(--purple)] hover:text-[var(--purple)]"
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
          onClose={() => setPostError(null)}
          onRetry={postError.errorCode === 'AI_QUOTA_EXHAUSTED' ? () => { setPostError(null); handlePostByte() } : undefined}
        />
      )}

      {/* ESC discard confirmation modal */}
      {showEscModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--bg-o80)] backdrop-blur-sm rounded-[inherit]">
          <div className="w-[300px] bg-[var(--bg-card)] border border-[var(--border-m)] rounded-xl p-6 flex flex-col gap-4 shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
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
                className="flex-1 py-2.5 border border-[var(--border-m)] rounded-lg font-mono text-xs font-bold tracking-[0.07em] text-[var(--t2)] transition-all hover:border-[var(--border-h)] hover:text-[var(--t1)]"
              >
                KEEP EDITING
              </button>
              <button
                onClick={handleDiscardAndLeave}
                className="flex-1 py-2.5 bg-[var(--red)] rounded-lg font-mono text-xs font-bold tracking-[0.07em] text-white transition-all hover:opacity-90"
              >
                DISCARD →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {composeType === 'byte' ? (
        <div className="flex gap-3 px-5 py-4 border-t border-[var(--border)] flex-shrink-0">
          <button
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isLoading}
            className="flex-1 py-[13px] border border-[var(--border-m)] rounded-lg font-mono text-xs font-bold tracking-[0.08em] text-[var(--t2)] transition-all hover:border-[var(--border-h)] hover:text-[var(--t1)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingDraft ? 'SAVING...' : draftId ? 'DRAFT ✓' : 'DRAFT'}
          </button>
          <button
            onClick={handlePostByte}
            disabled={!title.trim() || !content.trim() || isLoading}
            className="flex-1 py-[13px] bg-gradient-to-br from-[var(--accent)] to-[#1d4ed8] rounded-lg font-mono text-xs font-bold tracking-[0.1em] text-white shadow-[0_4px_24px_var(--accent-glow)] transition-all hover:shadow-[0_8px_36px_var(--accent-glow)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'POSTING...' : 'POST BYTE →'}
          </button>
        </div>
      ) : (
        <div className="flex gap-3 px-5 py-4 border-t border-[var(--border)] flex-shrink-0">
          <button
            onClick={() => setComposeType('byte')}
            className="flex-1 py-[13px] border border-[var(--border-m)] rounded-lg font-mono text-[10px] font-bold tracking-[0.08em] text-[var(--t2)] transition-all hover:border-[var(--border-h)] hover:text-[var(--t1)]"
          >
            CANCEL
          </button>
          <button
            onClick={handlePostInterview}
            disabled={(!role.trim() && !company.trim()) || isInterviewLoading}
            className="flex-1 py-[13px] bg-gradient-to-br from-[var(--purple)] to-[#5b21b6] rounded-lg font-mono text-[10px] font-bold tracking-[0.1em] text-white shadow-[0_4px_24px_rgba(167,139,250,0.4)] transition-all hover:shadow-[0_8px_36px_rgba(167,139,250,0.5)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInterviewLoading ? 'POSTING...' : 'POST INTERVIEW →'}
          </button>
        </div>
      )}
    </PhoneFrame>
  )
}
