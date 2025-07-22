"use client"

import { useState } from "react"
import { Calendar, Clock, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, MapPin, DollarSign } from "lucide-react"
import type { PlanningStackItem } from "@/app/actions/planning-stack"

interface SaveDateSetModalProps {
  isOpen: boolean
  onClose: () => void
  planningStack: PlanningStackItem[]
  onSave: (dateSet: {
    title: string
    date: string
    startTime: string
    endTime: string
    notes: string
  }) => void
}

export function SaveDateSetModal({ isOpen, onClose, planningStack, onSave }: SaveDateSetModalProps) {
  const [title, setTitle] = useState("")
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) {
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        title: title.trim(),
        date: date || '',
        startTime: startTime || '',
        endTime: endTime || '',
        notes: notes.trim()
      })
      
      // Reset form
      setTitle("")
      setDate("")
      setStartTime("")
      setEndTime("")
      setNotes("")
      onClose()
    } catch (error) {
      console.error("Error saving date set:", error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Save className="w-5 h-5 mr-2" />
              Save Date Set
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Set Name *
              </label>
              <Input
                placeholder="e.g., Romantic Evening, Adventure Day"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date (Optional)
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="Select date"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required for Google Calendar sharing
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time (Optional)
                </label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="Select time"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required for Google Calendar sharing
                </p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time (Optional)
              </label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="Select time"
              />
              <p className="text-xs text-gray-500 mt-1">
                Required for Google Calendar sharing
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <Textarea
                placeholder="Add any special notes, preferences, or details for Google Calendar..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Will be included in Google Calendar event description
              </p>
            </div>
          </div>

          {/* Preview */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Date Set Preview</h3>
            <div className="space-y-3">
              {planningStack.map((item, index) => (
                <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Badge variant="secondary" className="w-6 h-6 flex items-center justify-center text-xs">
                    {index + 1}
                  </Badge>
                  <div className="flex-1">
                    <h4 className="font-medium">{item.venue_name}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Badge variant="outline" className="text-xs">{item.venue_category}</Badge>
                      {item.venue_rating && (
                        <div className="flex items-center">
                          <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                          {item.venue_rating}
                        </div>
                      )}
                      {item.venue_price_level && (
                        <div className="flex items-center">
                          {[...Array(item.venue_price_level)].map((_, i) => (
                            <DollarSign key={i} className="w-3 h-3 text-green-600" />
                          ))}
                        </div>
                      )}
                    </div>
                    {item.scheduled_time && (
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Clock className="w-3 h-3 mr-1" />
                        {item.scheduled_time} ({item.duration_minutes} min)
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!title.trim() || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Date Set'}
            </Button>
          </div>
          
          {/* Help Text */}
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            <p>💡 <strong>Tip:</strong> Only the title is required. Add date and time if you plan to share to Google Calendar!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 