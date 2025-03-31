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