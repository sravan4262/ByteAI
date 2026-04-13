"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X, ChevronDown, AlertTriangle } from 'lucide-react'
import { CodeEditor } from '@/components/ui/code-editor'
import { toast } from 'sonner'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { ByteAILogo } from '@/components/layout/byteai-logo'
import { ComposeInterviewScreen } from './compose-interview-screen'
import * as api from '@/lib/api'

type ComposeType = 'byte' | 'interview'

export function ComposeScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [composeType, setComposeType] = useState<ComposeType>(
    searchParams.get('type') === 'interview' ? 'interview' : 'byte'
  )
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [codeContent, setCodeContent] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('')
  const [reachEstimate, setReachEstimate] = useState(1200)
  const [isLoading, setIsLoading] = useState(false)
  const [showEscModal, setShowEscModal] = useState(false)

  useEffect(() => {
    if (content.length <= 10) return
    const fetchReach = async () => {
      const { reach } = await api.getReachEstimate(content, [])
      setReachEstimate(reach)
    }
    fetchReach()
  }, [content])

  // ESC → show confirmation modal if there's content
  useEffect(() => {
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
  }, [title, content, codeContent, router])

  const handleDiscardAndLeave = () => {
    setTitle('')
    setContent('')
    setCodeContent('')
    setShowEscModal(false)
    router.push('/feed')
  }

  if (composeType === 'interview') {
    return <ComposeInterviewScreen onBack={() => setComposeType('byte')} />
  }

  const handleSaveDraft = async () => {
    await api.saveDraft({
      content,
      code: codeContent ? { language: selectedLanguage, content: codeContent } : undefined,
      tags: [],
    })
    toast.success('Draft saved')
  }

  const handlePost = async () => {
    if (!content.trim()) return
    setIsLoading(true)
    try {
      await api.createPost({
        title: title.trim() || undefined,
        content,
        code: codeContent ? { language: selectedLanguage, content: codeContent } : undefined,
        tags: [],
      })
      toast.success('Byte posted!')
      router.push('/feed')
    } catch {
      toast.error('Failed to post')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PhoneFrame>
      {/* Header */}
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
        <div className="px-5 py-5 flex flex-col gap-5">
          <div>
            <h1 className="text-xl font-extrabold">New Byte</h1>
            <p className="font-mono text-[9px] text-[var(--t2)] mt-1">// Share your insight to 8,400+ AI devs</p>
          </div>

          {/* Title input */}
          <div>
            <span className="font-mono text-[8px] tracking-[0.1em] text-[var(--t3)]">// TITLE</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 120))}
              placeholder="Give your byte a clear title..."
              className="w-full mt-2 bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg px-4 py-3 font-mono text-[11px] text-[var(--t1)] outline-none transition-all placeholder:text-[var(--t3)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]"
            />
          </div>

          {/* Content textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[8px] tracking-[0.1em] text-[var(--t3)]">// CONTENT_BUFFER</span>
              <span className={`font-mono text-[8px] tracking-[0.1em] ${content.length >= 280 ? 'text-[var(--red)]' : 'text-[var(--accent)]'}`}>
                {content.length} / 300
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 300))}
              placeholder="Share a technique, pattern, or lesson learned..."
              className="w-full h-32 bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg px-4 py-3 font-mono text-[11px] text-[var(--t1)] outline-none resize-none transition-all placeholder:text-[var(--t3)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]"
            />
          </div>

          {/* Code snippet */}
          <CodeEditor
            value={codeContent}
            language={selectedLanguage}
            onChange={setCodeContent}
            onLanguageChange={setSelectedLanguage}
          />

          {/* Stats */}
          <div className="flex gap-4">
            <div className="flex-1 bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg px-4 py-3">
              <div className="font-mono text-[7px] tracking-[0.1em] text-[var(--t3)]">// REACH_EST</div>
              <div className="font-mono text-[14px] font-bold text-[var(--t1)] mt-1">
                {reachEstimate.toLocaleString()} <span className="text-[var(--green)]">↗</span>
              </div>
            </div>
            <div className="flex-1 bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg px-4 py-3">
              <div className="font-mono text-[7px] tracking-[0.1em] text-[var(--t3)]">// NOTIFY</div>
              <div className="flex mt-1">
                {['AX', 'SB', 'JD'].map((init, i) => (
                  <div
                    key={init}
                    className={`w-6 h-6 rounded-full border border-[var(--border-h)] flex items-center justify-center font-mono text-[7px] font-bold ${i > 0 ? '-ml-2' : ''} ${
                      i === 0 ? 'bg-gradient-to-br from-[#131b40] to-[#1e3580] text-[var(--cyan)]'
                        : i === 1 ? 'bg-gradient-to-br from-[#1e1040] to-[#3a1a90] text-[var(--purple)]'
                        : 'bg-gradient-to-br from-[#0a1e14] to-[#145840] text-[var(--green)]'
                    }`}
                  >
                    {init}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ESC discard confirmation modal */}
      {showEscModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--bg-o80)] backdrop-blur-sm rounded-[inherit]">
          <div className="w-[280px] bg-[var(--bg-card)] border border-[var(--border-m)] rounded-xl p-6 flex flex-col gap-4 shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={16} className="text-[var(--orange)] flex-shrink-0" />
              <span className="font-mono text-[11px] font-bold tracking-[0.07em] text-[var(--t1)]">DISCARD BYTE?</span>
            </div>
            <p className="font-mono text-[10px] text-[var(--t2)] leading-relaxed">
              Your draft will be cleared and you&apos;ll be taken back to the feed. This cannot be undone.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowEscModal(false)}
                className="flex-1 py-2.5 border border-[var(--border-m)] rounded-lg font-mono text-[10px] font-bold tracking-[0.07em] text-[var(--t2)] transition-all hover:border-[var(--border-h)] hover:text-[var(--t1)]"
              >
                KEEP EDITING
              </button>
              <button
                onClick={handleDiscardAndLeave}
                className="flex-1 py-2.5 bg-[var(--red)] rounded-lg font-mono text-[10px] font-bold tracking-[0.07em] text-white transition-all hover:opacity-90"
              >
                DISCARD →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 px-5 py-4 border-t border-[var(--border)] flex-shrink-0">
        <button
          onClick={handleSaveDraft}
          className="flex-1 py-[13px] border border-[var(--border-m)] rounded-lg font-mono text-[10px] font-bold tracking-[0.08em] text-[var(--t2)] transition-all hover:border-[var(--border-h)] hover:text-[var(--t1)]"
        >
          DRAFT
        </button>
        <button
          onClick={handlePost}
          disabled={!title.trim() || !content.trim() || isLoading}
          className="flex-1 py-[13px] bg-gradient-to-br from-[var(--accent)] to-[#1d4ed8] rounded-lg font-mono text-[10px] font-bold tracking-[0.1em] text-white shadow-[0_4px_24px_var(--accent-glow)] transition-all hover:shadow-[0_8px_36px_var(--accent-glow)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'POSTING...' : 'POST BYTE →'}
        </button>
      </div>
    </PhoneFrame>
  )
}
