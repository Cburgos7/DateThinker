'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateSetCard } from '@/components/date-set-card'
import { supabase } from '@/lib/supabase'

export default function DebugDateSetsPage() {
  const [userId, setUserId] = useState('a17c9b47-b462-4d96-8519-90b7601e76ec')
  const [dateSets, setDateSets] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDateSets = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log("Fetching date sets for user ID:", userId)
      
      if (!supabase) {
        setError("Supabase client not initialized")
        setLoading(false)
        return
      }
      
      // Direct query to get date sets by user ID
      const { data, error } = await supabase
        .from('date_sets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error("Error fetching date sets:", error)
        setError(`Failed to fetch date sets: ${error.message}`)
        return
      }
      
      console.log("Found date sets:", data.length)
      setDateSets(data)
    } catch (err) {
      console.error("Unexpected error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Debug Date Sets</h1>
      
      <div className="mb-6 flex gap-4 items-end">
        <div className="flex-1">
          <label className="block mb-2 text-sm font-medium">User ID</label>
          <Input
            value={userId}
            onChange={e => setUserId(e.target.value)}
            placeholder="Enter user ID"
            className="w-full"
          />
        </div>
        <Button onClick={fetchDateSets} disabled={loading}>
          {loading ? 'Loading...' : 'Fetch Date Sets'}
        </Button>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
          {error}
        </div>
      )}
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {dateSets.map(dateSet => (
          <DateSetCard key={dateSet.id} dateSet={dateSet} />
        ))}
      </div>
      
      {dateSets.length === 0 && !loading && !error && (
        <p className="text-center py-8 text-gray-500">No date sets found for this user ID.</p>
      )}
      
      <div className="mt-8 p-4 bg-gray-50 rounded-md">
        <h2 className="text-lg font-medium mb-2">Note</h2>
        <p className="text-sm text-gray-600">
          This page allows direct access to date sets by user ID without authentication.
          Use only for debugging purposes. The default ID shown is the test user ID.
        </p>
      </div>
    </div>
  )
} 