"use client"

import type React from "react"

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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"
import confetti from "canvas-confetti"

export default function Page() {
  const [city, setCity] = useState("")
  const [priceRange, setPriceRange] = useState(0) // 0 means no price filter
  const [mood, setMood] = useState<"romantic" | "casual" | "adventurous">("casual")
  const [favorites, setFavorites] = useState<string[]>([])
  const [filters, setFilters] = useState({
    restaurants: true,
    activities: false,
    drinks: false,
    outdoors: false,
  })
  const [results, setResults] = useState<{
    restaurant?: { name: string; rating: number; address: string; price: number; isOutdoor?: boolean }
    activity?: { name: string; rating: number; address: string; price: number; isOutdoor?: boolean }
    drink?: { name: string; rating: number; address: string; price: number; isOutdoor?: boolean }
  }>({})
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

    setResults({
      restaurant: {
        name: filters.outdoors ? "Garden Terrace Restaurant" : "Sample Restaurant",
        rating: 4.5,
        address: "123 Main St",
        price: priceRange,
        isOutdoor: filters.outdoors,
      },
      ...(filters.activities && {
        activity: {
          name: filters.outdoors ? "Botanical Gardens" : "Sample Activity",
          rating: 4.7,
          address: "456 Fun Ave",
          price: priceRange,
          isOutdoor: filters.outdoors,
        },
      }),
      ...(filters.drinks && {
        drink: {
          name: filters.outdoors ? "Rooftop Lounge" : "Sample Bar",
          rating: 4.3,
          address: "789 Drink Blvd",
          price: priceRange,
          isOutdoor: filters.outdoors,
        },
      }),
    })

    setIsLoading(false)
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    })
  }

  const handleSurpriseMe = () => {
    const randomFilters = {
      restaurants: Math.random() > 0.5,
      activities: Math.random() > 0.5,
      drinks: Math.random() > 0.5,
      outdoors: Math.random() > 0.5,
    }
    setFilters(randomFilters)
    setPriceRange(Math.floor(Math.random() * 3) + 1)
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

          {Object.keys(results).length > 0 && (
            <div className="grid gap-6">
              {results.restaurant && (
                <ResultCard
                  title="Restaurant"
                  result={results.restaurant}
                  onFavorite={() => {}}
                  isFavorite={favorites.includes("restaurant")}
                />
              )}
              {results.activity && (
                <ResultCard
                  title="Activity"
                  result={results.activity}
                  onFavorite={() => {}}
                  isFavorite={favorites.includes("activity")}
                />
              )}
              {results.drink && (
                <ResultCard
                  title="Drinks"
                  result={results.drink}
                  onFavorite={() => {}}
                  isFavorite={favorites.includes("drink")}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function ResultCard({
  title,
  result,
  onFavorite,
  isFavorite,
}: {
  title: string
  result: {
    name: string
    rating: number
    address: string
    price: number
    isOutdoor?: boolean
  }
  onFavorite: () => void
  isFavorite: boolean
}) {
  return (
    <Card className="transform transition-all hover:scale-[1.02] group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          {title === "Restaurant" && <Utensils className="h-4 w-4 text-rose-500" />}
          {title === "Activity" && <Dumbbell className="h-4 w-4 text-purple-500" />}
          {title === "Drinks" && <Wine className="h-4 w-4 text-blue-500" />}
          {result.isOutdoor && <TreePine className="h-4 w-4 text-emerald-500" />}
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={onFavorite} className="h-8 w-8 text-rose-500">
            <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
            <span className="sr-only">Favorite {title}</span>
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <RefreshCcw className="h-4 w-4" />
            <span className="sr-only">Refresh {title}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <h3 className="font-medium">{result.name}</h3>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {Array.from({ length: Math.round(result.rating) }).map((_, i) => (
                <span key={i} className="text-yellow-500">
                  ★
                </span>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              {Array.from({ length: result.price }).map((_, i) => (
                <span key={i} className="text-green-500">
                  $
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{result.address}</p>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardFooter>
    </Card>
  )
}

