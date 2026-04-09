"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Briefcase, Bell, Heart, Bookmark, Share2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { Avatar } from '@/components/layout/avatar'
import { CodeBlock } from '@/components/code-block'
import { SearchableDropdown } from '@/components/ui/searchable-dropdown'
import { mockInterviewPosts, sortOptions } from '@/lib/mock-data'
import * as api from '@/lib/api'
import type { Post } from '@/lib/api'

function parseTime(timeStr: string): number {
  const num = parseInt(timeStr)
  if (timeStr.includes('m')) return num
  if (timeStr.includes('h')) return num * 60
  if (timeStr.includes('d')) return num * 60 * 24
  return 0
}

export function InterviewsScreen() {
  const router = useRouter()
  const [sortBy, setSortBy] = useState('relevant')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [companyFilter, setCompanyFilter] = useState<string | null>(null)
  const [technologyFilter, setTechnologyFilter] = useState<string | null>(null)
  const [posts, setPosts] = useState(mockInterviewPosts)

  const companies = Array.from(new Set(posts.map((post) => post.author.company)))
  const technologyOptions = Array.from(
    new Set(posts.flatMap((post) => post.tags.map((tag) => tag.replace('#', ''))))
  )

  const filteredPosts = useMemo(() => {
    let result = [...posts]
    if (companyFilter) result = result.filter((p) => p.author.company === companyFilter)
    if (technologyFilter) {
      result = result.filter(
        (p) =>
          p.tags.some((t) => t.toUpperCase().includes(technologyFilter.toUpperCase())) ||
          p.author.techStack?.some((s) => s.toUpperCase().includes(technologyFilter.toUpperCase()))
      )
    }
    if (sortBy === 'newest') result = result.sort((a, b) => parseTime(a.createdAt) - parseTime(b.createdAt))
    else if (sortBy === 'oldest') result = result.sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt))
    return result
  }, [companyFilter, technologyFilter, sortBy, posts])

  const handleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId)
    if (!post) return
    if (post.isLiked) await api.unlikePost(postId)
    else { await api.likePost(postId); toast.success('Liked!') }
    setPosts(posts.map((p) => p.id === postId ? { ...p, isLiked: !p.isLiked, likes: (p.likes || 0) + (p.isLiked ? -1 : 1) } : p))
  }

  const handleBookmark = async (postId: string) => {
    const post = posts.find((p) => p.id === postId)
    if (!post) return
    await api.bookmarkPost(postId)
    const nowBookmarked = !post.isBookmarked
    setPosts(posts.map((p) => p.id === postId ? { ...p, isBookmarked: nowBookmarked } : p))
    toast.success(nowBookmarked ? 'Saved' : 'Removed from bookmarks')
  }

  const handleShare = async (postId: string) => {
    await api.sharePost(postId)
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`)
      toast.success('Link copied')
    }
  }

  return (
    <PhoneFrame>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 lg:px-6 lg:py-4 border-b border-[var(--border)] flex-shrink-0 bg-[rgba(5,5,14,0.95)] backdrop-blur-md">
        <div>
          <h1 className="font-mono text-xs lg:text-sm font-bold tracking-[0.07em] flex items-center gap-2">
            <Briefcase size={14} className="text-[var(--purple)]" /> INTERVIEWS
          </h1>
          <div className="font-mono text-[7px] lg:text-[9px] tracking-[0.1em] text-[var(--t2)] mt-0.5">
            PREP GUIDES & SYSTEM DESIGN
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-[30px] h-[30px] lg:w-9 lg:h-9 rounded-full bg-[var(--bg-el)] border border-[var(--border-m)] flex items-center justify-center relative transition-all hover:border-[var(--border-h)]">
            <Bell size={14} className="text-[var(--t2)]" />
            <span className="absolute top-[3px] right-[3px] w-[7px] h-[7px] bg-[var(--accent)] rounded-full border-[1.5px] border-[var(--bg)]" />
          </button>
          <Avatar initials="AX" size="xs" />
        </div>
      </header>

      {/* Filter controls */}
      <div className="flex-shrink-0 bg-[rgba(5,5,14,0.8)] backdrop-blur-sm border-b border-[var(--border)] relative z-20">
        <div className="flex flex-wrap items-center gap-3 px-4 lg:px-6 py-3">
          {/* Company filter */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] tracking-[0.12em] text-[var(--t3)]">COMPANY</span>
            <SearchableDropdown
              options={companies.slice().sort((a, b) => a.localeCompare(b)).map((c) => ({ value: c, label: c }))}
              value={companyFilter}
              onChange={setCompanyFilter}
              placeholder="COMPANY"
              allLabel="ALL COMPANIES"
              accentColor="purple"
            />
          </div>

          {/* Technology filter */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] tracking-[0.12em] text-[var(--t3)]">TECH</span>
            <SearchableDropdown
              options={technologyOptions.slice().sort((a, b) => a.localeCompare(b)).map((t) => ({ value: t, label: t }))}
              value={technologyFilter}
              onChange={setTechnologyFilter}
              placeholder="TECHNOLOGY"
              allLabel="ALL TECH"
              accentColor="cyan"
            />
          </div>

          <div className="flex-1" />

          {/* Reset */}
          {(companyFilter || technologyFilter) && (
            <button
              onClick={() => { setCompanyFilter(null); setTechnologyFilter(null) }}
              className="font-mono text-[8px] lg:text-[9px] tracking-[0.08em] px-3 py-2 rounded-full border border-[var(--border-m)] text-[var(--t2)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              RESET
            </button>
          )}

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="font-mono text-[8px] lg:text-[9px] tracking-[0.06em] text-[var(--t2)] hover:text-[var(--accent)] flex items-center gap-1 px-3 py-2 border border-[var(--border-m)] rounded-lg bg-[var(--bg-el)]"
            >
              SORT: {sortOptions.find((s) => s.id === sortBy)?.label} ↓
            </button>
            {showSortDropdown && (
              <div className="absolute top-full right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg z-20 min-w-[160px]">
                {sortOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => { setSortBy(option.id); setShowSortDropdown(false) }}
                    className={`w-full text-left font-mono text-[8px] lg:text-[9px] px-3 py-2 transition-all ${
                      sortBy === option.id ? 'text-[var(--accent)] bg-[var(--accent-d)]' : 'text-[var(--t2)] hover:text-[var(--t1)] hover:bg-white/5'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Posts feed */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="font-mono text-sm text-[var(--t1)] mb-2">NO POSTS FOUND</div>
            <div className="font-mono text-[10px] text-[var(--t2)]">Try adjusting your filters.</div>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <article key={post.id} className="px-4 lg:px-6 pt-4 lg:pt-5 pb-4 flex flex-col gap-3 border-b border-[var(--border)] relative">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(167,139,250,0.08)] to-transparent" />

              <div className="flex items-start gap-3">
                <Avatar
                  initials={post.author.initials}
                  size="sm"
                  variant={post.author.id === '1' ? 'cyan' : post.author.id === '4' ? 'purple' : 'green'}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] lg:text-xs font-bold text-[var(--t1)] flex items-center gap-1.5">
                    @{post.author.username}
                    {post.author.isVerified && <span className="text-[8px] text-[var(--accent)]">✦</span>}
                  </div>
                  <div className="font-mono text-[8px] lg:text-[9px] text-[var(--t2)] mt-0.5 tracking-[0.04em]">
                    {post.author.role} @ {post.author.company}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono text-[7px] lg:text-[8px] text-[var(--t3)]">{post.createdAt}</span>
                  {post.views && (
                    <span className="font-mono text-[7px] text-[var(--purple)]">{post.views.toLocaleString()} views</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-[7px] text-[var(--purple)] bg-[rgba(167,139,250,0.1)] border border-[rgba(167,139,250,0.2)] px-2 py-1 rounded flex items-center gap-1">
                  <Briefcase size={9} /> INTERVIEW PREP
                </span>
              </div>

              <h2 className="text-base lg:text-lg font-extrabold leading-tight tracking-tight">{post.title}</h2>
              <p className="text-xs lg:text-sm leading-relaxed text-[var(--t2)]">{post.body}</p>

              {post.code && (
                <CodeBlock
                  code={post.code.content}
                  language={post.code.language}
                  filename={post.code.filename}
                  showLineNumbers={false}
                  maxHeight="200px"
                />
              )}

              <div className="flex gap-[5px] flex-wrap">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[8px] py-[3px] px-2 rounded border border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg-el)] cursor-pointer hover:border-[var(--purple)] hover:text-[var(--purple)] hover:bg-[rgba(167,139,250,0.1)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="border-t border-[var(--border)] -mx-4 lg:-mx-6">
                <button
                  onClick={() => router.push(`/post/${post.id}`)}
                  className="w-full flex items-center justify-between px-4 lg:px-6 py-[11px] font-mono text-[9px] lg:text-[10px] font-bold tracking-[0.08em] text-[var(--purple)] bg-gradient-to-r from-[rgba(167,139,250,0.09)] to-[rgba(167,139,250,0.04)] border-b border-[var(--border)] transition-all hover:bg-[rgba(167,139,250,0.15)] group"
                >
                  VIEW_FULL_BYTE
                  <span className="flex items-center gap-1.5 text-[11px] transition-all group-hover:gap-[10px]">
                    <span className="font-mono text-[8px] text-[var(--t2)]">💬 {post.comments}</span>
                    →
                  </span>
                </button>

                <div className="flex">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex-1 flex items-center justify-center gap-[5px] font-mono text-[8px] tracking-[0.05em] py-[9px] px-1 transition-all hover:-translate-y-px ${
                      post.isLiked ? 'text-[var(--red)]' : 'text-[var(--t2)] hover:text-[var(--purple)]'
                    }`}
                  >
                    <Heart size={12} fill={post.isLiked ? 'currentColor' : 'none'} />
                    <span className="font-bold text-[9px] text-[var(--t1)]">{post.likes || 0}</span>
                  </button>
                  <button
                    onClick={() => handleBookmark(post.id)}
                    className={`flex-1 flex items-center justify-center gap-[5px] font-mono text-[8px] tracking-[0.05em] py-[9px] px-1 transition-all hover:-translate-y-px ${
                      post.isBookmarked ? 'text-[var(--accent)]' : 'text-[var(--t2)] hover:text-[var(--purple)]'
                    }`}
                  >
                    <Bookmark size={12} fill={post.isBookmarked ? 'currentColor' : 'none'} /> SAVE
                  </button>
                  <button
                    onClick={() => handleShare(post.id)}
                    className="flex-1 flex items-center justify-center gap-[5px] font-mono text-[8px] tracking-[0.05em] text-[var(--t2)] py-[9px] px-1 transition-all hover:text-[var(--purple)] hover:-translate-y-px"
                  >
                    <Share2 size={12} /> SHARE
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* FAB */}
      <Link
        href="/compose"
        className="fixed bottom-6 right-6 lg:right-12 z-10 w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-[var(--purple)] to-[#5b21b6] flex items-center justify-center text-white shadow-[0_4px_20px_rgba(167,139,250,0.4)] transition-all hover:scale-110 hover:shadow-[0_8px_36px_rgba(167,139,250,0.5)]"
      >
        <Plus size={22} />
      </Link>
    </PhoneFrame>
  )
}
