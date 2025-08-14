"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Calendar, Clock, MapPin, Info, Edit3, Save, X, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import * as dateFns from "date-fns"
import { ShareDateDialog } from '@/components/share-date-dialog'
import { createClient } from "@/utils/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { AdBanner } from '@/components/ads/ad-banner'

interface DatePlanPageProps {
  params: {
    id: string
  }
}

interface DatePlan {
  id: string;
  title?: string;
  user_id: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
  places?: any[];
  created_at?: string;
  share_id?: string;
}

export default function DatePlanPage({ params }: DatePlanPageProps) {
  const id = params.id
  const supabase = createClient()
  const { user } = useAuth()
  
  const [datePlan, setDatePlan] = useState<DatePlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(true)
  const [authAttempts, setAuthAttempts] = useState(0)
  const [isDataFetched, setIsDataFetched] = useState(false)
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<DatePlan>>({})
  const [saving, setSaving] = useState(false)

  // Check authentication status with retry limit
  useEffect(() => {
    // Maximum auth attempts to prevent infinite loops
    const MAX_AUTH_ATTEMPTS = 2
    let isMounted = true
    
    // Skip if we've tried too many times already
    if (authAttempts >= MAX_AUTH_ATTEMPTS) {
      setIsAuthenticating(false)
      return
    }

    // Skip if we have user info already
    if (user) {
      console.log("User already available from context")
      setIsAuthenticating(false)
      return
    }
    
    async function checkAuthStatus() {
      try {
        // Try to get the session directly
        const { data } = await supabase.auth.getSession()
        const isLoggedIn = !!data.session
        
        if (!isMounted) return
        
        console.log("Auth check result:", isLoggedIn ? "Authenticated" : "Not authenticated")
        setIsAuthenticating(false)
        setAuthAttempts(prev => prev + 1)
        
        if (!isLoggedIn && !user) {
          setError("Please log in to view this date plan")
          setLoading(false)
        }
      } catch (err) {
        if (!isMounted) return
        console.error("Error checking auth status:", err)
        setIsAuthenticating(false)
        setAuthAttempts(prev => prev + 1)
      }
    }
    
    const timeoutId = setTimeout(checkAuthStatus, 100)
    
    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [supabase, user, authAttempts])

  // Fetch date plan data memoized function
  const fetchDatePlan = useCallback(async () => {
    if (!supabase || isAuthenticating || isDataFetched) return
    
    try {
      setLoading(true)
      console.log("Fetching date plan with ID:", id)
      
      const { data, error } = await supabase
        .from('date_sets')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        console.error("Error fetching date plan:", error)
        if (error.code === 'PGRST116') {
          setError("Date plan not found")
        } else {
          setError("Failed to load date plan")
        }
        return
      }
      
      console.log("Date plan fetched successfully:", data)
      setDatePlan(data)
      setEditData(data) // Initialize edit data with current values
      setIsDataFetched(true)
    } catch (err) {
      console.error("Unexpected error fetching date plan:", err)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [supabase, id, isAuthenticating, isDataFetched])

  // Fetch data when authentication is complete
  useEffect(() => {
    if (!isAuthenticating) {
      fetchDatePlan()
    }
  }, [isAuthenticating, fetchDatePlan])

  // Check if user is the owner of this date plan
  const isOwner = user && datePlan && user.id === datePlan.user_id

  // Handle edit mode toggle
  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset to original data
      setEditData(datePlan || {})
      setIsEditing(false)
    } else {
      // Start editing
      setIsEditing(true)
    }
  }

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!datePlan || !user) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('date_sets')
        .update({
          title: editData.title,
          date: editData.date,
          start_time: editData.start_time,
          end_time: editData.end_time,
          notes: editData.notes,
          places: editData.places
        })
        .eq('id', datePlan.id)
        .eq('user_id', user.id)
      
      if (error) {
        console.error("Error updating date plan:", error)
        toast({
          title: "Error",
          description: "Failed to save changes",
          variant: "destructive",
        })
        return
      }
      
      // Update local state
      setDatePlan(prev => prev ? { ...prev, ...editData } : null)
      setIsEditing(false)
      
      toast({
        title: "Success",
        description: "Date plan updated successfully",
      })
    } catch (err) {
      console.error("Error saving changes:", err)
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Handle removing a place
  const handleRemovePlace = (index: number) => {
    if (!editData.places) return
    
    const updatedPlaces = [...editData.places]
    updatedPlaces.splice(index, 1)
    setEditData(prev => ({ ...prev, places: updatedPlaces }))
  }

  // Handle adding a custom place
  const handleAddCustomPlace = () => {
    const newPlace = {
      id: `custom-${Date.now()}`,
      name: "New Location",
      address: "",
      category: "activity"
    }
    
    setEditData(prev => ({
      ...prev,
      places: [...(prev.places || []), newPlace]
    }))
  }

  // Handle updating a place
  const handleUpdatePlace = (index: number, field: string, value: string) => {
    if (!editData.places) return
    
    const updatedPlaces = [...editData.places]
    updatedPlaces[index] = { ...updatedPlaces[index], [field]: value }
    setEditData(prev => ({ ...prev, places: updatedPlaces }))
  }

  if (isAuthenticating) {
    return (
      <>
        <Header />
        <main className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Checking authentication...</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="container mx-auto py-8">
          <div className="mb-6">
            <Skeleton className="h-10 w-32" />
          </div>
          <Card className="mb-6">
            <CardHeader>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </main>
        <Footer />
      </>
    )
  }

  if (error || !datePlan) {
    return (
      <>
        <Header />
        <main className="container mx-auto py-8">
          <div className="mb-6">
            <Link href="/my-dates">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to My Dates
              </Button>
            </Link>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error || 'Date plan not found'}
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="container mx-auto py-8">
        <div className="mb-6 flex justify-between items-center">
          <Link href="/my-dates">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to My Dates
            </Button>
          </Link>
          
          <div className="flex items-center space-x-2">
            {isOwner && (
              <Button
                variant={isEditing ? "outline" : "default"}
                size="sm"
                onClick={handleEditToggle}
                disabled={saving}
              >
                {isEditing ? (
                  <>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit
                  </>
                )}
              </Button>
            )}
            
            {isEditing && (
              <Button
                size="sm"
                onClick={handleSaveChanges}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            )}
            
            {datePlan && user && !isEditing && (
              <ShareDateDialog 
                dateSetId={datePlan.id} 
                shareId={datePlan.share_id || ''} 
                userId={user.id} 
              />
            )}
          </div>
        </div>
        
        {/* Ad Banner */}
        <div className="mb-6">
          <AdBanner adSlot="date-plan-detail" adFormat="leaderboard" />
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            {isEditing ? (
              <div className="space-y-4">
                <Input
                  value={editData.title || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter date plan title"
                  className="text-2xl font-bold"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Date</label>
                    <Input
                      type="date"
                      value={editData.date || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Start Time</label>
                    <Input
                      type="time"
                      value={editData.start_time || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, start_time: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">End Time</label>
                    <Input
                      type="time"
                      value={editData.end_time || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, end_time: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <CardTitle className="text-2xl">{datePlan.title || 'Untitled Date Plan'}</CardTitle>
                <div className="flex items-center text-gray-600 mt-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>{datePlan.date ? dateFns.format(new Date(datePlan.date), 'MMMM d, yyyy') : 'No date specified'}</span>
                </div>
                {datePlan.start_time && datePlan.end_time && (
                  <div className="flex items-center text-gray-600 mt-1">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{datePlan.start_time} - {datePlan.end_time}</span>
                  </div>
                )}
              </>
            )}
          </CardHeader>
          
          <CardContent>
            {/* Notes Section */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <Info className="h-4 w-4 mr-1" />
                Notes
              </h3>
              {isEditing ? (
                <Textarea
                  value={editData.notes || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add notes about your date plan..."
                  rows={3}
                />
              ) : (
                <p className="text-gray-600 whitespace-pre-wrap">
                  {datePlan.notes || 'No notes added'}
                </p>
              )}
            </div>
            
            {/* Places Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  Locations ({editData.places?.length || datePlan.places?.length || 0})
                </h3>
                {isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomPlace}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Location
                  </Button>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-4">
                  {editData.places?.map((place: any, index: number) => (
                    <div key={place.id || index} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 space-y-3">
                          <Input
                            value={place.name || ''}
                            onChange={(e) => handleUpdatePlace(index, 'name', e.target.value)}
                            placeholder="Location name"
                            className="font-medium"
                          />
                          <Input
                            value={place.address || ''}
                            onChange={(e) => handleUpdatePlace(index, 'address', e.target.value)}
                            placeholder="Address"
                          />
                          <div className="flex items-center space-x-2">
                            <Input
                              value={place.category || ''}
                              onChange={(e) => handleUpdatePlace(index, 'category', e.target.value)}
                              placeholder="Category"
                              className="w-32"
                            />
                            {place.rating && (
                              <div className="flex items-center">
                                <span className="text-sm font-medium">Rating: {place.rating}</span>
                                <span className="ml-2 text-yellow-500">
                                  {'★'.repeat(Math.round(place.rating))}
                                  {'☆'.repeat(Math.max(0, 5 - Math.round(place.rating)))}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePlace(index)}
                          className="ml-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!editData.places || editData.places.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      No locations added yet
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {datePlan.places?.map((place: any, index: number) => (
                    <div key={place.id || index} className="p-4 border rounded-lg bg-gray-50">
                      <h4 className="font-medium">{place.name || 'Unnamed Location'}</h4>
                      {place.address && <p className="text-gray-600 mt-1">{place.address}</p>}
                      {place.category && (
                        <Badge variant="outline" className="mt-2 capitalize">
                          {place.category}
                        </Badge>
                      )}
                      {place.rating && (
                        <div className="mt-2 flex items-center">
                          <span className="text-sm font-medium">Rating: {place.rating}</span>
                          <span className="ml-2 text-yellow-500">
                            {'★'.repeat(Math.round(place.rating))}
                            {'☆'.repeat(Math.max(0, 5 - Math.round(place.rating)))}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  {(!datePlan.places || datePlan.places.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      No locations added yet
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter>
            <div className="text-xs text-gray-500">
              Date Plan ID: {datePlan.id}
              {datePlan.created_at && (
                <span className="ml-2">
                  • Created: {dateFns.format(new Date(datePlan.created_at), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </CardFooter>
        </Card>
      </main>
      <Footer />
    </>
  )
}


