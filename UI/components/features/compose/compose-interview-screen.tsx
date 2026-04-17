"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Trash2 } from 'lucide-react'
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
  const [companyOptions, setCompanyOptions] = useState<string[]>([])
  const [roleOptions, setRoleOptions] = useState<string[]>([])
  const [questions, setQuestions] = useState<QuestionPair[]>([
    { id: crypto.randomUUID(), question: '', answer: '' },
  ])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    api.getInterviewCompanies().then(setCompanyOptions)
    api.getInterviewRoles().then(setRoleOptions)
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
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    const validQuestions = questions.filter((q) => q.question.trim() && q.answer.trim())
    if (validQuestions.length === 0) {
      toast.error('At least one complete Q&A pair is required')
      return
    }

    setIsLoading(true)
    try {
      await api.createInterviewWithQuestions({
        title: title.trim(),
        company: company.trim() || undefined,
        role: role.trim() || undefined,
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
      <header className="flex items-center justify-between px-5 py-[13px] pb-[11px] border-b border-[var(--border)] flex-shrink-0 bg-[var(--bg-o92)] backdrop-blur-md">
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
            <h1 className="text-xl font-extrabold">New Interview Byte</h1>
            <p className="font-mono text-[9px] text-[var(--purple)] mt-1">
              // Share interview Q&A with the community
            </p>
          </div>

          {/* Title */}
          <div>
            <div className="font-mono text-[10px] tracking-[0.1em] text-[var(--t2)] mb-2">// TITLE</div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Meta Senior Engineer Interview — System Design Round"
              className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg px-4 py-3 font-mono text-[11px] text-[var(--t1)] outline-none transition-all placeholder:text-[var(--t3)] focus:border-[var(--purple)] focus:shadow-[0_0_0_3px_rgba(167,139,250,0.14)]"
            />
          </div>

          {/* Company + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-mono text-[10px] tracking-[0.1em] text-[var(--t2)] mb-2">// COMPANY</div>
              <CreatableDropdown
                options={companyOptions}
                value={company}
                onChange={setCompany}
                placeholder="e.g. Meta"
                accentColor="purple"
              />
            </div>
            <div>
              <div className="font-mono text-[10px] tracking-[0.1em] text-[var(--t2)] mb-2">// ROLE</div>
              <CreatableDropdown
                options={roleOptions}
                value={role}
                onChange={setRole}
                placeholder="e.g. Senior SWE"
                accentColor="purple"
              />
            </div>
          </div>

          {/* Questions */}
          <div>
            <div className="font-mono text-[10px] tracking-[0.1em] text-[var(--t2)] mb-3">
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
                      <div className="font-mono text-[10px] tracking-[0.1em] text-[var(--t2)] mb-1.5">QUESTION</div>
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
                      <div className="font-mono text-[10px] tracking-[0.1em] text-[var(--t2)] mb-1.5">ANSWER</div>
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
      </div>

      {/* Actions */}
      <div className="flex gap-3 px-5 py-4 border-t border-[var(--border)] flex-shrink-0">
        <button
          onClick={onBack}
          className="flex-1 py-[13px] border border-[var(--border-m)] rounded-lg font-mono text-[10px] font-bold tracking-[0.08em] text-[var(--t2)] transition-all hover:border-[var(--border-h)] hover:text-[var(--t1)]"
        >
          CANCEL
        </button>
        <button
          onClick={handlePost}
          disabled={!title.trim() || isLoading}
          className="flex-1 py-[13px] bg-gradient-to-br from-[var(--purple)] to-[#5b21b6] rounded-lg font-mono text-[10px] font-bold tracking-[0.1em] text-white shadow-[0_4px_24px_rgba(167,139,250,0.4)] transition-all hover:shadow-[0_8px_36px_rgba(167,139,250,0.5)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'POSTING...' : 'POST INTERVIEW →'}
        </button>
      </div>
    </PhoneFrame>
  )
}
