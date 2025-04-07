"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Copy, Check, Mail, Phone, Link, Share2, Calendar } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { DatePlan, DateSet } from "@/lib/types"
import { format } from "date-fns"

interface ShareDatePlanProps {
  dateSet: DatePlan | DateSet
  onClose?: () => void
}

export function ShareDatePlan({ dateSet, onClose }: ShareDatePlanProps) {
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
    let body = `I found this date plan on DateThinker and wanted to share it with you:\n\n`
    body += `Title: ${dateSet.title}\n`
    
    if ('date' in dateSet) {
      body += `Date: ${format(new Date(dateSet.date), "PPP")}\n`
      body += `Time: ${dateSet.start_time} - ${dateSet.end_time}\n\n`
    }
    
    body += `View the full plan here: ${shareUrl}`
    
    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`
  }

  const shareViaSMS = () => {
    let message = `Check out this date plan: ${dateSet.title}\n`
    
    if ('date' in dateSet) {
      message += `Date: ${format(new Date(dateSet.date), "PPP")}\n`
      message += `Time: ${dateSet.start_time} - ${dateSet.end_time}\n\n`
    }
    
    message += `View the full plan: ${shareUrl}`
    
    window.location.href = `sms:&body=${encodeURIComponent(message)}`
  }

  const addToCalendar = () => {
    if (!('date' in dateSet)) {
      toast({
        title: "Cannot add to calendar",
        description: "This date plan doesn't have a specific date and time set.",
        variant: "destructive",
      })
      return
    }

    const startDate = new Date(dateSet.date)
    const [startHours, startMinutes] = dateSet.start_time.split(':')
    startDate.setHours(parseInt(startHours), parseInt(startMinutes))

    const endDate = new Date(dateSet.date)
    const [endHours, endMinutes] = dateSet.end_time.split(':')
    endDate.setHours(parseInt(endHours), parseInt(endMinutes))

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(dateSet.title)}&dates=${startDate.toISOString().replace(/-|:|\.\d+/g, '')}/${endDate.toISOString().replace(/-|:|\.\d+/g, '')}&details=${encodeURIComponent(`View the full plan: ${shareUrl}`)}`
    window.open(calendarUrl, '_blank')
  }

  const handleClose = () => {
    setIsShareDialogOpen(false)
    onClose?.()
  }

  return (
    <Dialog open={isShareDialogOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Date Plan</DialogTitle>
          <DialogDescription>
            Share this date plan with your friends and family using any of the options below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Input readOnly value={shareUrl} />
            </div>
            <Button size="sm" className="px-3" onClick={copyToClipboard}>
              <span className="sr-only">Copy link</span>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="w-full" onClick={shareViaEmail}>
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            <Button variant="outline" className="w-full" onClick={shareViaSMS}>
              <Phone className="h-4 w-4 mr-2" />
              SMS
            </Button>
            {'date' in dateSet && (
              <Button variant="outline" className="w-full" onClick={addToCalendar}>
                <Calendar className="h-4 w-4 mr-2" />
                Add to Calendar
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={copyToClipboard}>
              <Link className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

