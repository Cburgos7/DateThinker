export interface PocketBaseSchema {
  users: {
    id: string
    email: string
    name?: string
    avatar?: string
    created: string
    updated: string
    verified: boolean
    subscriptionStatus: "free" | "premium" | "lifetime"
    subscriptionExpiry?: string
    stripeCustomerId?: string
  }

  favorites: {
    id: string
    user: string // Reference to users collection
    placeId: string
    name: string
    category: "restaurant" | "activity" | "drink" | "outdoor"
    address: string
    rating: number
    price: number
    photoUrl?: string
    created: string
  }

  userPreferences: {
    id: string
    user: string // Reference to users collection
    defaultCity?: string
    defaultFilters?: {
      restaurants: boolean
      activities: boolean
      drinks: boolean
      outdoors: boolean
    }
    defaultPriceRange?: number
    created: string
    updated: string
  }
}

