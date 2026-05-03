'use client'

import { useState } from 'react'
import { MoreHorizontal, Flag, ShieldOff } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ReportDialog } from './report-dialog'
import { BlockConfirm } from './block-confirm'
import type { ReportableContentType } from '@/lib/api/client'

interface OverflowMenuProps {
  contentType: ReportableContentType
  contentId: string
  /** When true, the menu is hidden (own content). */
  isOwnContent?: boolean
  /** Author of the content — shown only when blocking is offered. */
  authorUserId?: string
  authorUsername?: string
  /** Default false — pass true on profile pages so the menu also includes a Block option. */
  showBlock?: boolean
  onBlocked?: () => void
}

export function OverflowMenu({
  contentType,
  contentId,
  isOwnContent,
  authorUserId,
  authorUsername,
  showBlock,
  onBlocked,
}: OverflowMenuProps) {
  const [reportOpen, setReportOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)

  if (isOwnContent) return null

  const canBlock = showBlock && authorUserId && authorUsername

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setReportOpen(true)}>
            <Flag className="mr-2 h-4 w-4" />
            Report
          </DropdownMenuItem>
          {canBlock && (
            <DropdownMenuItem onClick={() => setBlockOpen(true)}>
              <ShieldOff className="mr-2 h-4 w-4" />
              Block @{authorUsername}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        contentType={contentType}
        contentId={contentId}
      />

      {canBlock && (
        <BlockConfirm
          open={blockOpen}
          onOpenChange={setBlockOpen}
          targetUserId={authorUserId!}
          targetUsername={authorUsername!}
          onBlocked={onBlocked}
        />
      )}
    </>
  )
}
