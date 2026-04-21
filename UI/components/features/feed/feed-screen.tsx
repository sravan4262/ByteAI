"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import { useIsMobile } from '@/hooks/use-mobile'

import { FeedHeader } from './feed-header'
import { FeedFilters } from './feed-filters'
import { PostCard } from './post-card'
import * as api from '@/lib/api'
import type { Post } from '@/lib/api'
import { getMeCache } from '@/lib/user-cache'

const PAGE_SIZE = 20

interface FeedScreenProps {
  contentType?: 'bytes' | 'interviews'
}


export function FeedScreen({ contentType = 'bytes' }: FeedScreenProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') ?? 'for_you')
  const [activeStackFilter, setActiveStackFilter] = useState<string | null>(() => searchParams.get('stack'))
  const [rawPosts, setRawPosts] = useState<Post[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const isMobile = useIsMobile()
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cached = getMeCache()
    if (cached) setCurrentUserId(cached.userId)
    api.getCurrentUser().then(u => { if (u) setCurrentUserId(u.id) })
  }, [])

  const hydrateWithUserCache = useCallback((fetched: Post[]): Post[] => {
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

  // Tab or filter change — reset state and fetch page 1
  useEffect(() => {
    setIsLoading(true)
    setRawPosts([])
    setCurrentPage(1)
    setHasMore(false)
    api.getFeed({
      filter: activeTab as 'for_you' | 'following' | 'trending',
      stackFilter: activeStackFilter ?? undefined,
      page: 1,
      limit: PAGE_SIZE,
    })
      .then(({ posts: fetched, hasMore: more }) => {
        setRawPosts(fetched)
        setHasMore(more)
      })
      .catch(() => toast.error('Failed to load feed'))
      .finally(() => setIsLoading(false))
  }, [activeTab, activeStackFilter])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    const nextPage = currentPage + 1
    try {
      const { posts: fetched, hasMore: more } = await api.getFeed({
        filter: activeTab as 'for_you' | 'following' | 'trending',
        stackFilter: activeStackFilter ?? undefined,
        page: nextPage,
        limit: PAGE_SIZE,
      })
      setRawPosts(prev => [...prev, ...fetched])
      setCurrentPage(nextPage)
      setHasMore(more)
    } catch {
      toast.error('Failed to load more')
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, currentPage, activeTab, activeStackFilter])

  // Trigger loadMore when sentinel enters the viewport
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  const posts = useMemo(() => hydrateWithUserCache(rawPosts), [rawPosts, hydrateWithUserCache])

  const filteredPosts = useMemo(() => [...posts], [posts])

  useEffect(() => {
    if (filteredPosts.length === 0) return
    sessionStorage.setItem(
      'byteai_feed_context',
      JSON.stringify(filteredPosts.map((p) => ({
        id: p.id,
        title: p.title,
        username: p.author.username,
        role: p.author.role,
        company: p.author.company,
      })))
    )
  }, [filteredPosts])

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

  const updateUrl = useCallback((tab: string, stack: string | null) => {
    const params = new URLSearchParams()
    if (tab !== 'for_you') params.set('tab', tab)
    if (stack) params.set('stack', stack)
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : '?', { scroll: false })
  }, [router])

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    setActiveStackFilter(null)
    updateUrl(tabId, null)
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
        activeStackFilter={activeStackFilter}
        onTabChange={handleTabChange}
        onStackFilter={(stack) => { setActiveStackFilter(stack); updateUrl(activeTab, stack) }}
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
        <div className="flex flex-col gap-2 p-2">
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
            <>
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  activeTab={activeTab}
                  onLike={handleLike}
                  onBookmark={handleBookmark}
                  onShare={handleShare}
                  shouldTruncate={shouldTruncate(post)}
                />
              ))}

              {/* Sentinel div — IntersectionObserver fires loadMore when this enters viewport */}
              <div ref={sentinelRef} className="h-1" />

              {isLoadingMore && (
                <div className="flex justify-center py-6">
                  <div className="font-mono text-xs text-[var(--t2)] animate-pulse">LOADING MORE...</div>
                </div>
              )}

              {!hasMore && filteredPosts.length >= PAGE_SIZE && (
                <div className="flex justify-center py-6">
                  <div className="font-mono text-xs text-[var(--t2)]">— END —</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

    </>
  )
}
