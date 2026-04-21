"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { ByteAILogo } from '@/components/layout/byteai-logo'
import { CreatableDropdown } from '@/components/ui/creatable-dropdown'
import * as api from '@/lib/api'

interface QuestionPair {
  id: string
  question: string
  answer: string
}

interface ComposeInterviewScreenProps {
  onBack: () => void
}

export function ComposeInterviewScreen({ onBack }: ComposeInterviewScreenProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [companyOptions, setCompanyOptions] = useState<string[]>([])
  const [roleOptions, setRoleOptions] = useState<string[]>([])
  const [locationOptions, setLocationOptions] = useState<string[]>([])
  const [questions, setQuestions] = useState<QuestionPair[]>([
    { id: crypto.randomUUID(), question: '', answer: '' },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null)

  useEffect(() => {
    api.getInterviewCompanies().then(setCompanyOptions)
    api.getInterviewRoles().then(setRoleOptions)
    api.getInterviewLocations().then(setLocationOptions)
  }, [])

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

  const handlePost = async () => {
    if (!title.trim()) { toast.error('Title is required'); return }
    if (!company.trim()) { toast.error('Company is required'); return }
    if (!role.trim()) { toast.error('Role is required'); return }
    if (!location.trim()) { toast.error('Location is required'); return }
    const validQuestions = questions.filter((q) => q.question.trim() && q.answer.trim())
    if (validQuestions.length === 0) {
      toast.error('At least one complete Q&A pair is required')
      return
    }

    setIsLoading(true)
    try {
      await api.createInterviewWithQuestions({
        title: title.trim(),
        company: company.trim(),
        role: role.trim(),
        location: location.trim(),
        questions: validQuestions.map((q) => ({ question: q.question.trim(), answer: q.answer.trim() })),
      })
      toast.success('Interview Byte posted!')
      router.push('/interviews')
    } catch {
      toast.error('Failed to post interview byte')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PhoneFrame>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-[13px] pb-[11px] border-b border-[var(--border-h)] flex-shrink-0 bg-[var(--bg-o92)] backdrop-blur-md">
        <ByteAILogo size="sm" showText={false} />
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center text-[var(--t2)] transition-all hover:text-[var(--t1)]"
        >
          <X size={16} />
        </button>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
        <div className="px-5 py-5 flex flex-col gap-5">
          <div>
            <h1 className="font-mono text-lg font-bold tracking-[0.07em] text-[var(--t1)]">New Interview Byte</h1>
            <p className="font-mono text-[10px] md:text-xs tracking-[0.08em] text-[var(--t1)] mt-0.5">Share interview Q&A with the community</p>
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-[3px] h-3.5 rounded-full bg-[var(--purple)] flex-shrink-0" />
              <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">TITLE</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Meta Senior Engineer Interview — System Design Round"
              className="w-full bg-[var(--bg-el)] border border-[var(--border-h)] rounded-xl px-4 py-3 text-sm text-[var(--t1)] outline-none transition-all placeholder:text-[var(--t2)] focus:border-[var(--purple)] focus:shadow-[0_0_0_3px_rgba(167,139,250,0.14)]"
            />
          </div>

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

          {/* Location */}
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
                  {/* accent gradient top line */}
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
      </div>

      {/* Actions */}
      <div className="flex gap-3 px-5 py-4 border-t border-[var(--border-h)] flex-shrink-0">
        <button
          onClick={onBack}
          className="flex-1 py-[13px] border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-xl font-mono text-[10px] font-bold tracking-[0.08em] text-[var(--t1)] transition-all hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]"
        >
          CANCEL
        </button>
        <button
          onClick={handlePost}
          disabled={!title.trim() || !company.trim() || !role.trim() || !location.trim() || isLoading}
          className="flex-1 py-[13px] bg-gradient-to-br from-[var(--purple)] to-[#5b21b6] rounded-xl font-mono text-[10px] font-bold tracking-[0.1em] text-white shadow-[0_4px_24px_rgba(167,139,250,0.4)] transition-all hover:shadow-[0_8px_36px_rgba(167,139,250,0.5)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'POSTING...' : 'POST INTERVIEW →'}
        </button>
      </div>
    </PhoneFrame>
  )
}
