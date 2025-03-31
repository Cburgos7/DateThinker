"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Copy, Check, Mail, Phone } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import type { DateSet } from "@/lib/date-sets"

export function ShareDatePlan({ dateSet }: { dateSet: DateSet }) {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(true)
  const [copied, setCopied] = useState(false)

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/shared/${dateSet.share_id}`
      : `/shared/${dateSet.share_id}`

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast({
        title: "Link copied!",
        description: "Share link has been copied to your clipboard.",
      })

      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShareSMS = () => {
    const message = `Check out my date plan "${dateSet.title}" on DateThinker: ${shareUrl}`
    if (typeof window !== "undefined") {
      window.open(`sms:?body=${encodeURIComponent(message)}`)
    }
  }

  const handleShareEmail = () => {
    const subject = `Date Plan: ${dateSet.title}`
    const body = `Hi,\n\nI wanted to share this date plan with you: "${dateSet.title}"\n\nDate: ${dateSet.date}\nTime: ${dateSet.start_time} - ${dateSet.end_time}\n\nYou can view the full details here: ${shareUrl}\n\nHope you like it!`

    if (typeof window !== "undefined") {
      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
    }
  }

  return (
    <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share Your Date Plan</DialogTitle>
          <DialogDescription>Share this date plan with your date or friends.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label htmlFor="share-link" className="text-sm font-medium">
              Share Link
            </label>
            <div className="flex items-center space-x-2">
              <Input id="share-link" value={shareUrl} readOnly className="flex-1" />
              <Button onClick={handleCopyLink} variant="outline" size="icon">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Share via</h3>
            <div className="flex space-x-2">
              <Button onClick={handleShareEmail} variant="outline" className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button onClick={handleShareSMS} variant="outline" className="flex-1">
                <Phone className="h-4 w-4 mr-2" />
                SMS
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

