"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Heart, ArrowRight, ArrowLeft } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { 
  updateUserPreferences,
  type UserInterests 
} from "@/app/actions/user-preferences"

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onComplete: () => void
}

export function OnboardingModal({ isOpen, onClose, userId, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1)
  const [interests, setInterests] = useState<string[]>([])
  const [ageRange, setAgeRange] = useState("")
  const [relationshipStatus, setRelationshipStatus] = useState("")
  const [dateFrequency, setDateFrequency] = useState("")
  const [budgetRange, setBudgetRange] = useState("")
  const [defaultCity, setDefaultCity] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const interestCategories = [
    "restaurants", "activities", "drinks", "outdoor", "entertainment", 
    "culture", "sports", "nightlife", "shopping", "wellness"
  ]

  const ageRanges = ["18-25", "26-35", "36-45", "46-55", "56-65", "65+"]
  const relationshipStatuses = ["single", "in_relationship", "married", "divorced", "widowed", "complicated"]
  const dateFrequencies = ["weekly", "biweekly", "monthly", "occasionally", "rarely", "first_time"]
  const budgetRanges = ["budget_conscious", "moderate", "comfortable", "luxury", "unlimited"]

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const result = await updateUserPreferences(userId, {
        interests,
        age_range: ageRange,
        relationship_status: relationshipStatus,
        date_frequency: dateFrequency,
        budget_range: budgetRange,
        default_city: defaultCity,
        activity_preferences: {
          indoor: false,
          outdoor: interests.includes('outdoor'),
          physical: interests.includes('sports'),
          relaxing: interests.includes('wellness'),
          creative: interests.includes('culture'),
          social: interests.includes('nightlife'),
          educational: interests.includes('culture'),
          adventurous: interests.includes('adventure')
        },
        dining_preferences: {
          casual: true,
          fine_dining: budgetRange === 'luxury' || budgetRange === 'comfortable',
          ethnic_cuisine: true,
          vegetarian_friendly: false,
          vegan_friendly: false,
          cocktail_bars: interests.includes('drinks'),
          wine_bars: interests.includes('drinks'),
          breweries: interests.includes('drinks'),
          coffee_shops: true
        },
        location_preferences: {
          city_center: true,
          suburbs: false,
          waterfront: interests.includes('outdoor'),
          rooftop: interests.includes('drinks'),
          historic_areas: interests.includes('culture'),
          nightlife_districts: interests.includes('nightlife'),
          quiet_neighborhoods: relationshipStatus === 'married',
          shopping_areas: interests.includes('shopping')
        },
        default_price_range: budgetRange === 'budget_conscious' ? 1 : 
                           budgetRange === 'moderate' ? 2 : 
                           budgetRange === 'comfortable' ? 3 : 
                           budgetRange === 'luxury' ? 4 : 0
      })

      if (result.success) {
        toast({
          title: "Welcome to DateThinker!",
          description: "Your preferences have been saved. We'll use this to recommend better dates for you.",
        })
        onComplete()
        onClose()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("Error saving preferences:", error)
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return interests.length > 0
      case 2:
        return ageRange !== "" && relationshipStatus !== ""
      case 3:
        return dateFrequency !== "" && budgetRange !== ""
      case 4:
        return true // City is optional
      default:
        return false
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />
            Welcome to DateThinker!
          </DialogTitle>
          <DialogDescription>
            Let's set up your preferences to get better date recommendations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-center space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i === step ? "bg-rose-500" : i < step ? "bg-rose-300" : "bg-gray-200"
                }`}
              />
            ))}
          </div>

          {/* Step 1: Interests */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">What are you interested in?</h3>
              <p className="text-sm text-muted-foreground">Select all that apply</p>
              <div className="grid grid-cols-2 gap-3">
                {interestCategories.map((interest) => (
                  <label
                    key={interest}
                    className="flex items-center space-x-2 cursor-pointer p-3 rounded-lg border hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={interests.includes(interest)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setInterests([...interests, interest])
                        } else {
                          setInterests(interests.filter(i => i !== interest))
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm capitalize">{interest.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Demographics */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Tell us about yourself</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age-range">Age Range</Label>
                  <select
                    id="age-range"
                    value={ageRange}
                    onChange={(e) => setAgeRange(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">Select your age range</option>
                    {ageRanges.map((range) => (
                      <option key={range} value={range}>{range}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationship-status">Relationship Status</Label>
                  <select
                    id="relationship-status"
                    value={relationshipStatus}
                    onChange={(e) => setRelationshipStatus(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">Select your status</option>
                    {relationshipStatuses.map((status) => (
                      <option key={status} value={status}>{status.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Dating Preferences */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Dating Preferences</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date-frequency">How often do you date?</Label>
                  <select
                    id="date-frequency"
                    value={dateFrequency}
                    onChange={(e) => setDateFrequency(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">Select frequency</option>
                    {dateFrequencies.map((freq) => (
                      <option key={freq} value={freq}>{freq.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget-range">Budget Range</Label>
                  <select
                    id="budget-range"
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">Select budget range</option>
                    {budgetRanges.map((budget) => (
                      <option key={budget} value={budget}>
                        {budget === 'budget_conscious' ? 'Budget Conscious ($)' :
                         budget === 'moderate' ? 'Moderate ($$)' :
                         budget === 'comfortable' ? 'Comfortable ($$$)' :
                         budget === 'luxury' ? 'Luxury ($$$$)' :
                         'Unlimited'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Location */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Where do you usually date?</h3>
              <div className="space-y-2">
                <Label htmlFor="default-city">Default City (Optional)</Label>
                <Input
                  id="default-city"
                  type="text"
                  value={defaultCity}
                  onChange={(e) => setDefaultCity(e.target.value)}
                  placeholder="Enter your city"
                  className="p-3"
                />
                <p className="text-sm text-muted-foreground">
                  This will help us suggest places near you
                </p>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {step < 4 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Setting up..." : "Complete Setup"}
              </Button>
            )}
          </div>

          {/* Skip option */}
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-sm text-muted-foreground"
            >
              Skip for now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 