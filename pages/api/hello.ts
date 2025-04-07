import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
  message: string
  received?: any
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  console.log("[Hello API] Called with method:", req.method)
  console.log("[Hello API] Headers:", req.headers)
  
  if (req.method === 'GET') {
    res.status(200).json({ message: 'Hello from the API!' })
  } else if (req.method === 'POST') {
    console.log("[Hello API] Request body:", req.body)
    res.status(200).json({ message: 'Hello from the API!', received: req.body })
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
} 