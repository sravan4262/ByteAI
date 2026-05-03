'use client'

import { useEffect, useState } from 'react'
import { getMyBlocks, unblockUser, type BlockedUser } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'

export function BlockedUsersList() {
  const [items, setItems] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    setItems(await getMyBlocks(1, 50))
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function handleUnblock(userId: string, username: string) {
    try {
      await unblockUser(userId)
      toast.success(`Unblocked @${username}`)
      setItems((prev) => prev.filter((u) => u.id !== userId))
    } catch {
      toast.error('Could not unblock. Please try again.')
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (items.length === 0)
    return <p className="text-sm text-muted-foreground">You haven&apos;t blocked anyone.</p>

  return (
    <ul className="divide-y">
      {items.map((u) => (
        <li key={u.id} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={u.avatarUrl ?? undefined} alt={u.username} />
              <AvatarFallback>{u.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <div className="font-medium">{u.displayName || u.username}</div>
              <div className="text-muted-foreground">@{u.username}</div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => handleUnblock(u.id, u.username)}>
            Unblock
          </Button>
        </li>
      ))}
    </ul>
  )
}
