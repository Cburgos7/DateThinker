"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Share2, Copy, Check, UserPlus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { shareDateSet, getDateSetSharedUsers } from "@/lib/date-sets"
import { supabase } from "@/lib/supabase"

interface ShareDateDialogProps {
  dateSetId: string
  shareId: string
  userId: string
  children?: React.ReactNode
}

export function ShareDateDialog({ dateSetId, shareId, userId, children }: ShareDateDialogProps) {
  const [open, setOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState("")
  const [shareUrl, setShareUrl] = useState("")
  const [isSharing, setIsSharing] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [sharedUsers, setSharedUsers] = useState<Array<{ id: string; full_name: string | null; permission_level: string }>>([])
  const [isOwner, setIsOwner] = useState(false)
  const [isCheckingOwnership, setIsCheckingOwnership] = useState(true)

  // Define functions with useCallback before they're used in useEffect
  const checkOwnership = useCallback(async () => {
    setIsCheckingOwnership(true)
    try {
      if (!supabase) return
      
      // Query the date_sets table to see if this user owns this date set
      const { data, error } = await supabase
        .from('date_sets')
        .select('user_id')
        .eq('id', dateSetId)
        .single()
        
      if (error) {
        console.error("Error checking ownership:", error)
        return
      }
      
      const isDateOwner = data?.user_id === userId
      console.log("User is date owner:", isDateOwner)
      setIsOwner(isDateOwner)
    } catch (error) {
      console.error("Error checking ownership:", error)
    } finally {
      setIsCheckingOwnership(false)
    }
  }, [dateSetId, userId])

  const loadSharedUsers = useCallback(async () => {
    // Only try to load shared users if the current user is the owner and we're not checking ownership
    if (!isOwner || isCheckingOwnership) return
    
    try {
      if (!supabase) {
        console.error("Supabase client not initialized")
        return
      }
      
      console.log("Loading shared users for:", { dateSetId, userId })
      
      if (!dateSetId || !userId) {
        console.error("Missing required parameters:", { dateSetId, userId })
        return
      }
      
      const users = await getDateSetSharedUsers(dateSetId, userId)
      console.log("Shared users loaded:", users)
      setSharedUsers(users || [])
    } catch (error) {
      console.error("Error loading shared users:", error)
      // Don't let this error break the UI
      setSharedUsers([])
      
      // Show a toast notification instead of breaking the UI
      toast({
        title: "Couldn't load shared users",
        description: "There was an error loading the list of users this date plan is shared with",
        variant: "destructive",
      })
    }
  }, [dateSetId, userId, isOwner, isCheckingOwnership])

  useEffect(() => {
    if (open) {
      // Generate the share URL
      const baseUrl = window.location.origin
      setShareUrl(`${baseUrl}/shared/${shareId}`)
      
      // Check if current user is the owner
      checkOwnership()
    }
  }, [open, shareId, checkOwnership])
  
  // Separate effect to load shared users only when ownership is determined
  useEffect(() => {
    if (open && isOwner && !isCheckingOwnership) {
      loadSharedUsers()
    }
  }, [open, isOwner, isCheckingOwnership, loadSharedUsers])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setIsCopied(true)
        toast({
          title: "Link copied to clipboard",
          description: "You can now paste it anywhere",
        })
        setTimeout(() => setIsCopied(false), 3000)
      })
      .catch((err) => {
        console.error("Error copying text: ", err)
        toast({
          title: "Failed to copy link",
          description: "Please try again",
          variant: "destructive",
        })
      })
  }

  const handleShareByEmail = async () => {
    // Only owners can share by email
    if (!isOwner || !shareEmail.trim()) return
    
    setIsSharing(true)
    
    try {
      if (!supabase) {
        throw new Error("Database connection unavailable")
      }
      
      console.log("Looking up user by email:", shareEmail.trim());
      
      // Look up user in profiles table
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', shareEmail.trim())
        .limit(1);
        
      if (profileError) {
        console.error("Error looking up profile:", profileError);
        throw new Error("Could not find user profile");
      }
      
      if (!profiles || profiles.length === 0) {
        console.log("No user found with email:", shareEmail);
        toast({
          title: "User not found",
          description: "Please ensure the email is registered in DateThinker",
          variant: "destructive",
        });
        return;
      }
      
      const recipientId = profiles[0].id;
      console.log("Found user, sharing with:", recipientId);
      
      // Share the date plan
      const success = await shareDateSet(dateSetId, userId, recipientId, "view");
      
      if (success) {
        toast({
          title: "Date plan shared",
          description: `Successfully shared with ${shareEmail}`,
        });
        setShareEmail("");
        await loadSharedUsers();
      } else {
        throw new Error("Failed to share date plan");
      }
    } catch (error) {
      console.error("Error sharing date plan:", error);
      toast({
        title: "Error sharing date plan",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="default" size="sm">
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Date Plan</DialogTitle>
        </DialogHeader>
        
        {isCheckingOwnership ? (
          <div className="py-8 text-center">
            <div className="inline-block animate-spin h-6 w-6 border-2 border-current border-t-transparent text-gray-400 rounded-full"></div>
            <p className="mt-2 text-sm text-gray-500">Loading share options...</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Share Link Section - always visible */}
            <div className="space-y-2">
              <Label>Share via Link</Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="flex-grow" />
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {/* Share with User Section - only for owner */}
            {isOwner && (
              <div className="space-y-2">
                <Label>Share with User</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Enter email address" 
                    type="email" 
                    value={shareEmail} 
                    onChange={(e) => setShareEmail(e.target.value)} 
                    className="flex-grow"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleShareByEmail} 
                    disabled={isSharing || !shareEmail.trim()}
                    className="flex-shrink-0"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                </div>
              </div>
            )}
            
            {/* Currently Shared With Section - only for owner */}
            {isOwner && sharedUsers.length > 0 && (
              <div className="space-y-2 mt-4">
                <Label>Currently Shared With</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {sharedUsers.map((user) => (
                    <div key={user.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                      <span>{user.full_name || user.id}</span>
                      <Badge variant="outline">{user.permission_level}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Message for non-owners */}
            {!isOwner && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-200">
                <p className="text-yellow-800 text-sm">
                  You can share this date plan using the link above, but only the plan owner can directly share with other users.
                </p>
              </div>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 