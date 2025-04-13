'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { supabase } from '@/lib/supabase'

// Extremely simplified page that just shows the data
export default function MyDatesPage() {
  const [dateSets, setDateSets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  // Super simplified data loading
  useEffect(() => {
    console.log("BASIC LOADER: Starting data fetch");
    
    const fetchData = async () => {
      try {
        if (!supabase) {
          console.error("Supabase client not initialized");
          setError("Database connection unavailable");
          return;
        }
        
        // First, get the current user
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (!user) {
          console.log("BASIC LOADER: No authenticated user found");
          setError("Please log in to view your date sets");
          setLoading(false);
          return;
        }
        
        console.log("BASIC LOADER: Fetching date sets for user", user.id);
        
        // Now query only the date sets for this user
        const { data, error } = await supabase
          .from('date_sets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        console.log("BASIC LOADER: Query result", { 
          success: !error, 
          count: data?.length || 0 
        });
        
        if (error) {
          console.error("Error fetching date sets:", error);
          setError(error.message);
          return;
        }
        
        if (data && data.length > 0) {
          console.log("BASIC LOADER: Setting data", data.length);
          setDateSets(data);
        } else {
          console.log("BASIC LOADER: No date sets found for user");
          // Not setting an error here, just showing empty state
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Basic rendering with minimal styling
  return (
    <>
      <Header />
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">My Date Sets</h1>
        
        {loading && <p className="p-4 bg-blue-100 rounded mb-4">Loading date sets...</p>}
        
        {error && <p className="p-4 bg-red-100 rounded mb-4">Error: {error}</p>}
        
        {!loading && !error && !user && (
          <div className="p-4 bg-yellow-100 rounded mb-4">
            <p>Please log in to view your date sets</p>
            <div className="mt-4">
              <Link href="/login">
                <Button>Log In</Button>
              </Link>
            </div>
          </div>
        )}
        
        {!loading && !error && user && dateSets.length === 0 && (
          <p className="p-4 bg-yellow-100 rounded mb-4">You don't have any date sets yet</p>
        )}
        
        {dateSets.length > 0 && (
          <div className="p-4 bg-green-100 rounded mb-4">
            <p>Found {dateSets.length} date sets</p>
          </div>
        )}
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dateSets.map(ds => (
            <div key={ds.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <h2 className="text-xl font-bold">{ds.title || 'Untitled'}</h2>
              <p className="text-gray-500">{ds.date || 'No date'}</p>
              
              {ds.start_time && ds.end_time && (
                <p className="mt-2">Time: {ds.start_time} - {ds.end_time}</p>
              )}
              
              <div className="mt-4 flex justify-end">
                <Link href={`/date-plans/${ds.id}`}>
                  <Button>View Details</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </>
  )
} 