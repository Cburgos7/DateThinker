"use client"

import { useState, useEffect } from "react"
import {
  RefreshCcw,
  Search,
  Heart,
  Clock,
  Sparkles,
  DollarSign,
  TreePine,
  Utensils,
  Dumbbell,
  Wine,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"
import confetti from "canvas-confetti"

interface Place {
  name: string
  rating?: number
  address?: string
  type: "restaurant" | "activity" | "drink"
}

export default function Page() {
  const [city, setCity] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Place[]>([])
  const [filters, setFilters] = useState({
    restaurants: true,
    activities: true,
    drinks: true,
  })
  const [priceRange, setPriceRange] = useState(0) // 0 means no price filter
  const [favorites] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Time-based theming
  useEffect(() => {
    const hour = new Date().getHours()
    const root = document.documentElement
    if (hour >= 18 || hour < 6) {
      root.style.setProperty("--gradient-start", "rgb(255, 245, 250)")
      root.style.setProperty("--gradient-end", "rgb(255, 240, 245)")
    } else {
      root.style.setProperty("--gradient-start", "rgb(255, 250, 255)")
      root.style.setProperty("--gradient-end", "rgb(255, 245, 250)")
    }
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setResults([
      {
        name: filters.outdoors ? "Garden Terrace Restaurant" : "Sample Restaurant",
        rating: 4.5,
        address: "123 Main St",
        type: "restaurant",
      },
      ...(filters.activities ? [{
        name: filters.outdoors ? "Botanical Gardens" : "Sample Activity",
        rating: 4.7,
        address: "456 Fun Ave",
        type: "activity",
      }] : []),
      ...(filters.drinks ? [{
        name: filters.outdoors ? "Rooftop Lounge" : "Sample Bar",
        rating: 4.3,
        address: "789 Drink Blvd",
        type: "drink",
      }] : []),
    ])

    setIsLoading(false)
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    })
  }

  const handleSurpriseMe = async () => {
    if (!city) return
    
    setLoading(true)
    try {
      // Replace this with your actual API endpoint
      const response = await fetch(`/api/places?city=${encodeURIComponent(city)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filters }),
      })
      
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Error fetching places:", error)
    } finally {
      setLoading(false)
    }
  }

  const refreshItem = async (type: "restaurant" | "activity" | "drink") => {
    try {
      // Replace with your actual API endpoint
      const response = await fetch(`/api/places/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ city, type }),
      })
      
      const newItem = await response.json()
      
      setResults(prev => 
        prev.map(item => 
          item.type === type ? newItem : item
        )
      )
    } catch (error) {
      console.error(`Error refreshing ${type}:`, error)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--gradient-start)] transition-colors duration-1000">
      <div className="absolute inset-0 bg-grid-white/[0.015] bg-[size:20px_20px]" />
      <div className="container mx-auto px-4 py-8 relative">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-purple-500 animate-gradient">
              DateThinker
            </h1>
            <p className="text-muted-foreground text-lg">Discover the perfect date spots in your city</p>
          </div>

          <form onSubmit={handleSearch} className="space-y-8">
            <div className="relative group">
              <Input
                type="text"
                placeholder="Enter your city..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="pl-10 h-12 text-lg transition-all border-2 group-hover:border-rose-300"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              <Toggle
                pressed={filters.restaurants}
                onPressedChange={(pressed) => setFilters((prev) => ({ ...prev, restaurants: pressed }))}
                className="data-[state=on]:bg-rose-200 data-[state=on]:text-rose-800"
              >
                <Utensils className="h-4 w-4 mr-2" />
                Restaurants
              </Toggle>
              <Toggle
                pressed={filters.activities}
                onPressedChange={(pressed) => setFilters((prev) => ({ ...prev, activities: pressed }))}
                className="data-[state=on]:bg-purple-200 data-[state=on]:text-purple-800"
              >
                <Dumbbell className="h-4 w-4 mr-2" />
                Activities
              </Toggle>
              <Toggle
                pressed={filters.drinks}
                onPressedChange={(pressed) => setFilters((prev) => ({ ...prev, drinks: pressed }))}
                className="data-[state=on]:bg-blue-200 data-[state=on]:text-blue-800"
              >
                <Wine className="h-4 w-4 mr-2" />
                Drinks
              </Toggle>
              <Toggle
                pressed={filters.outdoors}
                onPressedChange={(pressed) => setFilters((prev) => ({ ...prev, outdoors: pressed }))}
                className="data-[state=on]:bg-emerald-200 data-[state=on]:text-emerald-800"
              >
                <TreePine className="h-4 w-4 mr-2" />
                Outdoors
              </Toggle>
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              <Toggle
                pressed={priceRange === 1}
                onPressedChange={() => setPriceRange((prev) => (prev === 1 ? 0 : 1))}
                className="data-[state=on]:bg-green-200 data-[state=on]:text-green-800"
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Budget
              </Toggle>
              <Toggle
                pressed={priceRange === 2}
                onPressedChange={() => setPriceRange((prev) => (prev === 2 ? 0 : 2))}
                className="data-[state=on]:bg-green-200 data-[state=on]:text-green-800"
              >
                <DollarSign className="h-4 w-4 mr-1" />
                <DollarSign className="h-4 w-4" />
                Moderate
              </Toggle>
              <Toggle
                pressed={priceRange === 3}
                onPressedChange={() => setPriceRange((prev) => (prev === 3 ? 0 : 3))}
                className="data-[state=on]:bg-green-200 data-[state=on]:text-green-800"
              >
                <DollarSign className="h-4 w-4 mr-1" />
                <DollarSign className="h-4 w-4 mr-1" />
                <DollarSign className="h-4 w-4" />
                Luxury
              </Toggle>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                className="flex-1 h-12 text-lg bg-gradient-to-r from-rose-500 to-purple-500 hover:opacity-90"
              >
                {isLoading ? <div className="animate-pulse">Finding perfect spots...</div> : "Find Date Ideas"}
              </Button>
              <Button type="button" variant="outline" onClick={handleSurpriseMe} className="group">
                <Sparkles className="h-5 w-5 mr-2 group-hover:animate-spin" />
                Surprise Me
              </Button>
            </div>
          </form>

          {results.length > 0 && (
            <div className="grid gap-6">
              {results.map((place, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{place.name}</h3>
                        {place.rating && (
                          <p className="text-sm text-gray-600">Rating: {place.rating}/5</p>
                        )}
                        {place.address && (
                          <p className="text-sm text-gray-600">{place.address}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => refreshItem(place.type)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

