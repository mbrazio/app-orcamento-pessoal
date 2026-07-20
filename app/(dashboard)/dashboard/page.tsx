'use client'

import * as React from 'react'
import { useTransactions, useCategories } from '@/hooks/use-finance'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Flame
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  calculateBalance,
  calculateTotalIncome,
  calculateTotalExpense,
  calculateCategoryTotals,
  calculateBudgetUsage,
  formatCurrencyBRL,
  toDecimal
} from '@/lib/finance-math'

export default function DashboardPage() {
  const [mounted, setMounted] = React.useState(false)
  
  const { data: transactions = [], isLoading: txLoading } = useTransactions()
  const { data: categories = [], isLoading: catLoading } = useCategories()

  React.useEffect(() => {
    let active = true
    if (active) {
      setTimeout(() => {
        setMounted(true)
      }, 0)
    }
    return () => {
      active = false
    }
  }, [])

  if (!mounted || txLoading || catLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const currentMonthTxs = transactions.filter((t) => {
    const tDate = new Date(t.date + 'T00:00:00')
    return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth
  })

  // Cálculos de Resumo com Decimal.js
  const totalIncomeDec = calculateTotalIncome(currentMonthTxs)
  const totalExpenseDec = calculateTotalExpense(currentMonthTxs)
  const balanceDec = calculateBalance(currentMonthTxs)

  const savingsRate = totalIncomeDec.greaterThan(0)
    ? balanceDec.dividedBy(totalIncomeDec).times(100).toNumber()
    : 0

  const topExpense = currentMonthTxs
    .filter((t) => t.type === 'expense')
    .reduce((max, t) => (toDecimal(t.amount).greaterThan(toDecimal(max.amount)) ? t : max), {
      amount: 0,
      description: 'Nenhum',
    })

  // Gráfico 1: Despesas por Categoria (PieChart)
  const categoryTotalsMap = calculateCategoryTotals(currentMonthTxs)
  const pieData = Object.values(categoryTotalsMap).map((c) => ({
    name: c.name,
    value: c.amount.toNumber(),
    color: c.color,
  }))

  // Gráfico 2: Receitas vs Despesas dos Últimos 6 Meses (BarChart)
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(now.getMonth() - i)
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString('pt-BR', { month: 'short' }),
    }
  }).reverse()

  const barData = last6Months.map((m) => {
    const monthTxs = transactions.filter((t) => {
      const tDate = new Date(t.date + 'T00:00:00')
      return tDate.getFullYear() === m.year && tDate.getMonth() === m.month
    })

    const income = calculateTotalIncome(monthTxs).toNumber()
    const expense = calculateTotalExpense(monthTxs).toNumber()

    return {
      name: m.label.charAt(0).toUpperCase() + m.label.slice(1),
      Receitas: income,
      Despesas: expense,
    }
  })

  // Alertas de limites estourados
  const categoryBudgets = categories
    .filter((c) => c.budget_limit !== null && toDecimal(c.budget_limit).greaterThan(0))
    .map((c) => {
      const catTxs = currentMonthTxs.filter((t) => t.category_id === c.id)
      const spentDec = calculateTotalExpense(catTxs)
      const limitDec = toDecimal(c.budget_limit)
      const percent = calculateBudgetUsage(spentDec, limitDec)
      return {
        ...c,
        spent: spentDec,
        limit: limitDec,
        percent,
      }
    })

  const blownBudgets = categoryBudgets.filter((b) => b.spent.greaterThan(b.limit))

  return (
    <div className="space-y-8 select-none">
      {/* Título & Período */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Bem-vindo ao FinanceFlow. Veja o resumo de suas finanças de{' '}
            {now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}.
          </p>
        </div>
      </div>

      {/* ALERTAS DE LIMITE */}
      {blownBudgets.length > 0 && (
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-danger font-semibold">
            <AlertTriangle className="h-5 w-5 animate-bounce" />
            <span>Alerta de Orçamento Estourado!</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {blownBudgets.map((b) => (
              <div
                key={b.id}
                className="bg-card/40 border border-border/50 rounded-lg p-3 text-sm flex flex-col gap-1"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                  <span className="font-medium">{b.name}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Limite: <span className="font-semibold">{formatCurrencyBRL(b.limit)}</span>
                </div>
                <div className="text-xs text-danger">
                  Gasto: <span className="font-semibold">{formatCurrencyBRL(b.spent)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CARDS DE RESUMO */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Saldo Geral */}
        <div className="glass-card rounded-xl p-6 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Saldo do Mês</span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h3 className={`text-2xl font-bold tracking-tight ${balanceDec.greaterThanOrEqualTo(0) ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatCurrencyBRL(balanceDec)}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {balanceDec.greaterThanOrEqualTo(0) ? 'Saldo positivo' : 'Saldo negativo'}
            </p>
          </div>
        </div>

        {/* Receitas */}
        <div className="glass-card rounded-xl p-6 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Receitas</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-emerald-500">{formatCurrencyBRL(totalIncomeDec)}</h3>
            <p className="text-xs text-muted-foreground mt-1">Ganhos acumulados este mês</p>
          </div>
        </div>

        {/* Despesas */}
        <div className="glass-card rounded-xl p-6 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Despesas</span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-500">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-rose-500">{formatCurrencyBRL(totalExpenseDec)}</h3>
            <p className="text-xs text-muted-foreground mt-1">Gasto total no período</p>
          </div>
        </div>

        {/* Poupança / Maior Gasto */}
        <div className="glass-card rounded-xl p-6 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Economia Mensal</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight">
              {savingsRate > 0 ? `${savingsRate.toFixed(1)}%` : '0.0%'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Maior Gasto: {toDecimal(topExpense.amount).greaterThan(0) ? `${topExpense.description} (${formatCurrencyBRL(topExpense.amount)})` : 'Nenhum'}
            </p>
          </div>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Balanço Semestral */}
        <div className="glass-card rounded-xl p-6 shadow-xs md:col-span-2 flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Receitas vs Despesas</h3>
            <p className="text-xs text-muted-foreground">Balanço comparativo dos últimos 6 meses</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 15, 20, 0.95)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#F43F5E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Divisão por Categoria */}
        <div className="glass-card rounded-xl p-6 shadow-xs flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Divisão por Categoria</h3>
            <p className="text-xs text-muted-foreground">Principais gastos do mês atual</p>
          </div>
          <div className="h-60 w-full flex items-center justify-center relative">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 15, 20, 0.95)',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-muted-foreground text-center">Nenhuma despesa este mês.</div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto max-h-[120px] space-y-1.5 pr-2">
            {pieData.map((d, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="font-medium truncate max-w-[120px]">{d.name}</span>
                </div>
                <span className="text-muted-foreground font-semibold">{formatCurrencyBRL(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LIMITES DE ORÇAMENTO DETALHADOS */}
      <div className="glass-card rounded-xl p-6 shadow-xs flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Limites de Categoria</h3>
          <p className="text-xs text-muted-foreground">Acompanhamento dos limites máximos mensais definidos</p>
        </div>
        {categoryBudgets.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categoryBudgets.map((b) => (
              <div key={b.id} className="border border-border/50 rounded-xl p-4 bg-card/20 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: b.color }} />
                    <span className="font-semibold">{b.name}</span>
                  </div>
                  <span className={`font-semibold ${b.percent > 100 ? 'text-danger' : 'text-muted-foreground'}`}>
                    {b.percent.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      b.percent > 100
                        ? 'bg-danger shadow-md shadow-danger/25'
                        : b.percent > 85
                        ? 'bg-amber-500'
                        : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(b.percent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Gasto: {formatCurrencyBRL(b.spent)}</span>
                  <span>Limite: {formatCurrencyBRL(b.limit)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground py-2">
            Nenhum limite de orçamento configurado. Configure limites acessando a aba de categorias.
          </div>
        )}
      </div>
    </div>
  )
}
