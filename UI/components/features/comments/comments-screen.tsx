"use client"

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Avatar } from '@/components/layout/avatar'
import type { Comment, Post } from '@/lib/api'

interface CommentsScreenProps {
  post: Post
  comments: Comment[]
}

export function CommentsScreen({ post, comments }: CommentsScreenProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6 lg:py-4 border-b border-[var(--border)] bg-[rgba(5,5,14,0.92)] backdrop-blur-md">
        <button
          onClick={() => router.push(`/post/${post.id}`)}
          className="flex items-center gap-1 font-mono text-[9px] lg:text-[10px] text-[var(--t2)] border border-[var(--border-m)] rounded-full px-3 py-2 transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <ChevronLeft size={12} /> BACK TO BYTE
        </button>
        <span className="font-mono text-[8px] lg:text-[9px] text-[var(--green)] bg-[var(--green-d)] border border-[rgba(16,217,160,0.2)] px-2 py-[3px] rounded shadow-[0_0_8px_rgba(16,217,160,0.08)]">
          COMMENTS
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
        <div className="max-w-4xl mx-auto px-4 py-5 lg:px-8 lg:py-6 flex flex-col gap-5">
          {/* Post summary */}
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-el)] p-5 lg:p-6">
            <div className="flex items-center gap-3 mb-4">
              <Avatar
                initials={post.author.initials}
                size="md"
                variant={post.author.id === '1' ? 'cyan' : post.author.id === '4' ? 'purple' : 'green'}
              />
              <div>
                <div className="font-mono text-xs lg:text-sm font-bold text-[var(--t1)] flex items-center gap-2">
                  @{post.author.username}
                  {post.author.isVerified && (
                    <span className="text-[9px] text-[var(--accent)]">✦</span>
                  )}
                </div>
                <div className="font-mono text-[8px] lg:text-[10px] text-[var(--t2)] mt-1 tracking-[0.04em]">
                  {post.author.role} @ {post.author.company}
                </div>
              </div>
            </div>
            <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight leading-tight mb-3">{post.title}</h1>
            <p className="text-sm lg:text-base leading-relaxed text-[var(--t2)]">{post.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="font-mono text-[8px] lg:text-[9px] py-1 px-2 rounded-full border border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg)]">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-el)] p-5 lg:p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-mono text-[8px] lg:text-[9px] tracking-[0.2em] text-[var(--t2)] mb-1">DISCUSSION THREAD</p>
                <h2 className="font-mono text-lg lg:text-xl font-bold text-[var(--t1)]">
                  {comments.length} COMMENT{comments.length === 1 ? '' : 'S'}
                </h2>
              </div>
              <span className="font-mono text-[9px] lg:text-[10px] text-[var(--accent)]">SORT: TOP ↓</span>
            </div>

            <div className="space-y-4">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-[var(--border-m)] bg-gradient-to-br from-[#1a1f2f] to-[#16243f] flex items-center justify-center font-mono font-bold text-xs text-[var(--accent)]">
                          {comment.author.initials}
                        </div>
                        <div>
                          <p className="font-mono text-[10px] lg:text-[11px] font-bold text-[var(--t1)]">@{comment.author.username}</p>
                          <p className="font-mono text-[8px] lg:text-[9px] text-[var(--t3)]">{comment.createdAt}</p>
                        </div>
                      </div>
                      <span className="font-mono text-[9px] lg:text-[10px] text-[var(--green)]">+{comment.votes}</span>
                    </div>
                    <p className="font-mono text-[11px] lg:text-sm leading-relaxed text-[var(--t2)]">{comment.content}</p>
                    {comment.badge && (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--accent)] bg-[rgba(59,130,246,0.08)] px-3 py-2 text-[var(--accent)] text-[10px]">
                        {comment.badge}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center text-[var(--t2)]">
                  <p className="font-mono text-[11px] lg:text-sm">
                    No comments yet for this byte. Add the first insight and keep the conversation going.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
