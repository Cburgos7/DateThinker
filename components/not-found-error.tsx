'use client'

import Link from 'next/link'

export default function NotFoundError() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <h1 className="text-4xl font-bold mb-4 text-gray-800">404 - Page Not Found</h1>
      <p className="text-lg mb-8 text-center max-w-md text-gray-600">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link 
        href="/" 
        className="px-6 py-3 bg-gradient-to-r from-rose-500 to-purple-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
      >
        Return to Home
      </Link>
    </div>
  )
} 