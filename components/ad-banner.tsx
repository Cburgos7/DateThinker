"use client"

import { useEffect, useRef } from "react"

interface AdBannerProps {
  adSlot?: string
  adFormat?: "auto" | "horizontal" | "vertical" | "rectangle"
  className?: string
}

export function AdBanner({ adSlot = "1234567890", adFormat = "auto", className = "my-4 text-center" }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null)

  useEffect(() => {
    try {
      // Check if adsbygoogle is defined
      if (typeof window !== "undefined" && window.adsbygoogle) {
        // @ts-ignore
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      }
    } catch (error) {
      console.error("Error loading AdSense ad:", error)
    }
  }, [])

  return (
    <div className={className}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-5187820785541561"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
    </div>
  )
}

