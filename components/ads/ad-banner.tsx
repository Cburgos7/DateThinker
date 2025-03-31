import { cn } from "@/lib/utils"
import { useRef } from "react"

interface AdBannerProps {
  adSlot: string
  adFormat: "horizontal" | "rectangle"
  className?: string
}

export function AdBanner({ adSlot, adFormat, className }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null)

  return (
    <div className={cn("w-full bg-gray-100 rounded-lg p-4 text-center", className)}>
      <div className="text-sm text-gray-500">Advertisement</div>
      <div className="mt-2">
        {/* Ad content would go here */}
        <div className="h-[90px] flex items-center justify-center bg-gray-200 rounded">
          Ad Slot: {adSlot}
        </div>
      </div>
    </div>
  )
} 