import type { z } from "zod"

/**
 * Safely handle API responses with proper error handling
 */
export async function safelyFetchData<T>(url: string, options: RequestInit = {}, schema?: z.ZodType<T>): Promise<T> {
  try {
    // Set default headers for security
    const secureOptions: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...(options.headers || {}),
      },
    }

    const response = await fetch(url, secureOptions)

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Validate response data if schema is provided
    if (schema) {
      return schema.parse(data)
    }

    return data as T
  } catch (error) {
    console.error("API request failed:", error)
    throw error
  }
}

/**
 * Rate limiting utility to prevent API abuse
 */
const apiCallTimestamps: Record<string, number[]> = {}

export function checkRateLimit(key: string, maxCalls: number, timeWindowMs: number): boolean {
  const now = Date.now()
  const timestamps = apiCallTimestamps[key] || []

  // Filter out timestamps outside the time window
  const recentCalls = timestamps.filter((timestamp) => now - timestamp < timeWindowMs)

  // Update the timestamps
  apiCallTimestamps[key] = [...recentCalls, now]

  // Check if rate limit is exceeded
  return recentCalls.length < maxCalls
}

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  return input.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
}

/**
 * Securely handle environment variables
 */
export function getEnvVariable(key: string, isRequired = true): string {
  const value = process.env[key]

  if (isRequired && !value) {
    throw new Error(`Environment variable ${key} is required but not set`)
  }

  return value || ""
}

/**
 * Get client-safe environment variables (only NEXT_PUBLIC_ ones)
 */
export function getClientSafeEnvVariable(key: string): string | undefined {
  if (!key.startsWith("NEXT_PUBLIC_")) {
    console.warn(`Attempted to access non-public env variable ${key} on the client`)
    return undefined
  }

  return process.env[key]
}

