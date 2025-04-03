"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Loader2, AlertCircle } from "lucide-react"
import type { AutocompletePrediction } from "@/lib/google-places"

interface CityAutocompleteProps {
  value: string
  onChange: (value: string, placeId?: string) => void
  placeholder?: string
  className?: string
  required?: boolean
}

// Fallback list of US cities
const US_CITIES = [
  // Major cities from all states
  "New York, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Houston, TX",
  "Phoenix, AZ",
  "Philadelphia, PA",
  "San Antonio, TX",
  "San Diego, CA",
  "Dallas, TX",
  "San Jose, CA",
  "Austin, TX",
  "Jacksonville, FL",
  "Fort Worth, TX",
  "Columbus, OH",
  "San Francisco, CA",
  "Charlotte, NC",
  "Indianapolis, IN",
  "Seattle, WA",
  "Denver, CO",
  "Washington, DC",
  "Boston, MA",
  "El Paso, TX",
  "Nashville, TN",
  "Detroit, MI",
  "Oklahoma City, OK",
  "Portland, OR",
  "Las Vegas, NV",
  "Memphis, TN",
  "Louisville, KY",
  "Baltimore, MD",
  "Milwaukee, WI",
  "Albuquerque, NM",
  "Tucson, AZ",
  "Fresno, CA",
  "Sacramento, CA",
  "Mesa, AZ",
  "Kansas City, MO",
  "Atlanta, GA",
  "Long Beach, CA",
  "Colorado Springs, CO",
  "Raleigh, NC",
  "Miami, FL",
  "Virginia Beach, VA",
  "Omaha, NE",
  "Oakland, CA",
  "Minneapolis, MN",
  "Tulsa, OK",
  "Arlington, TX",
  "New Orleans, LA",
  "Wichita, KS",
  // Additional cities
  "Cleveland, OH",
  "Tampa, FL",
  "Bakersfield, CA",
  "Aurora, CO",
  "Honolulu, HI",
  "Anaheim, CA",
  "Santa Ana, CA",
  "Corpus Christi, TX",
  "Riverside, CA",
  "St. Louis, MO",
  "Lexington, KY",
  "Pittsburgh, PA",
  "Anchorage, AK",
  "Stockton, CA",
  "Cincinnati, OH",
  "St. Paul, MN",
  "Toledo, OH",
  "Newark, NJ",
  "Greensboro, NC",
  "Plano, TX",
  "Henderson, NV",
  "Lincoln, NE",
  "Buffalo, NY",
  "Fort Wayne, IN",
  "Jersey City, NJ",
  "Chula Vista, CA",
  "Orlando, FL",
  "St. Petersburg, FL",
  "Norfolk, VA",
  "Chandler, AZ",
  "Laredo, TX",
  "Madison, WI",
  "Durham, NC",
  "Lubbock, TX",
  "Winston-Salem, NC",
  "Garland, TX",
  "Glendale, AZ",
  "Hialeah, FL",
  "Reno, NV",
  "Baton Rouge, LA",
  "Irvine, CA",
  "Chesapeake, VA",
  "Irving, TX",
  "Scottsdale, AZ",
  "North Las Vegas, NV",
  "Fremont, CA",
  "Gilbert, AZ",
  "San Bernardino, CA",
  "Boise, ID",
  "Birmingham, AL",
  "Saint Paul, MN", // Added alternative spelling
]

export function CityAutocomplete({
  value,
  onChange,
  placeholder = "Enter your city...",
  className,
  required = false,
}: CityAutocompleteProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([])
  const [showPredictions, setShowPredictions] = useState(false)
  const [useFallback, setUseFallback] = useState(false)
  const [fallbackCities, setFallbackCities] = useState<string[]>([])
  const [apiError, setApiError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const predictionsRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Handle clicks outside the predictions dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        predictionsRef.current &&
        !predictionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowPredictions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Fetch autocomplete predictions when input changes
  useEffect(() => {
    if (!value.trim()) {
      setPredictions([])
      setFallbackCities([])
      setShowPredictions(false)
      setApiError(null)
      return
    }

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set a new timer to debounce API calls
    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true)
      setApiError(null)

      try {
        // Always prepare fallback cities as a backup
        filterFallbackCities(value)

        // Try to get predictions from our API route
        const response = await fetch(`/api/city-autocomplete?query=${encodeURIComponent(value)}`)

        if (!response.ok) {
          // Use fallback if API fails
          setUseFallback(true)
          setShowPredictions(fallbackCities.length > 0)
          throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()

        if (data.error) {
          // Use fallback if API returns an error
          setUseFallback(true)
          setShowPredictions(fallbackCities.length > 0)
          throw new Error(data.error)
        }

        if (data.predictions && data.predictions.length > 0) {
          setPredictions(data.predictions)
          setShowPredictions(true)
          setUseFallback(false)
        } else {
          // If no results from API, use fallback
          setUseFallback(true)
          setShowPredictions(fallbackCities.length > 0)
        }
      } catch (error) {
        console.warn("Using fallback city list:", error)

        // Set API error message (but don't show it prominently)
        if (error instanceof Error) {
          setApiError("Using local city list")
        } else {
          setApiError("Using local city list")
        }

        // Ensure fallback is used
        setUseFallback(true)
        setShowPredictions(fallbackCities.length > 0)
      } finally {
        setIsLoading(false)
      }
    }, 300) // 300ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [value])

  // Filter fallback cities based on input
  const filterFallbackCities = (input: string) => {
    const searchTerm = input.toLowerCase()

    // Handle common abbreviations
    let normalizedSearchTerm = searchTerm
    if (searchTerm === "st. paul" || searchTerm === "st paul") {
      normalizedSearchTerm = "saint paul"
    }

    // First try to find cities that start with the search term
    let filtered = US_CITIES.filter(
      (city) => city.toLowerCase().startsWith(searchTerm) || city.toLowerCase().startsWith(normalizedSearchTerm),
    )

    // If we don't have enough results, include cities that contain the search term
    if (filtered.length < 5) {
      const additionalCities = US_CITIES.filter(
        (city) =>
          (!city.toLowerCase().startsWith(searchTerm) && city.toLowerCase().includes(searchTerm)) ||
          (!city.toLowerCase().startsWith(normalizedSearchTerm) && city.toLowerCase().includes(normalizedSearchTerm)),
      )
      filtered = [...filtered, ...additionalCities]
    }

    // Limit to 8 results for better UX
    filtered = filtered.slice(0, 8)

    setFallbackCities(filtered)
    setShowPredictions(filtered.length > 0)
    setUseFallback(true)
  }

  const handlePredictionClick = (prediction: AutocompletePrediction | string) => {
    if (typeof prediction === "string") {
      // Handle fallback city
      onChange(prediction)
    } else {
      // Handle Google Places prediction
      onChange(prediction.description, prediction.place_id)
    }
    setShowPredictions(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
          onFocus={() => {
            if (value.trim() && (predictions.length > 0 || fallbackCities.length > 0)) {
              setShowPredictions(true)
            }
          }}
          required={required}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {apiError && (
        <div className="mt-1 text-xs text-red-500 flex items-center">
          <AlertCircle className="h-3 w-3 mr-1" />
          <span>Using local city list: {apiError}</span>
        </div>
      )}

      {showPredictions && (
        <div
          ref={predictionsRef}
          className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg"
        >
          <ul className="max-h-60 overflow-auto py-1 text-base">
            {useFallback
              ? // Render fallback cities
                fallbackCities.map((city) => (
                  <li
                    key={city}
                    className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                    onClick={() => handlePredictionClick(city)}
                  >
                    {city}
                  </li>
                ))
              : // Render Google Places predictions
                predictions.map((prediction) => (
                  <li
                    key={prediction.place_id}
                    className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                    onClick={() => handlePredictionClick(prediction)}
                  >
                    <div className="font-medium">{prediction.structured_formatting.main_text}</div>
                    <div className="text-sm text-muted-foreground">
                      {prediction.structured_formatting.secondary_text}
                    </div>
                  </li>
                ))}
          </ul>
        </div>
      )}
    </div>
  )
}

