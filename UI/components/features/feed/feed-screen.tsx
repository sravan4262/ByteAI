"use client"

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'

import { FeedHeader } from './feed-header'
import { FeedFilters } from './feed-filters'
import { PostCard } from './post-card'
import * as api from '@/lib/api'
import type { Post } from '@/lib/api'
import { getMeCache } from '@/lib/user-cache'

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
  const [activeTab, setActiveTab] = useState('for_you')
  const [sortBy, setSortBy] = useState('relevant')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [activeStackFilter, setActiveStackFilter] = useState<string | null>(null)
  const [rawPosts, setRawPosts] = useState<Post[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isMobile = useIsMobile()

  // Seed currentUserId from cache immediately (no async wait), then verify with API
  useEffect(() => {
    const cached = getMeCache()
    if (cached) setCurrentUserId(cached.userId)
    // Still fetch from API in case cache is stale or not yet written
    api.getCurrentUser().then(u => { if (u) setCurrentUserId(u.id) })
  }, [])

  // Hydrate a post list: replace own posts with real profile data from MeCache
  const hydrateWithClerk = useCallback((fetched: Post[]): Post[] => {
    if (!currentUserId) return fetched
    const cache = getMeCache()
    const resolvedUsername = cache?.username || ''
    const resolvedDisplayName = cache?.displayName || resolvedUsername
    const resolvedAvatar = cache?.avatarUrl || null
    const initials = resolvedDisplayName[0]?.toUpperCase() || resolvedUsername[0]?.toUpperCase() || 'U'

    return fetched.map(p => {
      if (p.author.id !== currentUserId) return p
      return {
        ...p,
        author: {
          ...p.author,
          username: resolvedUsername || p.author.username,
          displayName: resolvedDisplayName || p.author.displayName,
          initials,
          avatarUrl: resolvedAvatar,
        },
      }
    })
  }, [currentUserId])

  // Fetch raw feed whenever tab/filter changes
  useEffect(() => {
    setIsLoading(true)
    api.getFeed({ filter: activeTab as 'for_you' | 'following' | 'trending', stackFilter: activeStackFilter ?? undefined })
      .then(({ posts: fetched }) => setRawPosts(fetched))
      .catch(() => toast.error('Failed to load feed'))
      .finally(() => setIsLoading(false))
  }, [activeTab, activeStackFilter])

  // Re-hydrate whenever Clerk user or currentUserId become available
  const posts = useMemo(() => hydrateWithClerk(rawPosts), [rawPosts, hydrateWithClerk])

  // Client-side sort on top of server-fetched posts
  const filteredPosts = useMemo(() => {
    let result = [...posts]

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
  }, [activeTab, sortBy, posts])

  const handleLike = async (postId: string) => {
    const post = rawPosts.find((p) => p.id === postId)
    if (!post) return
    const { isLiked } = await api.toggleLike(postId)
    if (isLiked) toast.success('Liked!')
    setRawPosts((prev) => prev.map((p) =>
      p.id === postId
        ? { ...p, isLiked, likes: Math.max(0, (p.likes || 0) + (isLiked ? 1 : -1)) }
        : p
    ))
  }

  const handleBookmark = async (postId: string) => {
    const post = rawPosts.find((p) => p.id === postId)
    if (!post) return
    const { isSaved } = await api.toggleBookmark(postId, post.type === 'interview' ? 'interview' : 'byte')
    setRawPosts(prev => prev.map((p) => (p.id === postId ? { ...p, isBookmarked: isSaved } : p)))
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

      {/* Posts feed */}
      {(
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
