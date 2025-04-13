'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/auth-context'
import { Button } from '@/components/ui/button'
import { DateSetCard } from '@/components/date-set-card'

export default function DirectFetchPage() {
  const { user } = useAuth()
  const [dataSets, setDataSets] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>({})

  const fetchData = async () => {
    if (!user) {
      setError("No authenticated user")
      return
    }

    if (!supabase) {
      setError("Supabase client not initialized")
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      // First get the count to see if we have any data
      console.log("Getting count for user:", user.id)
      const countResult = await supabase
        .from('date_sets')
        .select('count')
      
      console.log("Count result:", countResult)
      setDebugInfo(prev => ({ ...prev, countResult }))
      
      // Now get the full data
      console.log("Fetching full data for user:", user.id)
      const { data, error } = await supabase
        .from('date_sets')
        .select('*')
        .eq('user_id', user.id)
      
      if (error) {
        console.error("Error fetching data:", error)
        setError(`Error: ${error.message}`)
        setDebugInfo(prev => ({ ...prev, error }))
      } else {
        console.log("Retrieved data:", data)
        setDataSets(data || [])
        setDebugInfo(prev => ({ ...prev, data }))
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      setError(`Unexpected error: ${String(err)}`)
      setDebugInfo(prev => ({ ...prev, unexpectedError: String(err) }))
    } finally {
      setLoading(false)
    }
  }

  // Try to fetch automatically on page load if the user is already authenticated
  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Direct Data Fetch Debug</h1>
      
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">User Info</h2>
        <p>User ID: {user ? user.id : 'Not authenticated'}</p>
        <p>Email: {user ? user.email : 'N/A'}</p>
        <div className="mt-4">
          <Button 
            onClick={fetchData} 
            disabled={loading || !user}
          >
            {loading ? 'Loading...' : 'Fetch Data Again'}
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 p-4 rounded-lg text-red-700 border border-red-200">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Date Sets ({dataSets.length})</h2>
        {dataSets.length === 0 ? (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p>No date sets found. Try creating one first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dataSets.map((dateSet) => (
              <DateSetCard 
                key={dateSet.id} 
                dateSet={dateSet} 
              />
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Debug Info</h2>
        <pre className="bg-gray-800 text-white p-4 rounded-lg overflow-auto max-h-[400px] text-sm">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>
    </div>
  )
} 