export interface Profile {
  id: string
  name: string | null
  avatar_url: string | null
  currency: string
  created_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  icon: string
  color: string
  budget_limit: number | null
  is_default: boolean
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category_id: string | null
  date: string
  is_recurring: boolean
  recurrence_interval: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
  created_at: string
  categories?: Category | null // Juntado na consulta do Supabase
}

export interface Goal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  color: string
  created_at: string
}

export interface GoalContribution {
  id: string
  goal_id: string
  amount: number
  date: string
  note: string | null
  created_at: string
}
