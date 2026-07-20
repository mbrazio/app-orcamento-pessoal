'use client'

import * as React from 'react'
import {
  useGoals,
  useAddGoal,
  useDeleteGoal,
  useAddGoalContribution
} from '@/hooks/use-finance'
import { Goal } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Plus,
  Trash2,
  Calendar,
  Target,
  PiggyBank,
  CheckCircle2,
  CircleDollarSign
} from 'lucide-react'
import { formatCurrencyBRL, calculateGoalProgress, toDecimal } from '@/lib/finance-math'

// Schema da Meta
const goalSchema = z.object({
  name: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres'),
  target_amount: z.coerce.number().gt(0, 'O valor alvo deve ser um número positivo maior que zero'),
  deadline: z.string().min(1, 'Selecione um prazo limite'),
  color: z.string().min(1, 'Selecione uma cor'),
})

// Schema do Aporte
const contributionSchema = z.object({
  amount: z.coerce.number().gt(0, 'O valor do depósito deve ser um número positivo maior que zero'),
  date: z.string().min(1, 'Selecione a data do depósito'),
  note: z.string().optional(),
})

type GoalFormData = z.infer<typeof goalSchema>
type ContributionFormData = z.infer<typeof contributionSchema>

const AVAILABLE_COLORS = [
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#F59E0B',
  '#EC4899',
  '#06B6D4',
]

export default function GoalsPage() {
  const { data: goals = [], isLoading } = useGoals()
  
  const addGoalMutation = useAddGoal()
  const deleteGoalMutation = useDeleteGoal()
  const addContributionMutation = useAddGoalContribution()

  // Estados dos Modais
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isDepositOpen, setIsDepositOpen] = React.useState(false)
  const [selectedGoal, setSelectedGoal] = React.useState<Goal | null>(null)

  // Formulário de Meta
  const {
    register: registerGoal,
    handleSubmit: handleGoalSubmit,
    reset: resetGoal,
    setValue: setGoalValue,
    control: goalControl,
    formState: { errors: goalErrors },
  } = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      target_amount: 0,
      deadline: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      color: '#10B981',
    },
  })

  const selectedColor = useWatch({ control: goalControl, name: 'color' })

  // Formulário de Aporte
  const {
    register: registerContrib,
    handleSubmit: handleContribSubmit,
    reset: resetContrib,
    formState: { errors: contribErrors },
  } = useForm({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      note: '',
    },
  })

  const openAddModal = () => {
    resetGoal({
      name: '',
      target_amount: 0,
      deadline: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      color: '#10B981',
    })
    setIsAddOpen(true)
  }

  const openDepositModal = (goal: Goal) => {
    setSelectedGoal(goal)
    resetContrib({
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      note: `Aporte para ${goal.name}`,
    })
    setIsDepositOpen(true)
  }

  const onGoalSubmit = async (data: GoalFormData) => {
    try {
      await addGoalMutation.mutateAsync({
        ...data,
        target_amount: toDecimal(data.target_amount).abs().toNumber(),
      })
      setIsAddOpen(false)
    } catch {
      // Silencioso sem console.log
    }
  }

  const onContribSubmit = async (data: ContributionFormData) => {
    if (!selectedGoal) return
    try {
      await addContributionMutation.mutateAsync({
        goalId: selectedGoal.id,
        amount: toDecimal(data.amount).abs().toNumber(),
        date: data.date,
        note: data.note,
      })
      setIsDepositOpen(false)
    } catch {
      // Silencioso sem console.log
    }
  }

  const onDeleteGoal = async (goal: Goal) => {
    if (confirm(`Deseja realmente arquivar a meta "${goal.name}"? O histórico de aportes será mantido no banco de dados.`)) {
      try {
        await deleteGoalMutation.mutateAsync(goal.id)
      } catch {
        // Silencioso sem console.log
      }
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight select-none">Metas Financeiras</h1>
          <p className="text-muted-foreground text-sm select-none">
            Planeje metas de economia para o futuro e acompanhe seu progresso acumulado.
          </p>
        </div>
        <Button onClick={openAddModal} className="select-none">
          <Plus className="h-4 w-4 mr-2" />
          Nova Meta
        </Button>
      </div>

      {/* LISTA DE METAS */}
      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : goals.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const percent = calculateGoalProgress(goal.current_amount, goal.target_amount)
            const isCompleted = percent >= 100

            return (
              <div
                key={goal.id}
                className="glass-card rounded-xl p-6 border border-border/50 flex flex-col justify-between gap-6 transition-all hover:border-primary/20 relative"
              >
                {/* Header do Card */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2.5 rounded-lg border"
                      style={{
                        backgroundColor: `${goal.color}12`,
                        borderColor: `${goal.color}35`,
                      }}
                    >
                      <Target className="h-5 w-5" style={{ color: goal.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base leading-none mb-1 select-none">{goal.name}</h3>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Prazo: {formatDate(goal.deadline)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteGoal(goal)}
                    className="p-1.5 rounded-md hover:bg-danger/10 text-muted-foreground hover:text-danger cursor-pointer transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Valores */}
                <div className="space-y-1 select-none">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Progresso</span>
                    <span className="text-xs font-semibold text-muted-foreground">Alvo: {formatCurrencyBRL(goal.target_amount)}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold">{formatCurrencyBRL(goal.current_amount)}</span>
                    <span className="text-sm font-semibold" style={{ color: goal.color }}>
                      {percent.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="space-y-3">
                  <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: goal.color,
                        boxShadow: `0 0 10px ${goal.color}33`,
                      }}
                    />
                  </div>

                  {/* Ações da Meta */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDepositModal(goal)}
                      className="flex-1 text-xs border-border/50 select-none"
                    >
                      <PiggyBank className="h-4 w-4 mr-1.5" />
                      Depositar
                    </Button>
                    {isCompleted && (
                      <div className="flex items-center gap-1 text-xs text-emerald-500 font-bold px-2 select-none">
                        <CheckCircle2 className="h-4 w-4" />
                        Concluída
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card rounded-xl p-12 text-center text-muted-foreground select-none flex flex-col items-center gap-2">
          <Target className="h-10 w-10 text-muted-foreground" />
          <span className="text-sm">Nenhuma meta cadastrada.</span>
        </div>
      )}

      {/* MODAL ADICIONAR META */}
      <Dialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Nova Meta Financeira">
        <form onSubmit={handleGoalSubmit(onGoalSubmit)} className="space-y-4">
          <Input
            label="Objetivo / Nome da Meta"
            placeholder="Ex: Reserva de Emergência, Viagem..."
            error={goalErrors.name?.message}
            {...registerGoal('name')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valor Alvo (R$)"
              type="number"
              step="0.01"
              placeholder="0,00"
              error={goalErrors.target_amount?.message}
              {...registerGoal('target_amount')}
            />

            <Input
              label="Prazo Limite"
              type="date"
              error={goalErrors.deadline?.message}
              {...registerGoal('deadline')}
            />
          </div>

          <div className="space-y-1.5 select-none">
            <label className="text-sm font-medium text-foreground/80 leading-none">Cor da Barra de Progresso</label>
            <div className="flex flex-wrap gap-2.5 pt-1">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setGoalValue('color', c)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                    selectedColor === c ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Salvar
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL DEPOSITAR */}
      <Dialog
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        title={selectedGoal ? `Aporte: ${selectedGoal.name}` : 'Registrar Depósito'}
      >
        <form onSubmit={handleContribSubmit(onContribSubmit)} className="space-y-4">
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10 select-none">
            <CircleDollarSign className="h-5 w-5 text-primary" />
            <div className="text-xs">
              <p className="font-semibold text-muted-foreground">Progresso Atual:</p>
              <p className="text-foreground">
                {selectedGoal
                  ? `${formatCurrencyBRL(selectedGoal.current_amount)} de ${formatCurrencyBRL(selectedGoal.target_amount)}`
                  : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valor do Depósito (R$)"
              type="number"
              step="0.01"
              placeholder="0,00"
              error={contribErrors.amount?.message}
              {...registerContrib('amount')}
            />

            <Input
              label="Data do Depósito"
              type="date"
              error={contribErrors.date?.message}
              {...registerContrib('date')}
            />
          </div>

          <Input
            label="Observação (Opcional)"
            placeholder="Ex: Economia do mês, 13º salário..."
            error={contribErrors.note?.message}
            {...registerContrib('note')}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
            <Button type="button" variant="outline" onClick={() => setIsDepositOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Confirmar Depósito
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
