import { cn } from "@/lib/utils"
import { useRef, useEffect } from "react"

interface AdBannerProps {
  adSlot: string
  adFormat: "leaderboard" | "rectangle" | "skyscraper" | "billboard"
  className?: string
  showLabel?: boolean
}

export function AdBanner({ adSlot, adFormat, className, showLabel = true }: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null)
  const isInitialized = useRef(false)

  // Get dimensions based on ad format
  const getDimensions = () => {
    switch (adFormat) {
      case "leaderboard":
        return { width: 728, height: 90 }
      case "rectangle":
        return { width: 300, height: 250 }
      case "skyscraper":
        return { width: 160, height: 600 }
      case "billboard":
        return { width: 970, height: 250 }
      default:
        return { width: 728, height: 90 }
    }
  }

  const { width, height } = getDimensions()

  // Initialize AdSense ads when component mounts, but only once
  useEffect(() => {
    // Only run this once per component instance
    if (isInitialized.current) return;
    
    // Define the adsbygoogle object if it doesn't exist yet
    const isClient = typeof window !== 'undefined';
    
    if (isClient && adRef.current) {
      try {
        const adsbygoogle = (window as any).adsbygoogle || [];
        adsbygoogle.push({});
        isInitialized.current = true;
      } catch (error) {
        console.error('Error initializing ad:', error);
      }
    }
  }, []);

  return (
    <div className={cn(
      "mx-auto bg-gray-100 rounded-md overflow-hidden",
      className
    )}>
      {showLabel && <div className="text-xs text-gray-500 text-center py-1">Advertisement</div>}
      <div 
        ref={adRef}
        className="flex items-center justify-center"
        style={{ width: "100%", maxWidth: width, height, margin: "0 auto" }}
      >
        <ins className="adsbygoogle"
          style={{ display: "block", width: "100%", height: "100%" }}
          data-ad-client="ca-pub-YOUR_PUBLISHER_ID"
          data-ad-slot={adSlot}
          data-ad-format="auto"
          data-full-width-responsive="true">
        </ins>
      </div>
    </div>
  )
} 