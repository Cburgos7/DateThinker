import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import Script from "next/script"

// Use 'force-dynamic' to prevent static generation
// This is the key setting that will fix the cookie errors
export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "DateThinker",
  description: "Plan your perfect date",
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google AdSense Script */}
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
          data-ad-client={process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID}
        />
      </head>
      <body className={inter.className}>
        <Providers>
          <div id="__next">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}

