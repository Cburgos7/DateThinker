'use client'

import { useEffect } from 'react'
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[calc(100vh-140px)]">
        <h1 className="text-4xl font-bold mb-4">Something went wrong!</h1>
        <p className="text-lg mb-8 text-center max-w-md">
          We apologize for the inconvenience. Please try again later.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-gradient-to-r from-rose-500 to-purple-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
      <Footer />
    </>
  )
} 