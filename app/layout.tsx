import type React from "react"
import { AuthCheck } from "./auth-check"
import Script from "next/script"
import { Inter } from "next/font/google"
import "./globals.css" 
const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
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
      <body className={inter.className}>
        <AuthCheck />
        {children}
      </body>
    </html>
  )
}

