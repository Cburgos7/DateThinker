"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import * as dateFns from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = {
  mode?: "single" | "range"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  initialFocus?: boolean
  className?: string
  classNames?: Record<string, string>
  showOutsideDays?: boolean
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  selected,
  onSelect,
  disabled,
  mode = "single",
  initialFocus,
  ...props
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(selected || new Date())

  const days = React.useMemo(() => {
    const start = dateFns.startOfMonth(currentMonth)
    const end = dateFns.endOfMonth(currentMonth)
    return dateFns.eachDayOfInterval({ start, end })
  }, [currentMonth])

  const previousMonth = React.useCallback(() => {
    setCurrentMonth(dateFns.subMonths(currentMonth, 1))
  }, [currentMonth])

  const nextMonth = React.useCallback(() => {
    setCurrentMonth(dateFns.addMonths(currentMonth, 1))
  }, [currentMonth])

  const handleDayClick = React.useCallback(
    (day: Date) => {
      if (disabled && disabled(day)) return
      onSelect?.(day)
    },
    [disabled, onSelect]
  )

  return (
    <div className={cn("p-3", className)}>
      <div className="flex justify-center pt-1 relative items-center">
        <button
          type="button"
          onClick={previousMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-medium">
          {dateFns.format(currentMonth, "MMMM yyyy")}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-7 text-center text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-muted-foreground rounded-md w-8 font-normal">
            {day}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 text-sm">
        {days.map((day, dayIdx) => {
          const isSelected = selected ? dateFns.isSameDay(day, selected) : false
          const isDisabled = disabled ? disabled(day) : false
          const isCurrentMonth = dateFns.isSameMonth(day, currentMonth)
          const isCurrentDay = dateFns.isToday(day)

          return (
            <div
              key={day.toString()}
              className={cn(
                "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                !isCurrentMonth && !showOutsideDays && "invisible",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
                isCurrentDay && !isSelected && "bg-accent text-accent-foreground rounded-md",
                isDisabled && "text-muted-foreground opacity-50",
                !isDisabled && !isSelected && "hover:bg-accent hover:text-accent-foreground rounded-md"
              )}
              onClick={() => handleDayClick(day)}
            >
              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-8 w-8 p-0 font-normal aria-selected:opacity-100",
                  isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  isCurrentDay && !isSelected && "bg-accent text-accent-foreground",
                  isDisabled && "text-muted-foreground opacity-50"
                )}
              >
                {dateFns.format(day, "d")}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar } 