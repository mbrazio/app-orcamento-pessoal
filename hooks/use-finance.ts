'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Category, Transaction, Goal } from '@/types'

// Chaves de Consulta (Query Keys)
export const financeKeys = {
  profile: ['profile'] as const,
  categories: ['categories'] as const,
  transactions: (filters?: {
    startDate?: string
    endDate?: string
    categoryId?: string
    type?: 'income' | 'expense' | 'all'
    search?: string
  }) => ['transactions', filters] as const,
  goals: ['goals'] as const,
  contributions: (goalId?: string) => ['contributions', goalId] as const,
}

// ----------------------------------------------------
// 1. HOOKS DE CATEGORIAS
// ----------------------------------------------------

export function useCategories() {
  const supabase = createClient()
  return useQuery<Category[]>({
    queryKey: financeKeys.categories,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      return (data || []).map(cat => ({
        ...cat,
        budget_limit: cat.budget_limit ? Number(cat.budget_limit) : null
      }))
    },
  })
}

export function useAddCategory() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (newCategory: Omit<Category, 'id' | 'user_id' | 'is_default' | 'created_at'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .from('categories')
        .insert([{ ...newCategory, user_id: user.id }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.categories })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (updated: Partial<Category> & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updated)
        .eq('id', updated.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.categories })
      queryClient.invalidateQueries({ queryKey: ['transactions'] }) // Recarregar transações pois a categoria pode ter mudado
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.categories })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

// ----------------------------------------------------
// 2. HOOKS DE TRANSAÇÕES
// ----------------------------------------------------

export function useTransactions(filters?: {
  startDate?: string
  endDate?: string
  categoryId?: string
  type?: 'income' | 'expense' | 'all'
  search?: string
}) {
  const supabase = createClient()
  return useQuery<Transaction[]>({
    queryKey: financeKeys.transactions(filters),
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*, categories(*)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters?.startDate) {
        query = query.gte('date', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate)
      }
      if (filters?.categoryId && filters.categoryId !== 'all') {
        query = query.eq('category_id', filters.categoryId)
      }
      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type)
      }
      if (filters?.search) {
        query = query.ilike('description', `%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return ((data || []) as unknown as Array<{
        id: string
        user_id: string
        description: string
        amount: string | number
        type: 'income' | 'expense'
        category_id: string | null
        date: string
        is_recurring: boolean
        recurrence_interval: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
        created_at: string
        categories: {
          id: string
          user_id: string
          name: string
          icon: string
          color: string
          budget_limit: string | number | null
          is_default: boolean
          created_at: string
        } | null
      }>).map((t) => ({
        ...t,
        amount: Number(t.amount),
        categories: t.categories ? {
          ...t.categories,
          budget_limit: t.categories.budget_limit ? Number(t.categories.budget_limit) : null
        } : null
      }))
    },
  })
}

export function useAddTransaction() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (newTx: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'categories'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .from('transactions')
        .insert([{ ...newTx, user_id: user.id }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (updated: Partial<Transaction> & { id: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updated)
        .eq('id', updated.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

// ----------------------------------------------------
// 3. HOOKS DE METAS (GOALS)
// ----------------------------------------------------

export function useGoals() {
  const supabase = createClient()
  return useQuery<Goal[]>({
    queryKey: financeKeys.goals,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('deadline', { ascending: true })

      if (error) throw error
      return (data || []).map(g => ({
        ...g,
        target_amount: Number(g.target_amount),
        current_amount: Number(g.current_amount)
      }))
    },
  })
}

export function useAddGoal() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (newGoal: Omit<Goal, 'id' | 'user_id' | 'current_amount' | 'created_at'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .from('goals')
        .insert([{ ...newGoal, user_id: user.id, current_amount: 0.00 }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goals })
    },
  })
}

export function useUpdateGoal() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (updated: Partial<Goal> & { id: string }) => {
      const { data, error } = await supabase
        .from('goals')
        .update(updated)
        .eq('id', updated.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goals })
    },
  })
}

export function useDeleteGoal() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goals })
    },
  })
}

// Adicionar Aporte/Contribuição e atualizar meta
export function useAddGoalContribution() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      goalId,
      amount,
      date,
      note,
    }: {
      goalId: string
      amount: number
      date: string
      note?: string
    }) => {
      // 1. Inserir contribuição
      const { data: contribution, error: contribError } = await supabase
        .from('goal_contributions')
        .insert([{ goal_id: goalId, amount, date, note }])
        .select()
        .single()

      if (contribError) throw contribError

      // 2. Buscar valor acumulado da meta e somar
      const { data: goal, error: goalFetchError } = await supabase
        .from('goals')
        .select('current_amount')
        .eq('id', goalId)
        .single()

      if (goalFetchError) throw goalFetchError

      const newCurrentAmount = Number(goal.current_amount) + amount

      // 3. Atualizar o current_amount da meta
      const { error: goalUpdateError } = await supabase
        .from('goals')
        .update({ current_amount: newCurrentAmount })
        .eq('id', goalId)

      if (goalUpdateError) throw goalUpdateError

      return { contribution, newCurrentAmount }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.goals })
    },
  })
}
