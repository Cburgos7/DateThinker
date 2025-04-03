import "./globals.css"
import type React from "react"
import { AuthCheck } from "./auth-check"
import Script from "next/script"
import { Inter } from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"]
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
    <html lang="en" className="font-sans">
      <head>
        <meta name="google-adsense-account" content="ca-pub-5187820785541561" />
        <Script
          id="adsbygoogle-init"
          strategy="afterInteractive"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5187820785541561"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <AuthCheck />
        {children}
      </body>
    </html>
  )
}

