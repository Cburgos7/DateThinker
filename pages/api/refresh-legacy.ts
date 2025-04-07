import type { NextApiRequest, NextApiResponse } from 'next'
import { refreshPlace } from '@/lib/search-utils'

type RefreshResponse = {
  error?: string
  id?: string
  name?: string
  rating?: number
  address?: string
  price?: number
  isOutdoor?: boolean
  photoUrl?: string
  openNow?: boolean
  category?: string
  placeId?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RefreshResponse>
) {
  console.log("[Refresh Legacy API] Called with method:", req.method)
  console.log("[Refresh Legacy API] Headers:", req.headers)
  
  if (req.method === 'POST') {
    try {
      console.log("[Refresh Legacy API] Request body:", req.body)
      
      if (!req.body.type || !req.body.city) {
        console.log("[Refresh Legacy API] Missing required parameters")
        return res.status(400).json({ error: "Type and city are required" })
      }
      
      const result = await refreshPlace(
        req.body.type,
        req.body.city,
        req.body.placeId,
        req.body.priceRange
      )
      
      console.log("[Refresh Legacy API] Refresh result:", result)
      return res.status(200).json(result)
    } catch (error) {
      console.error("[Refresh Legacy API] Error:", error)
      return res.status(500).json({ error: "Internal server error" })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
} 