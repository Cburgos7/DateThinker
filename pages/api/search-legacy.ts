import type { NextApiRequest, NextApiResponse } from 'next'
import { searchPlaces } from '@/lib/search-utils'

type SearchResponse = {
  error?: string
  restaurant?: any
  activity?: any
  drink?: any
  outdoor?: any
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchResponse>
) {
  console.log("[Search Legacy API] Called with method:", req.method)
  console.log("[Search Legacy API] Headers:", req.headers)
  
  if (req.method === 'POST') {
    try {
      console.log("[Search Legacy API] Request body:", req.body)
      
      if (!req.body.city) {
        console.log("[Search Legacy API] Missing city parameter")
        return res.status(400).json({ error: "City is required" })
      }
      
      const results = await searchPlaces({
        city: req.body.city,
        filters: req.body.filters,
        priceRange: req.body.priceRange
      })
      
      console.log("[Search Legacy API] Search results:", results)
      return res.status(200).json(results)
    } catch (error) {
      console.error("[Search Legacy API] Error:", error)
      return res.status(500).json({ error: "Internal server error" })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
} 