'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { supabase } from '@/lib/supabase'
import { Check, X, Calendar, Clock, Crown, Users, Trash2, Share2, LogIn } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { getSharedWithMeDateSets, shareDateSet, deleteDateSet, removeSharedDateSet } from '@/lib/date-sets'
import { Badge } from '@/components/ui/badge'
import { ShareDateDialog } from '@/components/share-date-dialog'

// Extremely simplified page that just shows the data
export default function MyDatesPage() {
  const router = useRouter()
  const [dateSets, setDateSets] = useState<any[]>([])
  const [sharedDateSets, setSharedDateSets] = useState<any[]>([])
  const [acceptedSharedSets, setAcceptedSharedSets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Super simplified data loading
  useEffect(() => {
    console.log("BASIC LOADER: Starting data fetch");
    
    const fetchData = async () => {
      try {
        if (!supabase) {
          console.error("Supabase client not initialized");
          setError("Database connection unavailable");
          setLoading(false);
          return;
        }
        
        // First, get the current user
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        setAuthChecked(true);
        
        if (!user) {
          console.log("BASIC LOADER: No authenticated user found");
          setError("Please log in to view your date sets");
          setLoading(false);
          
          // Redirect to auth page after a short delay
          setTimeout(() => {
            router.push('/auth?redirect=/my-dates');
          }, 2000);
          
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

        // Fetch date sets shared with the current user
        try {
          const sharedSets = await getSharedWithMeDateSets(user.id);
          console.log("BASIC LOADER: Shared date sets", sharedSets.length);
          
          // Split shared sets between pending and accepted
          const pendingShares = sharedSets.filter(set => set.status === 'pending');
          const acceptedShares = sharedSets.filter(set => set.status === 'accepted');
          
          setSharedDateSets(pendingShares);
          setAcceptedSharedSets(acceptedShares);
        } catch (sharedError) {
          console.error("Error fetching shared date sets:", sharedError);
          // Don't set the main error, just log it
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [router]);

  const handleAcceptInvitation = async (sharedDateSet: any) => {
    try {
      // Update the status to accepted
      const success = await shareDateSet(
        sharedDateSet.date_set_id,
        sharedDateSet.owner_id,
        user.id,
        'view',
        'accepted'
      );
      
      if (!success) {
        throw new Error("Failed to accept invitation");
      }
      
      // Move from pending to accepted
      setSharedDateSets(prev => prev.filter(ds => ds.id !== sharedDateSet.id));
      setAcceptedSharedSets(prev => [...prev, { ...sharedDateSet, status: 'accepted' }]);
      
      toast({
        title: "Date plan accepted",
        description: "The date plan has been added to your collection",
      });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      toast({
        title: "Error",
        description: "Failed to accept the date plan",
        variant: "destructive"
      });
    }
  };

  const handleDeclineInvitation = async (sharedDateSet: any) => {
    try {
      if (!supabase || !user) return;
      
      // Remove the sharing permission
      const success = await shareDateSet(
        sharedDateSet.date_set_id,
        sharedDateSet.owner_id,
        user.id,
        'view',
        'declined'
      );
      
      if (!success) {
        throw new Error("Failed to decline invitation");
      }
      
      // Remove from the displayed list
      setSharedDateSets(prev => prev.filter(ds => ds.id !== sharedDateSet.id));
      
      toast({
        title: "Date plan declined",
        description: "The date plan invitation was declined",
      });
    } catch (error) {
      console.error("Error declining invitation:", error);
      toast({
        title: "Error",
        description: "Failed to decline the date plan",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteDateSet = async (dateSetId: string) => {
    try {
      if (!user) return;
      
      // Only the owner can delete a date set
      const success = await deleteDateSet(dateSetId, user.id);
      
      if (success) {
        setDateSets(prev => prev.filter(ds => ds.id !== dateSetId));
        
        toast({
          title: "Date plan deleted",
          description: "The date plan has been permanently deleted",
        });
      } else {
        throw new Error("Failed to delete date plan");
      }
    } catch (error) {
      console.error("Error deleting date plan:", error);
      toast({
        title: "Error",
        description: "Failed to delete the date plan",
        variant: "destructive"
      });
    }
  };
  
  const handleRemoveSharedDate = async (dateSetId: string) => {
    try {
      if (!user) return;
      
      // Followers can remove a shared date without deleting it
      const success = await removeSharedDateSet(dateSetId, user.id);
      
      if (success) {
        setAcceptedSharedSets(prev => prev.filter(ds => ds.date_set_id !== dateSetId));
        
        toast({
          title: "Shared date plan removed",
          description: "The shared date plan has been removed from your collection",
        });
      } else {
        throw new Error("Failed to remove shared date plan");
      }
    } catch (error) {
      console.error("Error removing shared date plan:", error);
      toast({
        title: "Error",
        description: "Failed to remove the shared date plan",
        variant: "destructive"
      });
    }
  };

  // Render auth prompt if no user is found
  if (authChecked && !user) {
    return (
      <>
        <Header />
        <div className="container py-12 px-4 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <LogIn className="h-12 w-12 text-rose-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
            <p className="text-gray-600 mb-6">
              You need to be signed in to view and create date plans. Please sign in or create an account.
            </p>
            <Button 
              onClick={() => router.push('/auth?redirect=/my-dates')}
              className="bg-rose-500 hover:bg-rose-600"
            >
              Sign In or Sign Up
            </Button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

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
              <Link href="/auth">
                <Button>Log In</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Shared date sets (invitations) section */}
        {!loading && !error && user && sharedDateSets.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Date Plan Invitations</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sharedDateSets.map(sharedSet => {
                const dateSet = sharedSet.date_set;
                return (
                  <Card key={sharedSet.id} className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{dateSet.title || 'Untitled'}</CardTitle>
                        <Badge variant="outline" className="bg-blue-100">Invitation</Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pb-2">
                      <p className="text-sm text-gray-600 mb-2">
                        {dateSet.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(dateSet.date).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                      
                      {dateSet.start_time && dateSet.end_time && (
                        <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {dateSet.start_time} - {dateSet.end_time}
                        </p>
                      )}
                      
                      <p className="text-sm text-gray-600">
                        {dateSet.places?.length || 0} location(s)
                      </p>
                    </CardContent>
                    
                    <CardFooter className="flex justify-between pt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-green-400 text-green-700"
                        onClick={() => handleAcceptInvitation(sharedSet)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-red-400 text-red-700"
                        onClick={() => handleDeclineInvitation(sharedSet)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
        
        {!loading && !error && user && dateSets.length === 0 && sharedDateSets.length === 0 && acceptedSharedSets.length === 0 && (
          <p className="p-4 bg-yellow-100 rounded mb-4">You don't have any date sets yet</p>
        )}
        
        {/* User's owned date sets section */}
        {dateSets.length > 0 && (
          <>
            <h2 className="text-xl font-semibold mb-4">Your Date Plans</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {dateSets.map(ds => (
                <Card key={ds.id} className="border-purple-200 bg-white shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{ds.title || 'Untitled'}</CardTitle>
                      <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                        <Crown className="h-3 w-3 mr-1" /> Date Leader
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pb-2">
                    <p className="text-sm text-gray-600 mb-2">
                      {ds.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(ds.date).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                    
                    {ds.start_time && ds.end_time && (
                      <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ds.start_time} - {ds.end_time}
                      </p>
                    )}
                  </CardContent>
                  
                  <CardFooter className="pt-2 flex justify-between">
                    <Link href={`/date-plans/${ds.id}`} className="w-full mr-2">
                      <Button className="w-full">View</Button>
                    </Link>
                    <div className="flex gap-2">
                      <ShareDateDialog 
                        dateSetId={ds.id}
                        shareId={ds.share_id}
                        userId={user.id}
                      >
                        <Button variant="outline" size="icon">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </ShareDateDialog>
                      
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteDateSet(ds.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </>
        )}
        
        {/* Shared dates that the user has accepted */}
        {acceptedSharedSets.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Shared With You</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {acceptedSharedSets.map(sharedSet => {
                const dateSet = sharedSet.date_set;
                return (
                  <Card key={sharedSet.id} className="border-blue-200 bg-white shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{dateSet.title || 'Untitled'}</CardTitle>
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                          <Users className="h-3 w-3 mr-1" /> Date Follower
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pb-2">
                      <p className="text-sm text-gray-600 mb-2">
                        {dateSet.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(dateSet.date).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                      
                      {dateSet.start_time && dateSet.end_time && (
                        <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {dateSet.start_time} - {dateSet.end_time}
                        </p>
                      )}
                    </CardContent>
                    
                    <CardFooter className="pt-2 flex justify-between">
                      <Link href={`/date-plans/${dateSet.id}`} className="w-full mr-2">
                        <Button className="w-full">View</Button>
                      </Link>
                      
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleRemoveSharedDate(dateSet.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  )
} 