"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Copy, Check, Mail, Phone } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { DatePlan, DateSet } from "@/lib/types"

interface ShareDatePlanProps {
  dateSet: DatePlan | DateSet
}

export function ShareDatePlan({ dateSet }: ShareDatePlanProps) {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const shareUrl = `${window.location.origin}/shared/${'share_id' in dateSet ? dateSet.share_id : dateSet.id}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast({
        title: "Copied to clipboard",
        description: "Share link has been copied to your clipboard.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      })
    }
  }

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Check out this date plan: ${dateSet.title}`)
    const body = encodeURIComponent(`I found this date plan on DateThinker and wanted to share it with you: ${shareUrl}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const shareViaSMS = () => {
    window.location.href = `sms:&body=${encodeURIComponent(`Check out this date plan: ${shareUrl}`)}`
  }

  return (
    <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Date Plan</DialogTitle>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <Input readOnly value={shareUrl} />
          </div>
          <Button size="sm" className="px-3" onClick={copyToClipboard}>
            <span className="sr-only">Copy link</span>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <Button variant="outline" className="w-full mr-2" onClick={shareViaEmail}>
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
          <Button variant="outline" className="w-full" onClick={shareViaSMS}>
            <Phone className="h-4 w-4 mr-2" />
            SMS
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

