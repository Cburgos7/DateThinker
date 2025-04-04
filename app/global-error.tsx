'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
          <h1 className="text-4xl font-bold mb-4 text-gray-800">Something went wrong!</h1>
          <p className="text-lg mb-8 text-center max-w-md text-gray-600">
            We apologize for the inconvenience. Please try again later.
          </p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-gradient-to-r from-rose-500 to-purple-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
} 