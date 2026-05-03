'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { reportContent, type ReportableContentType } from '@/lib/api/client'
import { toast } from 'sonner'

const REASONS = [
  'Spam',
  'Harassment',
  'Hate speech',
  'Sexual content',
  'Off-topic',
  'Misinformation',
  'Other',
] as const

type Reason = (typeof REASONS)[number]

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentType: ReportableContentType
  contentId: string
}

export function ReportDialog({ open, onOpenChange, contentType, contentId }: ReportDialogProps) {
  const [reason, setReason] = useState<Reason>('Spam')
  const [freeText, setFreeText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (reason === 'Other' && !freeText.trim()) {
      toast.error('Please describe the issue')
      return
    }
    setSubmitting(true)
    try {
      const res = await reportContent(contentType, contentId, reason, freeText)
      if (res) {
        toast.success("Thanks — we'll review this within 24 hours")
        onOpenChange(false)
        setFreeText('')
        setReason('Spam')
      } else {
        toast.error('Could not submit report. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this {contentType.replace(/_/g, ' ')}</DialogTitle>
          <DialogDescription>
            Reports route to our moderation team for review within 24 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-2 block">Reason</Label>
            <RadioGroup value={reason} onValueChange={(v) => setReason(v as Reason)}>
              {REASONS.map((r) => (
                <div key={r} className="flex items-center space-x-2">
                  <RadioGroupItem id={`r-${r}`} value={r} />
                  <Label htmlFor={`r-${r}`} className="font-normal cursor-pointer">{r}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="free-text" className="mb-2 block">
              Additional context {reason === 'Other' && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="free-text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder={reason === 'Other' ? 'Please describe the issue' : 'Optional details'}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
