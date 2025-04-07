import { NextApiRequest, NextApiResponse } from 'next'
import { refreshPlace } from "@/lib/search-utils"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log("Refresh API called")
    const { type, city, placeId, priceRange } = req.body
    console.log("Refresh request body:", req.body)

    if (!type || !city) {
      return res.status(400).json({ error: "Missing required parameters" })
    }

    const result = await refreshPlace(type, city, placeId, priceRange)
    console.log("Refresh result:", result)
    
    return res.status(200).json(result)
  } catch (error) {
    console.error("Error in refresh API:", error)
    return res.status(500).json(
      { error: error instanceof Error ? error.message : "Failed to refresh place" }
    )
  }
} 