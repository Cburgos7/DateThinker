"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { getDateSetByShareId, shareDateSet, updateDateShareStatus } from "@/lib/date-sets"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, Clock, Utensils, Coffee, Wine, Star, Check, X } from "lucide-react"
import { getCurrentUser } from "@/lib/supabase"
import { generateGoogleCalendarLink, generateICalEvent } from "@/lib/date-sets"
import { toast } from "@/components/ui/use-toast"
import Image from "next/image"
import { supabase } from "@/lib/supabase"

export default function SharedDatePage() {
  const params = useParams()
  const router = useRouter()
  const shareId = params?.shareId as string || ""
  const [dateSet, setDateSet] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [acceptStatus, setAcceptStatus] = useState<'pending' | 'accepted' | 'declined' | null>(null)
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false)
  const [needsAuthentication, setNeedsAuthentication] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [currentUser, dateSetData] = await Promise.all([
          getCurrentUser(),
          getDateSetByShareId(shareId),
        ])

        setUser(currentUser)
        setDateSet(dateSetData)
      } catch (error) {
        console.error("Error loading shared date:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (shareId) {
      loadData()
    } else {
      setIsLoading(false)
    }
  }, [shareId])

  useEffect(() => {
    async function checkAuth() {
      if (!user && supabase) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          // Store the share URL to redirect back after login
          localStorage.setItem('redirectAfterLogin', window.location.href);
          router.push('/login');
        }
      }
    }
    
    checkAuth();
  }, [user, supabase, router]);

  // Handle authentication requirement for accepting dates
  useEffect(() => {
    // Only run after initial loading completes
    if (!isLoading && !user && dateSet) {
      // Store the current URL for redirect after login
      if (typeof window !== 'undefined') {
        localStorage.setItem('redirectAfterLogin', window.location.href);
      }
      // Show a message about needing to login
      setNeedsAuthentication(true);
    }
  }, [isLoading, user, dateSet]);

  const handleAccept = async () => {
    if (!user || !dateSet) return
    
    try {
      console.log("Accepting date plan:", { 
        dateSetId: dateSet.id, 
        ownerId: dateSet.user_id, 
        userId: user.id 
      });
      
      // For invitation acceptance, we need to pass the current user's ID
      // as the sharedWithId since they're accepting it
      const success = await shareDateSet(
        dateSet.id,
        user.id, // The current user who is accepting the invitation
        user.id, // This is the user being shared with (the recipient)
        "view",
        "accepted" // Explicitly mark as accepted
      );
      
      if (success) {
        // Also update the status in shared_date_sets if needed
        await updateDateShareStatus(dateSet.id, user.id, "accepted");
        
        setAcceptStatus('accepted');
        toast({
          title: "Date plan accepted",
          description: "The date plan has been added to your dates",
        });
        
        // Show calendar options
        setIsAddingToCalendar(true);
      } else {
        throw new Error("Failed to accept date plan");
      }
    } catch (error) {
      console.error("Error accepting date plan:", error);
      toast({
        title: "Error",
        description: "Failed to accept the date plan. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDecline = async () => {
    if (!user || !dateSet) return;
    
    try {
      // Update the status to declined
      await updateDateShareStatus(dateSet.id, user.id, "declined");
      
      setAcceptStatus('declined');
      toast({
        title: "Date plan declined",
        description: "The date plan invitation was declined",
      });
    } catch (error) {
      console.error("Error declining date plan:", error);
      toast({
        title: "Error",
        description: "Failed to decline the date plan",
        variant: "destructive"
      });
    }
  };

  const handleAddToGoogleCalendar = () => {
    if (!dateSet) return
    
    const googleCalendarLink = generateGoogleCalendarLink(dateSet)
    window.open(googleCalendarLink, '_blank')
  }

  const handleDownloadIcal = () => {
    if (!dateSet) return
    
    const icalData = generateICalEvent(dateSet)
    const blob = new Blob([icalData], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `${dateSet.title || 'date-plan'}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Redirect to login when user clicks the login button
  const handleLoginRedirect = () => {
    router.push('/login');
  }

  if (isLoading) {
    return (
      <>
        <title>{dateSet ? `${dateSet.title} | DateThinker` : "Shared Date Plan | DateThinker"}</title>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!dateSet) {
    return (
      <>
        <title>{dateSet ? `${dateSet.title} | DateThinker` : "Shared Date Plan | DateThinker"}</title>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-4">Date not found</h1>
          <p>The shared date you're looking for doesn't exist or has been deleted.</p>
        </div>
        <Footer />
      </>
    )
  }

  const { title, description, date, time, places, user_id } = dateSet
  const isOwner = user && user.id === user_id
  const canAccept = user && !isOwner && acceptStatus !== 'accepted'

  return (
    <>
      <title>{dateSet ? `${dateSet.title} | DateThinker` : "Shared Date Plan | DateThinker"}</title>
      <div className={!dateSet ? "min-h-screen flex items-center justify-center" : ""}>
        <Header isLoggedIn={!!user} userName={user?.user_metadata?.full_name || user?.email || undefined} avatarUrl={user?.user_metadata?.avatar_url || undefined} />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold">{title}</h1>
              <Badge variant="outline" className="text-rose-500 border-rose-200">
                Shared Date
              </Badge>
            </div>

            {description && <p className="text-gray-600 mb-8">{description}</p>}

            {dateSet && !user && needsAuthentication && (
              <div className="mb-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-blue-700 mb-2">Login Required</h3>
                  <p className="text-blue-600 mb-4">You need to login to view all details and accept this date plan.</p>
                  <Button onClick={handleLoginRedirect} className="bg-blue-600 hover:bg-blue-700">
                    Login to Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Invitation Action Buttons */}
            {!isOwner && user && (
              <div className="mb-8">
                {acceptStatus === null && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h3 className="font-medium text-blue-700 mb-2">You've received a date plan invitation</h3>
                    <p className="text-blue-600 mb-4">Would you like to accept this date plan and add it to your collection?</p>
                    <div className="flex gap-4">
                      <Button onClick={handleAccept} className="bg-green-600 hover:bg-green-700">
                        <Check className="mr-2 h-4 w-4" /> Accept
                      </Button>
                      <Button variant="outline" onClick={handleDecline}>
                        <X className="mr-2 h-4 w-4" /> Decline
                      </Button>
                    </div>
                  </div>
                )}

                {acceptStatus === 'accepted' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <h3 className="font-medium text-green-700 mb-2">Date plan accepted!</h3>
                    <p className="text-green-600 mb-2">This date plan has been added to your collection.</p>
                    <Button variant="link" className="text-green-600 p-0" onClick={() => router.push('/my-dates')}>
                      View in My Dates
                    </Button>
                  </div>
                )}

                {acceptStatus === 'declined' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                    <h3 className="font-medium text-gray-700 mb-2">Date plan declined</h3>
                    <p className="text-gray-600">You can still view the details, but it won't be added to your collection.</p>
                  </div>
                )}
              </div>
            )}

            {/* Calendar Integration */}
            {(isAddingToCalendar || isOwner || acceptStatus === 'accepted') && (
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 mb-8">
                <h3 className="font-medium text-violet-700 mb-2">Add to Calendar</h3>
                <p className="text-violet-600 mb-4">Add this date plan to your personal calendar</p>
                <div className="flex gap-4">
                  <Button variant="outline" className="border-violet-300 text-violet-700" onClick={handleAddToGoogleCalendar}>
                    <Calendar className="mr-2 h-4 w-4" /> Google Calendar
                  </Button>
                  <Button variant="outline" className="border-violet-300 text-violet-700" onClick={handleDownloadIcal}>
                    <Calendar className="mr-2 h-4 w-4" /> Download .ics (Apple/Outlook)
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-4 mb-8">
              {date && (
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{new Date(date).toLocaleDateString()}</span>
                </div>
              )}
              {time && (
                <div className="flex items-center text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{time}</span>
                </div>
              )}
            </div>

            <div className="grid gap-6">
              {places.map((place: any, index: number) => (
                <Card key={place.id || index}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{place.name}</CardTitle>
                        <CardDescription>{place.address}</CardDescription>
                      </div>
                      <Badge
                        className={
                          place.type === "restaurant"
                            ? "bg-rose-500"
                            : place.type === "drinks"
                              ? "bg-purple-500"
                              : "bg-blue-500"
                        }
                      >
                        {place.type === "restaurant" ? (
                          <Utensils className="w-4 h-4" />
                        ) : place.type === "drinks" ? (
                          <Wine className="w-4 h-4" />
                        ) : (
                          <Coffee className="w-4 h-4" />
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {place.image && (
                        <Image
                          src={place.image}
                          alt={place.name}
                          width={500}
                          height={300}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span>{place.address}</span>
                      </div>
                      {place.rating && (
                        <div className="flex items-center text-gray-600">
                          <Star className="w-4 h-4 mr-2 text-yellow-400" />
                          <span>{place.rating} / 5</span>
                        </div>
                      )}
                      {place.description && <p className="text-gray-600">{place.description}</p>}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="outline"
                      onClick={() => window.open(place.url || `https://maps.google.com/?q=${place.address}`)}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

