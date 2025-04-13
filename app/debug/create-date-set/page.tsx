'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/app/auth-context'
import { supabase } from '@/lib/supabase'
import { useSupabaseToken } from '@/lib/use-supabase-token'
import { v4 as uuidv4 } from 'uuid'

interface ResponseState {
  policies?: any;
  // other properties
}

export default function CreateDateSetDebugPage() {
  const { user } = useAuth()
  const { token } = useSupabaseToken()
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<ResponseState | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const createTestDateSet = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!user) {
        setError("No user is logged in")
        setLoading(false)
        return
      }
      
      if (!supabase) {
        setError("Supabase client not initialized")
        setLoading(false)
        return
      }
      
      // Log RLS policies first
      console.log("Checking RLS policies for date_sets table...")
      try {
        const { data: policies } = await supabase.rpc('get_policies_for_table', { table_name: 'date_sets' })
        console.log("Current policies:", policies)
        setResponse((prev: ResponseState) => ({ ...prev, policies }))
      } catch (policyError) {
        console.log("Could not check policies:", policyError)
      }
      
      // Create a simple test date set
      const dateSetData = {
        id: uuidv4(),
        user_id: user.id,
        title: `Test Date Set ${new Date().toISOString()}`,
        date: new Date().toISOString().split('T')[0],
        start_time: '19:00',
        end_time: '21:00',
        places: [
          {
            id: `place_${Date.now()}`,
            name: 'Test Restaurant',
            address: '123 Test Street',
            category: 'restaurant',
            rating: 4.5,
            price_level: 2
          }
        ],
        share_id: `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        notes: 'This is a test date set created for debugging',
      }
      
      // Insert directly using the client
      console.log("Inserting test date set:", dateSetData)
      const { data, error } = await supabase
        .from('date_sets')
        .insert(dateSetData)
        .select()
        .single()
      
      if (error) {
        console.error("Failed to create date set:", error)
        setError(`Failed to create date set: ${error.message}`)
        setResponse({ error })
      } else {
        console.log("Successfully created date set:", data)
        setResponse({ data })
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Debug: Create Date Set</h1>
      
      <div className="mb-6 bg-gray-50 p-4 rounded">
        <h2 className="text-lg font-medium mb-2">User Status</h2>
        <p>Current User: {user ? user.id : 'Not logged in'}</p>
        <p>Auth Token: {token ? `${token.substring(0, 15)}...` : 'Not available'}</p>
      </div>
      
      <Button 
        onClick={createTestDateSet} 
        disabled={loading || !user}
        className="mb-6"
      >
        {loading ? 'Creating...' : 'Create Test Date Set'}
      </Button>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}
      
      {response && (
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-2">Response</h2>
          <pre className="bg-gray-800 text-white p-4 rounded overflow-auto max-h-[400px]">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-gray-50 rounded-md">
        <h2 className="text-lg font-medium mb-2">Note</h2>
        <p className="text-sm text-gray-600">
          This page tests creating a date set directly using the client-side Supabase client.
          This can help identify if the issue is with RLS policies, auth, or something else.
        </p>
      </div>
    </div>
  )
} 