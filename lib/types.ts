export interface Activity {
  name: string
  description: string
  duration: string
}

export interface DatePlan {
  id: string
  title: string
  description: string
  activities: Activity[]
  created_at: string
  updated_at: string
  user_id: string
}

export interface DateSet {
  id: string
  title: string
  date: string
  start_time: string
  end_time: string
  places: any[] // Replace with proper Place type if available
  share_id: string
  created_at: string
  user_id: string
  notes: string | null
} 