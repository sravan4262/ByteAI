"use client"

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'
import { useUser } from '@clerk/nextjs'
import { Avatar } from '@/components/layout/avatar'
import { FeedHeader } from './feed-header'
import { FeedFilters } from './feed-filters'
import { FollowingList } from './following-list'
import { PostCard } from './post-card'
import { mockFollowing } from '@/lib/mock-data'
import * as api from '@/lib/api'
import type { Post, User } from '@/lib/api'

interface FeedScreenProps {
  contentType?: 'bytes' | 'interviews'
}

function parseTime(timeStr: string): number {
  const num = parseInt(timeStr)
  if (timeStr.includes('m')) return num
  if (timeStr.includes('h')) return num * 60
  if (timeStr.includes('d')) return num * 60 * 24
  return 0
}

export function FeedScreen({ contentType = 'bytes' }: FeedScreenProps) {
  const { user: clerkUser } = useUser()
  const [activeTab, setActiveTab] = useState('for_you')
  const [sortBy, setSortBy] = useState('relevant')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [activeStackFilter, setActiveStackFilter] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedFollower, setSelectedFollower] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isMobile = useIsMobile()

  // Fetch current user's backend ID for post authorship hydration
  useEffect(() => {
    api.getCurrentUser().then(u => { if (u) setCurrentUserId(u.id) })
  }, [])

  useEffect(() => {
    setIsLoading(true)
    api.getFeed({ filter: activeTab as 'for_you' | 'following' | 'trending', stackFilter: activeStackFilter ?? undefined })
      .then(({ posts: fetched }) => {
        // Hydrate own posts with real Clerk profile data
        const hydrated = fetched.map(p => {
          if (clerkUser && currentUserId && p.author.id === currentUserId) {
            const firstName = clerkUser.firstName ?? ''
            const lastName = clerkUser.lastName ?? ''
            const fullName = [firstName, lastName].filter(Boolean).join(' ')
            return {
              ...p,
              author: {
                ...p.author,
                username: clerkUser.username ?? p.author.username,
                displayName: fullName || clerkUser.username || p.author.displayName,
                initials: ((firstName[0] ?? '') + (lastName[0] ?? '')).toUpperCase() || (clerkUser.username?.[0]?.toUpperCase() ?? 'U'),
                avatarUrl: clerkUser.imageUrl ?? null,
              },
            }
          }
          return p
        })
        setPosts(hydrated)
      })
      .catch(() => toast.error('Failed to load feed'))
      .finally(() => setIsLoading(false))
  }, [activeTab, activeStackFilter])

  // Client-side sort on top of server-fetched posts
  const filteredPosts = useMemo(() => {
    let result = activeTab === 'following' && selectedFollower
      ? posts.filter((p) => p.author.id === selectedFollower.id)
      : [...posts]

    if (activeTab === 'for_you') {
      if (sortBy === 'newest') {
        result = [...result].sort((a, b) => parseTime(a.createdAt) - parseTime(b.createdAt))
      } else if (sortBy === 'oldest') {
        result = [...result].sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt))
      }
    }

    // Persist feed order so the detail page can show real prev/next navigation
    if (result.length > 0) {
      sessionStorage.setItem(
        'byteai_feed_context',
        JSON.stringify(result.map((p) => ({
          id: p.id,
          title: p.title,
          username: p.author.username,
          role: p.author.role,
          company: p.author.company,
        })))
      )
    }

    return result
  }, [activeTab, sortBy, selectedFollower, posts])

  const handleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId)
    if (!post) return
    const { isLiked } = await api.toggleLike(postId)
    if (isLiked) toast.success('Liked!')
    setPosts((prev) => prev.map((p) =>
      p.id === postId
        ? { ...p, isLiked, likes: Math.max(0, (p.likes || 0) + (isLiked ? 1 : -1)) }
        : p
    ))
  }

  const handleBookmark = async (postId: string) => {
    const post = posts.find((p) => p.id === postId)
    if (!post) return
    const { isSaved } = await api.toggleBookmark(postId, post.type === 'interview' ? 'interview' : 'byte')
    setPosts(posts.map((p) => (p.id === postId ? { ...p, isBookmarked: isSaved } : p)))
    toast.success(isSaved ? 'Saved to bookmarks' : 'Removed from bookmarks')
  }

  const handleShare = async (postId: string) => {
    await api.sharePost(postId)
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`)
      toast.success('Link copied to clipboard')
    } else {
      toast.success('Shared!')
    }
  }

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    setSelectedFollower(null)
    setActiveStackFilter(null)
  }

  const shouldTruncate = (post: Post) => {
    if (isMobile) return true
    return post.body.length > 280 || (post.code?.content.length ?? 0) > 160
  }

  return (
    <>
      <FeedHeader contentType={contentType} />

      <FeedFilters
        activeTab={activeTab}
        sortBy={sortBy}
        showSortDropdown={showSortDropdown}
        activeStackFilter={activeStackFilter}
        onTabChange={handleTabChange}
        onSortChange={(sort) => { setSortBy(sort); setShowSortDropdown(false) }}
        onToggleSortDropdown={() => setShowSortDropdown(!showSortDropdown)}
        onStackFilter={setActiveStackFilter}
      />

      {/* Following: user list */}
      {activeTab === 'following' && !selectedFollower && (
        <FollowingList users={mockFollowing} onSelectUser={setSelectedFollower} />
      )}

      {/* Following: selected user header */}
      {activeTab === 'following' && selectedFollower && (
        <div className="border-b border-[var(--border)] bg-[var(--bg-el)] flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 xl:px-16 py-3">
            <button onClick={() => setSelectedFollower(null)} className="flex items-center gap-3 w-full">
              <span className="font-mono text-[11px] text-[var(--accent)]">← BACK</span>
              <Avatar
                initials={selectedFollower.initials}
                size="sm"
                variant={selectedFollower.id === '2' ? 'purple' : 'green'}
              />
              <div className="flex-1 min-w-0 text-left">
                <div className="font-mono text-xs font-bold text-[var(--t1)]">
                  @{selectedFollower.username}&apos;s BYTES
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Posts feed */}
      {(activeTab !== 'following' || selectedFollower) && (
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
          <div className="max-w-4xl mx-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="font-mono text-xs text-[var(--t2)] animate-pulse">LOADING BYTES...</div>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
                <div className="font-mono text-base text-[var(--t1)] mb-2">NO BYTES FOUND</div>
                <div className="font-mono text-xs text-[var(--t2)]">
                  {activeTab === 'following' ? "This user hasn't posted any Bytes yet." : 'Try adjusting your filters.'}
                </div>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  activeTab={activeTab}
                  onLike={handleLike}
                  onBookmark={handleBookmark}
                  onShare={handleShare}
                  shouldTruncate={shouldTruncate(post)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* FAB */}
      <Link
        href="/compose"
        className="fixed bottom-6 right-6 md:right-8 lg:right-12 z-10 w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#1d4ed8] flex items-center justify-center text-white shadow-[0_4px_20px_var(--accent-glow)] transition-all hover:scale-110 hover:shadow-[0_8px_36px_var(--accent-glow)]"
      >
        <Plus size={22} />
      </Link>
    </>
  )
}
