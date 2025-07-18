'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { createClient } from '@/utils/supabase/client'
import { Check, X, Calendar, Clock, Crown, Users, Trash2, Share2 } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { getSharedWithMeDateSets, shareDateSet, deleteDateSet, removeSharedDateSet } from '@/lib/date-sets'
import { Badge } from '@/components/ui/badge'
import { ShareDateDialog } from '@/components/share-date-dialog'

// Extremely simplified page that just shows the data
export default function MyDateSetsPage() {
  const [dateSets, setDateSets] = useState<any[]>([])
  const [sharedDateSets, setSharedDateSets] = useState<any[]>([])
  const [acceptedSharedSets, setAcceptedSharedSets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  // Super simplified data loading
  useEffect(() => {
    console.log("BASIC LOADER: Starting data fetch");
    
    const fetchData = async () => {
      try {
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

        // Fetch date sets shared with the current user
        try {
          // Directly fetch from the database rather than using the helper function
          // to avoid any potential parsing issues
          const { data: sharedData, error: sharedError } = await supabase
            .from("shared_date_sets")
            .select(`
              *,
              date_set:date_sets(*)
            `)
            .eq("shared_with_id", user.id);
            
          if (sharedError) {
            console.error("Error fetching shared date sets:", sharedError);
            throw sharedError;
          }
          
          console.log("BASIC LOADER: Shared date sets", sharedData?.length || 0);
          
          if (sharedData && sharedData.length > 0) {
            // Split shared sets between pending and accepted
            const pendingShares = sharedData.filter((set: any) => set.status === 'pending');
            const acceptedShares = sharedData.filter((set: any) => set.status === 'accepted');
            
            setSharedDateSets(pendingShares);
            setAcceptedSharedSets(acceptedShares);
          }
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
  }, []);

  const handleAcceptInvitation = async (sharedDateSet: any) => {
    try {
      // Update the status to accepted directly using Supabase
      const { error } = await supabase
        .from("shared_date_sets")
        .update({ status: 'accepted' })
        .eq("id", sharedDateSet.id);
      
      if (error) {
        throw error;
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
      // Update the status to declined directly using Supabase
      const { error } = await supabase
        .from("shared_date_sets")
        .update({ status: 'declined' })
        .eq("id", sharedDateSet.id);
      
      if (error) {
        throw error;
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
      // Delete directly using Supabase
      const { error } = await supabase
        .from("date_sets")
        .delete()
        .eq("id", dateSetId)
        .eq("user_id", user.id);
      
      if (error) {
        throw error;
      }
      
      setDateSets(prev => prev.filter(ds => ds.id !== dateSetId));
      
      toast({
        title: "Date plan deleted",
        description: "The date plan has been permanently deleted",
      });
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
      // Remove the shared date directly using Supabase
      const { error } = await supabase
        .from("shared_date_sets")
        .delete()
        .eq("date_set_id", dateSetId)
        .eq("shared_with_id", user.id);
      
      if (error) {
        throw error;
      }
      
      setAcceptedSharedSets(prev => prev.filter(ds => ds.date_set_id !== dateSetId));
      
      toast({
        title: "Shared date plan removed",
        description: "The shared date plan has been removed from your collection",
      });
    } catch (error) {
      console.error("Error removing shared date plan:", error);
      toast({
        title: "Error",
        description: "Failed to remove the shared date plan",
        variant: "destructive"
      });
    }
  };

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