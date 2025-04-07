import { NextApiRequest, NextApiResponse } from 'next'
import { searchPlaces } from "@/lib/search-utils"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log("Search API called")
    console.log("Search request body:", req.body)

    if (!req.body.city) {
      return res.status(400).json({ error: "City is required" })
    }

    const results = await searchPlaces(req.body)
    console.log("Search results:", results)
    
    return res.status(200).json(results)
  } catch (error) {
    console.error("Error in search API:", error)
    return res.status(500).json(
      { error: error instanceof Error ? error.message : "Failed to search places" }
    )
  }
} 