import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const GOOGLE_PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; // Ensure this is correctly loaded

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { city, filters } = req.body;

  console.log('GOOGLE_API_KEY:', GOOGLE_API_KEY); // Verify the API key
  console.log('City:', city); // Log the city parameter
  console.log('Filters:', filters); // Log the filters parameter

  if (!city) {
    return res.status(400).json({ error: 'City parameter is required' });
  }

  const types = [];
  if (filters.restaurants) types.push('restaurant');
  if (filters.activities) types.push('tourist_attraction');
  if (filters.drinks) types.push('bar');

  const apiUrl = `${GOOGLE_PLACES_API_URL}?query=${types.join('|')}+in+${city}&key=${GOOGLE_API_KEY}`;

  try {
    const response = await axios.get(apiUrl);

    if (response.status !== 200) {
      console.error(`HTTP error! status: ${response.status}, body: ${response.data}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = response.data;
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching date ideas:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to fetch date ideas', details: errorMessage });
  }
}