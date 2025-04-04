import "./globals.css"
import type React from "react"
import { AuthCheck } from "./auth-check"
import Script from "next/script"
import { Inter } from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
  preload: true,
})

export const metadata = {
  title: "DateThinker - Find Perfect Date Ideas",
  description: "Discover the perfect date spots in your city",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.className} font-sans`}>
      <head>
        <meta name="google-adsense-account" content="ca-pub-5187820785541561" />
        <Script
          id="adsbygoogle-init"
          strategy="afterInteractive"
          async
          src="https://pagead2.googlesyndirect.com/pagead/js/adsbygoogle.js?client=ca-pub-5187820785541561"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">
        <AuthCheck />
        {children}
      </body>
    </html>
  )
}

