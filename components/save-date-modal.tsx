"use client"

import { useState } from "react"
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
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { CalendarIcon, Clock } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { saveDateSet } from "@/app/actions/date-sets"
import type { PlaceResult } from "@/app/actions"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

const formSchema = z.object({
  title: z.string().min(1, "Please enter a title"),
  date: z.date({
    required_error: "Please select a date",
  }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please enter a valid time (HH:MM)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please enter a valid time (HH:MM)"),
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
    setErrorMessage(null)

    try {
      // Log the form values for debugging
      console.log("Submitting form with values:", values)
      console.log("Places to save:", places)

      const formattedDate = format(values.date, "yyyy-MM-dd")

      const result = await saveDateSet(
        values.title,
        formattedDate,
        values.startTime,
        values.endTime,
        places,
        values.notes,
      )

      if (!result.success) {
        setErrorMessage(result.error || "Failed to save date plan. Please try again.")
        toast({
          title: "Error saving date plan",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Date plan saved!",
        description: "Your date plan has been saved and is ready to share or add to your calendar.",
      })

      // Navigate to the date plans page
      router.push(`/date-plans/${result.dateSetId}`)
      onClose()
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save Your Date Plan</DialogTitle>
          <DialogDescription>
            Save this set of places for your date. You can add it to your calendar and share it later.
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button" // Add this line to explicitly set the button type
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            onClick={(e) => e.preventDefault()} // Add this to prevent any form submission
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Start Time</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input placeholder="18:00" {...field} />
                        </FormControl>
                        <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>End Time</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input placeholder="22:00" {...field} />
                        </FormControl>
                        <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
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
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    These notes will be included when you share the plan or add it to your calendar.
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

