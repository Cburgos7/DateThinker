"use client"

import React, { useState, useEffect } from 'react'
import { Plus, GripVertical, X, Clock, MapPin, Tags, Search, Sparkles, ChevronDown, ArrowUp, ArrowDown, Calendar, Timer, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { DateStep, SequentialDatePlan, VENUE_TYPE_OPTIONS, VENUE_SUB_TAGS } from '@/lib/types'
import { tagSearchService, TagSearchResult } from '@/lib/tag-search-service'
import { useAuth } from '@/contexts/auth-context'
import { SaveDateModal } from '@/components/save-date-modal'
import type { PlaceResult } from '@/lib/search-utils'

interface SequentialDatePlannerProps {
  city: string
  placeId?: string
  onSave?: (plan: SequentialDatePlan) => void
  initialPlan?: SequentialDatePlan
}

export function SequentialDatePlanner({ 
  city, 
  placeId, 
  onSave, 
  initialPlan 
}: SequentialDatePlannerProps) {
  const { user } = useAuth()
  const [plan, setPlan] = useState<SequentialDatePlan>(
    initialPlan || {
      id: `plan-${Date.now()}`,
      title: '',
      description: '',
      city,
      placeId,
      steps: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isTemplate: false,
      isPublic: false,
      tags: [],
      estimatedTotalTime: 0,
    }
  )

  const [draggedStep, setDraggedStep] = useState<string | null>(null)
  const [dragOverStep, setDragOverStep] = useState<string | null>(null)
  const [showTimingDetails, setShowTimingDetails] = useState(false)
  const [searchingSteps, setSearchingSteps] = useState<Set<string>>(new Set())
  const [venueSearchResults, setVenueSearchResults] = useState<Record<string, TagSearchResult[]>>({})
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)

  // Helper function to calculate end time
  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + duration
    const endHours = Math.floor(totalMinutes / 60) % 24
    const endMins = totalMinutes % 60
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
  }

  // Calculate total estimated time and update plan
  const calculateTotalTime = () => {
    let totalTime = 0
    plan.steps.forEach(step => {
      if (step.timing?.estimatedDuration) {
        totalTime += step.timing.estimatedDuration
      }
      if (step.timing?.timeBuffer) {
        totalTime += step.timing.timeBuffer
      }
    })
    return totalTime
  }

  // Update plan's total time when steps change
  useEffect(() => {
    const totalTime = calculateTotalTime()
    if (totalTime !== plan.estimatedTotalTime) {
      setPlan(prev => ({
        ...prev,
        estimatedTotalTime: totalTime,
        updatedAt: new Date().toISOString(),
      }))
    }
  }, [plan.steps])

  const addStep = () => {
    const newStep: DateStep = {
      id: `step-${Date.now()}`,
      stepNumber: plan.steps.length + 1,
      title: `Step ${plan.steps.length + 1}`,
      preferences: {
        tags: [],
      },
      status: 'empty',
    }

    setPlan(prev => ({
      ...prev,
      steps: [...prev.steps, newStep],
      updatedAt: new Date().toISOString(),
    }))
  }

  const removeStep = (stepId: string) => {
    setPlan(prev => ({
      ...prev,
      steps: prev.steps
        .filter(step => step.id !== stepId)
        .map((step, index) => ({ ...step, stepNumber: index + 1, title: `Step ${index + 1}` })),
      updatedAt: new Date().toISOString(),
    }))
  }

  const updateStep = (stepId: string, updates: Partial<DateStep>) => {
    setPlan(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      ),
      updatedAt: new Date().toISOString(),
    }))
  }

  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    const stepIndex = plan.steps.findIndex(step => step.id === stepId)
    if (
      (direction === 'up' && stepIndex === 0) || 
      (direction === 'down' && stepIndex === plan.steps.length - 1)
    ) {
      return
    }

    const newSteps = [...plan.steps]
    const targetIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1
    
    // Swap steps
    ;[newSteps[stepIndex], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[stepIndex]]
    
    // Update step numbers
    newSteps.forEach((step, index) => {
      step.stepNumber = index + 1
      step.title = `Step ${index + 1}`
    })

    setPlan(prev => ({
      ...prev,
      steps: newSteps,
      updatedAt: new Date().toISOString(),
    }))
  }

  const handleDragStart = (e: React.DragEvent, stepId: string) => {
    setDraggedStep(stepId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', stepId)
  }

  const handleDragOver = (e: React.DragEvent, stepId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStep(stepId)
  }

  const handleDragLeave = () => {
    setDragOverStep(null)
  }

  const handleDrop = (e: React.DragEvent, targetStepId: string) => {
    e.preventDefault()
    const draggedStepId = e.dataTransfer.getData('text/plain')
    
    if (draggedStepId === targetStepId) {
      setDraggedStep(null)
      setDragOverStep(null)
      return
    }

    const draggedIndex = plan.steps.findIndex(step => step.id === draggedStepId)
    const targetIndex = plan.steps.findIndex(step => step.id === targetStepId)
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedStep(null)
      setDragOverStep(null)
      return
    }

    const newSteps = [...plan.steps]
    const [draggedStep] = newSteps.splice(draggedIndex, 1)
    newSteps.splice(targetIndex, 0, draggedStep)
    
    // Update step numbers
    newSteps.forEach((step, index) => {
      step.stepNumber = index + 1
      step.title = `Step ${index + 1}`
    })

    setPlan(prev => ({
      ...prev,
      steps: newSteps,
      updatedAt: new Date().toISOString(),
    }))

    setDraggedStep(null)
    setDragOverStep(null)
  }

  const handleDragEnd = () => {
    setDraggedStep(null)
    setDragOverStep(null)
  }

  // Venue search functions
  const findVenuesForStep = async (stepId: string) => {
    const step = plan.steps.find(s => s.id === stepId)
    if (!step || step.preferences.tags.length === 0) return

    try {
      setSearchingSteps(prev => new Set(prev).add(stepId))
      updateStep(stepId, { status: 'searching' })

      // Generate mock venues based on selected tags
      const mockResults = generateMockVenues(step.preferences.tags, stepId)

      setVenueSearchResults(prev => ({
        ...prev,
        [stepId]: mockResults
      }))

      updateStep(stepId, { status: 'searching' })
    } catch (error) {
      console.error('Failed to generate venues:', error)
      updateStep(stepId, { status: 'empty' })
    } finally {
      setSearchingSteps(prev => {
        const newSet = new Set(prev)
        newSet.delete(stepId)
        return newSet
      })
    }
  }

  // Generate mock venues based on selected tags
  const generateMockVenues = (tags: string[], stepId: string): TagSearchResult[] => {
    const mockVenues: TagSearchResult[] = []
    const currentCity = city || 'Your City' // Fallback if city is empty
    
    console.log('🏗️ Generating mock venues with city:', currentCity, 'tags:', tags)
    
    // Determine primary category from tags
    const isRestaurant = tags.includes('restaurant')
    const isOutdoor = tags.includes('outdoor')
    const isActivity = tags.includes('activity')
    const isEvent = tags.includes('event')
    
    console.log('📂 Categories detected:', { isRestaurant, isOutdoor, isActivity, isEvent })
    
    // Get the first selected venue type
    const selectedVenueType = tags.find(tag => ['restaurant', 'activity', 'outdoor', 'event'].includes(tag))
    
    // Get sub-tags for the selected venue type
    const subTags = selectedVenueType ? tags.filter(tag => 
      VENUE_SUB_TAGS[selectedVenueType as keyof typeof VENUE_SUB_TAGS]?.includes(tag as never)
    ) : []
    
    // Generate 6-8 mock venues
    for (let i = 0; i < 6 + Math.floor(Math.random() * 3); i++) {
      let name = ''
      let category = 'activity'
      let address = `${100 + i * 50} ${['Main St', 'Oak Ave', 'Park Blvd', 'Downtown St', 'River Rd', 'Hill St'][i % 6]}, ${currentCity}`
      
      if (isRestaurant) {
        category = 'restaurant'
        const restaurantNames = ['The Bistro', 'Corner Cafe', 'Local Eatery', 'Downtown Diner', 'Neighborhood Grill', 'City Kitchen', 'Main Street Eatery']
        name = restaurantNames[i % restaurantNames.length]
        
        // Customize name based on sub-tags
        if (subTags.includes('fine-dining')) {
          name = name.replace(/Diner|Grill/, 'Bistro')
        } else if (subTags.includes('cafe')) {
          name = name.replace(/Bistro|Grill/, 'Cafe')
        }
      } else if (isOutdoor) {
        category = 'outdoor'
        const outdoorNames = ['Riverside Park', 'Mountain Trail', 'City Gardens', 'Adventure Park', 'Nature Reserve', 'Lakeside Path']
        name = outdoorNames[i % outdoorNames.length]
      } else if (isActivity) {
        category = 'activity'
        const activityNames = ['Art Museum', 'Historic Theater', 'Shopping District', 'Wellness Center', 'Cultural Center', 'Entertainment Complex']
        name = activityNames[i % activityNames.length]
      } else if (isEvent) {
        category = 'event'
        const eventNames = ['Concert Hall', 'Theater District', 'Event Center', 'Performance Venue', 'Live Music Hall', 'Comedy Club']
        name = eventNames[i % eventNames.length]
      } else {
        // Default mixed options
        const mixedNames = ['The Local Spot', 'City Center', 'Downtown Hub', 'Community Place', 'Main Street Venue', 'Central Location']
        name = mixedNames[i % mixedNames.length]
      }
      
      // Default price level (no price tags in new system)
      let priceLevel = 2
      
      mockVenues.push({
        id: `mock-${stepId}-${i}`,
        name: name,
        address: address,
        placeId: `mock-place-${stepId}-${i}`,
        rating: 3.8 + Math.random() * 1.4, // Random rating between 3.8 and 5.2
        priceLevel: priceLevel,
        category: category,
        tags: tags,
        openNow: Math.random() > 0.2, // 80% chance of being open
        photos: category === 'restaurant' ? ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop'] :
               category === 'outdoor' ? ['https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop'] :
               ['https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop']
      })
    }
    
    console.log('🎉 Generated', mockVenues.length, 'mock venues:', mockVenues.map(v => v.name))
    return mockVenues
  }

  const surpriseMeForStep = async (stepId: string) => {
    const step = plan.steps.find(s => s.id === stepId)
    if (!step || step.preferences.tags.length === 0) return

    console.log('🎲 Surprise Me clicked for step:', stepId, 'with tags:', step.preferences.tags)
    console.log('🏙️ City parameter:', city || 'EMPTY')

    try {
      setSearchingSteps(prev => new Set(prev).add(stepId))
      updateStep(stepId, { status: 'searching' })

      // Generate mock venues based on selected tags
      const mockResults = generateMockVenues(step.preferences.tags, stepId)
      
      console.log('🎭 Generated mock venues:', mockResults.length, mockResults)
      
      if (mockResults.length > 0) {
        // Store mock results for the user to choose from
        setVenueSearchResults(prev => ({
          ...prev,
          [stepId]: mockResults
        }))
        
        console.log('✅ Mock results stored for step:', stepId)
        
        // Set back to empty state so search results are displayed properly
        updateStep(stepId, { status: 'empty' })
      } else {
        console.log('❌ No mock results generated')
        updateStep(stepId, { status: 'empty' })
      }
    } catch (error) {
      console.error('Failed to generate mock venues:', error)
      updateStep(stepId, { status: 'empty' })
    } finally {
      setSearchingSteps(prev => {
        const newSet = new Set(prev)
        newSet.delete(stepId)
        return newSet
      })
    }
  }

  const selectVenueForStep = (stepId: string, venue: TagSearchResult) => {
    updateStep(stepId, {
      status: 'confirmed',
      venue: {
        id: venue.id,
        name: venue.name,
        address: venue.address,
        category: venue.category,
        tags: venue.tags,
        rating: venue.rating,
        price: venue.priceLevel,
        photoUrl: venue.photos?.[0],
        openNow: venue.openNow,
      }
    })

    // Clear search results for this step
    setVenueSearchResults(prev => {
      const newResults = { ...prev }
      delete newResults[stepId]
      return newResults
    })
  }

  const clearVenueForStep = (stepId: string) => {
    updateStep(stepId, {
      status: 'empty',
      venue: undefined
    })
  }

  const manualVenueSearchForStep = async (stepId: string, venueName: string) => {
    if (!venueName.trim()) return

    try {
      setSearchingSteps(prev => new Set(prev).add(stepId))
      updateStep(stepId, { status: 'searching' })

      // Try to search for the specific venue using the search API
      const results = await tagSearchService.searchByTags({
        city,
        placeId,
        tags: [venueName.toLowerCase()], // Use the venue name as a search tag
        maxResults: 1,
        excludeIds: plan.steps
          .filter(s => s.venue?.id)
          .map(s => s.venue!.id)
      })

      if (results.length > 0) {
        // Found a matching venue
        const venue = results[0]
        updateStep(stepId, {
          status: 'confirmed',
          venue: {
            id: venue.id,
            name: venue.name,
            address: venue.address,
            category: venue.category,
            tags: venue.tags,
            rating: venue.rating,
            price: venue.priceLevel,
            photoUrl: venue.photos?.[0],
            openNow: venue.openNow,
          }
        })
      } else {
        // No venue found, create a manual entry
        const manualVenue = {
          id: `manual-${Date.now()}`,
          name: venueName.trim(),
          address: `${city}`,
          category: 'other',
          tags: [],
          rating: undefined,
          price: undefined,
          photoUrl: undefined,
          openNow: undefined,
        }
        
        updateStep(stepId, {
          status: 'confirmed',
          venue: manualVenue
        })
      }
    } catch (error) {
      console.error('Failed to search for manual venue:', error)
      // Create manual entry as fallback
      const manualVenue = {
        id: `manual-${Date.now()}`,
        name: venueName.trim(),
        address: `${city}`,
        category: 'other',
        tags: [],
        rating: undefined,
        price: undefined,
        photoUrl: undefined,
        openNow: undefined,
      }
      
      updateStep(stepId, {
        status: 'confirmed',
        venue: manualVenue
      })
    } finally {
      setSearchingSteps(prev => {
        const newSet = new Set(prev)
        newSet.delete(stepId)
        return newSet
      })
    }
  }

  const savePlan = () => {
    if (onSave) {
      onSave(plan)
    }
  }

  // Convert DateStep venues to PlaceResult format for saving
  const convertStepsToPlaceResults = (): PlaceResult[] => {
    return plan.steps
      .filter(step => step.venue && (step.status === 'filled' || step.status === 'confirmed'))
      .map(step => {
        const venue = step.venue!
        
        // Map venue category to PlaceResult category
        let category: "restaurant" | "activity" | "outdoor" = "activity"
        if (venue.category === 'restaurant' || venue.tags.includes('restaurant') || venue.tags.includes('food')) {
          category = "restaurant"
        } else if (venue.category === 'outdoor' || venue.tags.includes('outdoor') || venue.tags.includes('park')) {
          category = "outdoor"
        } else {
          category = "activity"
        }
        
        return {
          id: venue.id,
          name: venue.name,
          rating: venue.rating, // Don't fake ratings for manual venues - leave undefined if not set
          address: venue.address,
          price: venue.price || 2,
          isOutdoor: category === 'outdoor',
          photoUrl: venue.photoUrl,
          openNow: venue.openNow,
          category: category,
          placeId: venue.id,
        }
      })
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Plan Header */}
      <Card>
        <CardHeader>
          <CardTitle>Create Your Date Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Give your date plan a title..."
            value={plan.title}
            onChange={(e) => setPlan(prev => ({ ...prev, title: e.target.value }))}
            className="text-lg font-medium"
          />
          <Textarea
            placeholder="Add a description (optional)..."
            value={plan.description || ''}
            onChange={(e) => setPlan(prev => ({ ...prev, description: e.target.value }))}
            className="min-h-20"
          />
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">{city}</span>
          </div>
        </CardContent>
      </Card>

      {/* Timing Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timing Overview
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTimingDetails(!showTimingDetails)}
              className="ml-auto"
            >
              {showTimingDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 rotate-180" />}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Total Steps</label>
              <p className="text-lg font-semibold">{plan.steps.length}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Estimated Duration</label>
              <p className="text-lg font-semibold">
                {plan.estimatedTotalTime ? `${Math.floor(plan.estimatedTotalTime / 60)}h ${plan.estimatedTotalTime % 60}m` : 'Not set'}
              </p>
            </div>
          </div>
          
          {showTimingDetails && (
            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-medium">Step Timing Details</h4>
              {plan.steps.map((step, index) => (
                <div key={step.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">Step {index + 1}</span>
                  <div className="flex items-center gap-2">
                    {step.timing?.startTime && (
                      <span className="text-gray-600">
                        {step.timing.startTime}
                        {step.timing.estimatedDuration && step.timing.startTime && 
                          ` - ${calculateEndTime(step.timing.startTime, step.timing.estimatedDuration)}`
                        }
                      </span>
                    )}
                    {step.timing?.estimatedDuration && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        {step.timing.estimatedDuration}min
                      </span>
                    )}
                    {step.timing?.timeBuffer && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                        +{step.timing.timeBuffer}min buffer
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Steps List */}
      <div className="space-y-4">
        {plan.steps.map((step, index) => (
          <StepCard
            key={step.id}
            step={step}
            isFirst={index === 0}
            isLast={index === plan.steps.length - 1}
            isDragging={draggedStep === step.id}
            isDragOver={dragOverStep === step.id}
            isSearching={searchingSteps.has(step.id)}
            searchResults={venueSearchResults[step.id] || []}
            onUpdate={(updates) => updateStep(step.id, updates)}
            onRemove={() => removeStep(step.id)}
            onMove={(direction) => moveStep(step.id, direction)}
            onDragStart={(e) => handleDragStart(e, step.id)}
            onDragOver={(e) => handleDragOver(e, step.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, step.id)}
            onDragEnd={handleDragEnd}
            onFindVenues={() => findVenuesForStep(step.id)}
            onSurpriseMe={() => surpriseMeForStep(step.id)}
            onSelectVenue={(venue) => selectVenueForStep(step.id, venue)}
            onClearVenue={() => clearVenueForStep(step.id)}
            onManualVenueSearch={(venueName) => manualVenueSearchForStep(step.id, venueName)}
            calculateEndTime={calculateEndTime}
          />
        ))}

        {/* Add Step Button */}
        <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
          <CardContent className="flex items-center justify-center py-8">
            <Button onClick={addStep} variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Step
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Save Date Modal */}
      <SaveDateModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        places={convertStepsToPlaceResults()}
      />

      {/* Save Button */}
      {plan.steps.some(step => step.venue && (step.status === 'filled' || step.status === 'confirmed')) && (
        <div className="flex justify-center">
          <Button
            onClick={() => setIsSaveModalOpen(true)}
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90"
            disabled={!plan.title.trim()}
          >
            Save Date Plan
          </Button>
        </div>
      )}
    </div>
  )
}

interface StepCardProps {
  step: DateStep
  isFirst: boolean
  isLast: boolean
  isDragging: boolean
  isDragOver: boolean
  isSearching: boolean
  searchResults: TagSearchResult[]
  onUpdate: (updates: Partial<DateStep>) => void
  onRemove: () => void
  onMove: (direction: 'up' | 'down') => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  onFindVenues: () => void
  onSurpriseMe: () => void
  onSelectVenue: (venue: TagSearchResult) => void
  onClearVenue: () => void
  onManualVenueSearch: (venueName: string) => void
  calculateEndTime: (startTime: string, duration: number) => string
}

function StepCard({ 
  step, 
  isFirst, 
  isLast, 
  isDragging, 
  isDragOver, 
  isSearching,
  searchResults,
  onUpdate, 
  onRemove, 
  onMove,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onFindVenues,
  onSurpriseMe,
  onSelectVenue,
  onClearVenue,
  onManualVenueSearch,
  calculateEndTime
}: StepCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')

  // Debug logging only when search results change
  if (searchResults.length > 0) {
    console.log(`🎯 StepCard ${step.stepNumber} has search results:`, searchResults.length)
  }

  const addTag = (tag: string) => {
    if (!step.preferences.tags.includes(tag)) {
      onUpdate({
        preferences: {
          ...step.preferences,
          tags: [...step.preferences.tags, tag],
        },
      })
    }
  }

  const removeTag = (tagToRemove: string) => {
    onUpdate({
      preferences: {
        ...step.preferences,
        tags: step.preferences.tags.filter(tag => tag !== tagToRemove),
      },
    })
  }

  const handleManualInput = () => {
    if (inputValue.trim()) {
      onManualVenueSearch(inputValue.trim())
      setInputValue('')
      setIsEditing(false)
    }
  }

  const getStatusColor = () => {
    if (isDragging) {
      return 'bg-blue-50 border-blue-400 opacity-50 scale-105'
    }
    if (isDragOver) {
      return 'bg-blue-100 border-blue-500 border-2 scale-102'
    }
    
    switch (step.status) {
      case 'empty':
        return 'bg-gray-100 border-gray-300'
      case 'searching':
        return 'bg-blue-100 border-blue-300'
      case 'filled':
        return 'bg-green-100 border-green-300'
      case 'confirmed':
        return 'bg-purple-100 border-purple-300'
      default:
        return 'bg-gray-100 border-gray-300'
    }
  }

  // If this is an empty step or searching step, show the input interface like MultipleVenuesSection
  if ((step.status === 'empty' || step.status === 'searching') && !step.venue) {
    return (
      <Card 
        className={cn("transition-all", getStatusColor())}
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Drag Handle */}
            <div className="flex flex-col gap-1 items-center">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onMove('up')}
                disabled={isFirst}
                className="h-6 w-6 p-0 cursor-pointer"
                title="Move up"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <div className="cursor-grab active:cursor-grabbing">
                <GripVertical className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onMove('down')}
                disabled={isLast}
                className="h-6 w-6 p-0 cursor-pointer"
                title="Move down"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleManualInput()
                          }
                        }}
                        placeholder="Enter a specific venue name..."
                        className="w-full"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleManualInput}
                          disabled={!inputValue.trim()}
                          className="flex-1"
                        >
                          <Search className="h-4 w-4 mr-1" />
                          Add Venue
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false)
                            setInputValue('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-lg leading-tight text-gray-500">
                          {step.title}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          Step {step.stepNumber}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400">Add a specific venue or get suggestions based on tags</p>
                      
                      {/* Venue Type Selection */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-2 block">What type of venue?</label>
                          <div className="grid grid-cols-2 gap-2">
                            {VENUE_TYPE_OPTIONS.map((option) => {
                              const isSelected = step.preferences.tags.includes(option.value)
                              return (
                                <Button
                                  key={option.value}
                                  size="sm"
                                  variant={isSelected ? "default" : "outline"}
                                                                    onClick={() => {
                                    if (isSelected) {
                                      // If deselecting current venue type, clear all tags
                                      onUpdate({
                                        preferences: {
                                          ...step.preferences,
                                          tags: [],
                                        },
                                      })
                                    } else {
                                      // If selecting new venue type, clear all tags and add new one
                                      onUpdate({
                                        preferences: {
                                          ...step.preferences,
                                          tags: [option.value],
                                        },
                                      })
                                    }
                                  }}
                                  className="h-auto p-3 flex flex-col items-center gap-1"
                                >
                                  <span className="text-lg">{option.icon}</span>
                                  <span className="text-xs font-medium">{option.label}</span>
                                </Button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Venue Sub-Tags */}
                        {(() => {
                          const venueTypes = ['restaurant', 'activity', 'outdoor', 'event'] as const
                          const selectedVenueType = step.preferences.tags.find(tag => venueTypes.includes(tag as any)) as keyof typeof VENUE_SUB_TAGS
                          if (!selectedVenueType) return null
                          
                          const subTags = VENUE_SUB_TAGS[selectedVenueType]
                          if (!subTags) return null
                          
                          return (
                            <div>
                              <label className="text-xs font-medium text-gray-600 mb-2 block">
                                {selectedVenueType.charAt(0).toUpperCase() + selectedVenueType.slice(1)} Type (optional)
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {subTags.map((tag) => {
                                  const isSelected = step.preferences.tags.includes(tag)
                                  return (
                                    <Button
                                      key={tag}
                                      size="sm"
                                      variant={isSelected ? "secondary" : "outline"}
                                      onClick={() => {
                                        if (isSelected) {
                                          removeTag(tag)
                                        } else {
                                          addTag(tag)
                                        }
                                      }}
                                      className="h-7 text-xs"
                                    >
                                      {tag.replace('-', ' ')}
                                    </Button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })()}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditing(true)}
                          className="flex-1"
                        >
                          <Search className="h-4 w-4 mr-1" />
                          Add Specific Venue
                        </Button>
                        <Button
                          size="sm"
                          onClick={onSurpriseMe}
                          disabled={isSearching || step.preferences.tags.length === 0}
                          className="flex-1"
                        >
                          {isSearching ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-1" />
                          )}
                          Surprise Me
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onRemove}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Choose a venue: ({searchResults.length} options)</h4>
                  <div className="grid gap-2 max-h-64 overflow-y-auto">
                    {searchResults.map((venue) => (
                      <Card 
                        key={venue.id} 
                        className="p-3 hover:bg-gray-50 cursor-pointer border-l-4 border-l-blue-500"
                        onClick={() => onSelectVenue(venue)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-sm">{venue.name}</h5>
                            <p className="text-xs text-gray-600">{venue.address}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {venue.rating && (
                                <div className="flex items-center gap-1">
                                  <span className="text-yellow-500">★</span>
                                  <span className="text-xs">{venue.rating}</span>
                                </div>
                              )}
                              {venue.priceLevel && (
                                <div className="text-xs text-gray-500">
                                  {'$'.repeat(venue.priceLevel)}
                                </div>
                              )}
                              {venue.openNow && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  Open Now
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Timing Details */}
              {showDetails && (
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <Timer className="h-4 w-4 text-gray-500" />
                    <h4 className="font-medium text-sm">Timing Settings</h4>
                  </div>
                  
                  {/* Primary timing controls */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Duration (min)</label>
                      <Input
                        type="number"
                        placeholder="60"
                        value={step.timing?.estimatedDuration || ''}
                        onChange={(e) => onUpdate({
                          timing: {
                            ...step.timing,
                            estimatedDuration: parseInt(e.target.value) || undefined,
                          },
                        })}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Start Time</label>
                      <Input
                        type="time"
                        value={step.timing?.startTime || ''}
                        onChange={(e) => onUpdate({
                          timing: {
                            ...step.timing,
                            startTime: e.target.value,
                          },
                        })}
                        className="h-8"
                      />
                    </div>
                  </div>

                  {/* Buffer time and flexibility */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Buffer Time (min)</label>
                      <Input
                        type="number"
                        placeholder="15"
                        value={step.timing?.timeBuffer || ''}
                        onChange={(e) => onUpdate({
                          timing: {
                            ...step.timing,
                            timeBuffer: parseInt(e.target.value) || undefined,
                          },
                        })}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Time Flexibility</label>
                      <Select 
                        value={step.timing?.flexibility || 'flexible'}
                        onValueChange={(value) => onUpdate({
                          timing: {
                            ...step.timing,
                            flexibility: value as 'strict' | 'flexible' | 'very-flexible',
                          },
                        })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="strict">Strict</SelectItem>
                          <SelectItem value="flexible">Flexible</SelectItem>
                          <SelectItem value="very-flexible">Very Flexible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Time preference */}
                  <div>
                    <label className="text-xs font-medium text-gray-600">Time Preference</label>
                    <Select 
                      value={step.timing?.timePreference || 'anytime'}
                      onValueChange={(value) => onUpdate({
                        timing: {
                          ...step.timing,
                          timePreference: value as 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime',
                        },
                      })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anytime">Anytime</SelectItem>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="afternoon">Afternoon</SelectItem>
                        <SelectItem value="evening">Evening</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Show calculated end time */}
                  {step.timing?.startTime && step.timing?.estimatedDuration && (
                    <div className="bg-blue-50 p-2 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">
                          {step.timing.startTime} - {calculateEndTime(step.timing.startTime, step.timing.estimatedDuration)}
                        </span>
                        {step.timing.timeBuffer && (
                          <span className="text-gray-600">
                            (+{step.timing.timeBuffer}min buffer)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-gray-600">Notes</label>
                    <Textarea
                      placeholder="Add any special notes or requirements..."
                      value={step.notes || ''}
                      onChange={(e) => onUpdate({ notes: e.target.value })}
                      className="min-h-16"
                    />
                  </div>
                </div>
              )}

              {/* Show/Hide Details Toggle */}
              <div className="flex justify-center">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs"
                >
                  {showDetails ? 'Hide' : 'Show'} Timing Details
                  <ChevronDown className={cn("h-3 w-3 ml-1 transition-transform", showDetails && "rotate-180")} />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Regular venue card (filled step)
  return (
    <Card 
      className={cn("transition-all", getStatusColor())}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Photo */}
          {step.venue?.photoUrl && (
            <div className="flex-shrink-0 w-20 h-20 overflow-hidden rounded-lg">
              <img
                src={step.venue.photoUrl}
                alt={step.venue.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Drag Handle */}
          <div className="flex flex-col gap-1 items-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onMove('up')}
              disabled={isFirst}
              className="h-6 w-6 p-0 cursor-pointer"
              title="Move up"
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <div className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onMove('down')}
              disabled={isLast}
              className="h-6 w-6 p-0 cursor-pointer"
              title="Move down"
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-lg leading-tight">{step.venue?.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    Step {step.stepNumber}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{step.venue?.address}</p>
                <div className="flex items-center gap-3 mt-2">
                  {step.venue?.rating && (
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="text-sm font-medium">{step.venue.rating.toFixed(1)}</span>
                    </div>
                  )}
                  {step.venue?.price && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-green-600">
                        {'$'.repeat(step.venue.price)}
                      </span>
                    </div>
                  )}
                  {step.venue?.openNow !== undefined && (
                    <div className={cn(
                      "text-xs px-2 py-1 rounded-full",
                      step.venue.openNow 
                        ? "bg-green-100 text-green-700" 
                        : "bg-red-100 text-red-700"
                    )}>
                      {step.venue.openNow ? 'Open' : 'Closed'}
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {step.preferences.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDetails(!showDetails)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showDetails && "rotate-180")} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClearVenue}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Timing Details */}
            {showDetails && (
              <div className="space-y-3 pt-3 border-t mt-3">
                <div className="flex items-center gap-2 mb-3">
                  <Timer className="h-4 w-4 text-gray-500" />
                  <h4 className="font-medium text-sm">Timing Settings</h4>
                </div>
                
                {/* Primary timing controls */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Duration (min)</label>
                    <Input
                      type="number"
                      placeholder="60"
                      value={step.timing?.estimatedDuration || ''}
                      onChange={(e) => onUpdate({
                        timing: {
                          ...step.timing,
                          estimatedDuration: parseInt(e.target.value) || undefined,
                        },
                      })}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Start Time</label>
                    <Input
                      type="time"
                      value={step.timing?.startTime || ''}
                      onChange={(e) => onUpdate({
                        timing: {
                          ...step.timing,
                          startTime: e.target.value,
                        },
                      })}
                      className="h-8"
                    />
                  </div>
                </div>

                {/* Buffer time and flexibility */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Buffer Time (min)</label>
                    <Input
                      type="number"
                      placeholder="15"
                      value={step.timing?.timeBuffer || ''}
                      onChange={(e) => onUpdate({
                        timing: {
                          ...step.timing,
                          timeBuffer: parseInt(e.target.value) || undefined,
                        },
                      })}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Time Flexibility</label>
                    <Select 
                      value={step.timing?.flexibility || 'flexible'}
                      onValueChange={(value) => onUpdate({
                        timing: {
                          ...step.timing,
                          flexibility: value as 'strict' | 'flexible' | 'very-flexible',
                        },
                      })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strict">Strict</SelectItem>
                        <SelectItem value="flexible">Flexible</SelectItem>
                        <SelectItem value="very-flexible">Very Flexible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Time preference */}
                <div>
                  <label className="text-xs font-medium text-gray-600">Time Preference</label>
                  <Select 
                    value={step.timing?.timePreference || 'anytime'}
                    onValueChange={(value) => onUpdate({
                      timing: {
                        ...step.timing,
                        timePreference: value as 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime',
                      },
                    })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anytime">Anytime</SelectItem>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Show calculated end time */}
                {step.timing?.startTime && step.timing?.estimatedDuration && (
                  <div className="bg-blue-50 p-2 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">
                        {step.timing.startTime} - {calculateEndTime(step.timing.startTime, step.timing.estimatedDuration)}
                      </span>
                      {step.timing.timeBuffer && (
                        <span className="text-gray-600">
                          (+{step.timing.timeBuffer}min buffer)
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-600">Notes</label>
                  <Textarea
                    placeholder="Add any special notes or requirements..."
                    value={step.notes || ''}
                    onChange={(e) => onUpdate({ notes: e.target.value })}
                    className="min-h-16"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 