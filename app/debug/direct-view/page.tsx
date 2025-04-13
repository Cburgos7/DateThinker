'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { DateSetCard } from '@/components/date-set-card'

// Add a visual data inspector component
function DataInspector({ data }: { data: any }) {
  if (!data) return null;
  
  return (
    <div className="bg-gray-50 p-4 rounded-md mb-6 overflow-auto">
      <h3 className="text-lg font-bold mb-2">Data Structure Inspector</h3>
      <details open>
        <summary className="cursor-pointer font-medium mb-2">First Date Set Keys</summary>
        <div className="ml-4 p-2 bg-white rounded border border-gray-200">
          {Object.keys(data).map(key => (
            <div key={key} className="mb-1">
              <span className="font-mono text-sm">{key}: </span>
              <span className="text-blue-600">{typeof data[key]}</span>
              {data[key] === null && <span className="text-red-500 ml-2">(null)</span>}
              {data[key] === undefined && <span className="text-red-500 ml-2">(undefined)</span>}
            </div>
          ))}
        </div>
      </details>
      <details>
        <summary className="cursor-pointer font-medium mb-2 mt-4">Full JSON</summary>
        <pre className="text-xs p-2 bg-gray-800 text-white rounded overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export default function DirectViewPage() {
  const [dataSets, setDataSets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDataDirect = async () => {
      try {
        setLoading(true)
        
        // Create a direct client with anon key - will work since RLS is disabled
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        )
        
        console.log("Attempting direct data fetch without auth...")
        
        // Get a count first to verify data exists
        const { data: countData } = await supabase
          .from('date_sets')
          .select('count')
        
        console.log("Count result:", countData)
        
        // Now fetch ALL date sets with no filtering
        const { data, error } = await supabase
          .from('date_sets')
          .select('*')
        
        if (error) {
          console.error("Error fetching date sets:", error)
          setError(`Error: ${error.message}`)
        } else {
          console.log("Successfully fetched date sets:", data?.length)
          
          // Add detailed logging to compare with my-dates page
          if (data && data.length > 0) {
            console.log("========== DIRECT-VIEW DATA STRUCTURE ==========");
            console.log("First date set full data:", JSON.stringify(data[0], null, 2));
            console.log("First date set keys:", Object.keys(data[0]));
            console.log("Required fields check:", {
              hasId: !!data[0].id,
              hasTitle: !!data[0].title,
              hasDate: !!data[0].date,
              hasStartTime: !!data[0].start_time,
              hasEndTime: !!data[0].end_time,
              hasPlaces: !!data[0].places,
              placesType: typeof data[0].places
            });
            console.log("================================================");
          }
          
          setDataSets(data || [])
        }
      } catch (err) {
        console.error("Unexpected error:", err)
        setError(`${err}`)
      } finally {
        setLoading(false)
      }
    }
    
    loadDataDirect()
  }, [])

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Direct Data View (No Auth)</h1>
      
      {loading && (
        <div className="p-4 bg-blue-50 text-blue-700 rounded-md mb-6">
          Loading date sets...
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md mb-6">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Data Sets Found: {dataSets.length}</h2>
      </div>
      
      {dataSets.length > 0 && <DataInspector data={dataSets[0]} />}
      
      {dataSets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dataSets.map(dateSet => (
            <DateSetCard 
              key={dateSet.id} 
              dateSet={dateSet} 
            />
          ))}
        </div>
      ) : (
        <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
          No date sets found in database.
        </div>
      )}
    </div>
  )
} 