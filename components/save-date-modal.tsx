"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Calendar } from "@/components/ui/calendar-custom"
import * as dateFns from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { PlaceResult } from "@/lib/search-utils"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { robustGetUser } from "@/lib/supabase"
import { useAuth } from "@/app/auth-context"
import { useSupabaseToken } from "@/lib/use-supabase-token"
import { createClient } from "@/utils/supabase/client"

const formSchema = z.object({
  title: z.string().min(1, "Please enter a title"),
  date: z.date({
    required_error: "Please select a date",
  }),
  startTime: z.string().min(1, "Please select a start time"),
  endTime: z.string().min(1, "Please select an end time"),
  notes: z.string().optional(),
})

interface SaveDateModalProps {
  isOpen: boolean
  onClose: () => void
  places: PlaceResult[]
}

export function SaveDateModal({ isOpen, onClose, places }: SaveDateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()
  const { user, authStatus, lastAuthError } = useAuth()
  const { token } = useSupabaseToken()

  // Log auth status on mount and when it changes
  useEffect(() => {
    console.log("SaveDateModal auth status:", authStatus, "User ID:", user?.id || "none", "Error:", lastAuthError || "none");
  }, [authStatus, user, lastAuthError]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: `Date in ${places[0]?.address.split(",")[0] || "the city"}`,
      date: new Date(),
      startTime: "18:00",
      endTime: "22:00",
      notes: "",
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    setErrorMessage("")

    try {
      console.log("Starting form submission - User:", !!user, "Auth status:", authStatus);
      
      // Direct check for user existence rather than relying on auth status
      let userId = user?.id;
      
      if (!userId) {
        console.log("No user found, attempting to get user with robust method...");
        
        // Try to get user with robust method
        const robustUserResult = await robustGetUser();
        if (robustUserResult && robustUserResult.id) {
          userId = robustUserResult.id;
          console.log("Retrieved user with robust method:", userId);
        } else {
          console.error("Authentication failed - no user ID available");
          setErrorMessage("Unable to authenticate. Please sign out completely and sign in again.");
          toast({
            title: "Authentication Error",
            description: "Please sign out and sign back in to refresh your session.",
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }
      }
      
      // Force a short delay to ensure auth is fully processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if we have a token
      if (!token) {
        setErrorMessage("Authentication token not available. Please sign out and sign back in.")
        toast({
          title: "Authentication Error",
          description: "No authentication token available. Please sign out and sign back in.",
          variant: "destructive"
        })
        setIsSubmitting(false)
        return
      }
      
      // Format the date to YYYY-MM-DD
      const dateObj = new Date(values.date)
      const formattedDate = dateObj.toISOString().split('T')[0]

      // Report user status for debugging
      console.log("Proceeding with submission - User ID:", userId, "Auth status:", authStatus);
      
      console.log("Submitting form with values:", {
        title: values.title,
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
        notes: values.notes,
        places: places.length,
        userID: userId,
        authStatus
      })
      console.log("Places to save:", places)

      // Final safety check before submission
      if (!userId) {
        throw new Error("User ID is required but not available");
      }

      // Use direct Supabase client instead of server action
      const supabase = createClient();
      
      // Create the date set directly
      const { data, error } = await supabase
        .from('date_sets')
        .insert({
          user_id: userId,
          title: values.title,
          date: formattedDate,
          start_time: values.startTime,
          end_time: values.endTime,
          places,
          notes: values.notes || null,
          share_id: `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        setErrorMessage(error.message || "Failed to save date plan. Please try again.")
        toast({
          title: "Error saving date plan",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Date plan saved!",
        description: "Your date plan has been saved and is ready to view in your account.",
      })

      // Close the modal first
      onClose()
      
      // Then navigate to the date plans page
      // Use a small timeout to ensure the modal is closed before navigation
      setTimeout(() => {
        if (data?.id) {
          router.push(`/date-plans/${data.id}`)
        } else {
          // If no specific ID, go to the main date plans page
          router.push('/my-dates')
        }
      }, 100)
    } catch (error) {
      console.error("Error saving date set:", error)
      const errorMsg = error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      setErrorMessage(errorMsg)
      toast({
        title: "Error saving date plan",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Save Your Date Plan</DialogTitle>
          <DialogDescription>
            Save this set of places for your date. You can view and manage it later in your account.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">{errorMessage}</div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Romantic Evening Out" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? dateFns.format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional details about your date plan..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    These notes will be included with your date plan.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-rose-500 to-purple-500 hover:opacity-90"
              >
                {isSubmitting ? "Saving..." : "Save Date Plan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

