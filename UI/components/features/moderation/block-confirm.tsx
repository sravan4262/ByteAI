'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { blockUser } from '@/lib/api/client'
import { toast } from 'sonner'

interface BlockConfirmProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetUserId: string
  targetUsername: string
  onBlocked?: () => void
}

export function BlockConfirm({
  open,
  onOpenChange,
  targetUserId,
  targetUsername,
  onBlocked,
}: BlockConfirmProps) {
  async function handleBlock() {
    try {
      await blockUser(targetUserId)
      toast.success(`Blocked @${targetUsername}`)
      onBlocked?.()
    } catch {
      toast.error('Could not block this user. Please try again.')
    }
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block @{targetUsername}?</AlertDialogTitle>
          <AlertDialogDescription>
            They won&apos;t see your posts and you won&apos;t see theirs. Existing follows
            will be removed in both directions. You can unblock anytime from
            Settings → Privacy → Blocked Users.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleBlock}>Block</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
