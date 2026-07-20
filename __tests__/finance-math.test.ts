import { describe, it, expect } from 'vitest'
import {
  toDecimal,
  calculateTotalIncome,
  calculateTotalExpense,
  calculateBalance,
  calculateCategoryTotals,
  calculateBudgetUsage,
  calculateGoalProgress,
  formatCurrencyBRL,
} from '../lib/finance-math'
import Decimal from 'decimal.js'

describe('Módulo de Cálculos Financeiros (lib/finance-math.ts)', () => {
  it('deve converter valores numéricos, strings e nulos para Decimal com precisão', () => {
    expect(toDecimal(10.5).equals(new Decimal(10.5))).toBe(true)
    expect(toDecimal('100.25').equals(new Decimal(100.25))).toBe(true)
    expect(toDecimal(null).equals(new Decimal(0))).toBe(true)
    expect(toDecimal(undefined).equals(new Decimal(0))).toBe(true)
    expect(toDecimal('invalido').equals(new Decimal(0))).toBe(true)
  })

  it('deve somar o total de receitas ignorando despesas', () => {
    const mockTxs = [
      { amount: 1500.50, type: 'income' as const },
      { amount: 2500.00, type: 'income' as const },
      { amount: 400.00, type: 'expense' as const },
    ]
    const total = calculateTotalIncome(mockTxs)
    expect(total.toNumber()).toBe(4000.50)
  })

  it('deve somar o total de despesas ignorando receitas', () => {
    const mockTxs = [
      { amount: 1500.50, type: 'income' as const },
      { amount: 250.30, type: 'expense' as const },
      { amount: 149.70, type: 'expense' as const },
    ]
    const total = calculateTotalExpense(mockTxs)
    expect(total.toNumber()).toBe(400.00)
  })

  it('deve calcular o saldo líquido (receita - despesa) sem imprecisão de ponto flutuante', () => {
    // Exemplo clássico de erro em JS float: 0.1 + 0.2 = 0.30000000000000004
    const mockTxs = [
      { amount: 0.1, type: 'income' as const },
      { amount: 0.2, type: 'income' as const },
    ]
    const balance = calculateBalance(mockTxs)
    expect(balance.toString()).toBe('0.3')
  })

  it('deve agrupar corretamente as despesas por categoria', () => {
    const mockTxs = [
      {
        amount: 100.00,
        type: 'expense' as const,
        categories: { name: 'Alimentação', color: '#FF0000', budget_limit: 500.00 },
      },
      {
        amount: 250.00,
        type: 'expense' as const,
        categories: { name: 'Alimentação', color: '#FF0000', budget_limit: 500.00 },
      },
      {
        amount: 300.00,
        type: 'expense' as const,
        categories: { name: 'Transporte', color: '#0000FF', budget_limit: 400.00 },
      },
    ]

    const totals = calculateCategoryTotals(mockTxs)
    expect(totals['Alimentação'].amount.toNumber()).toBe(350.00)
    expect(totals['Transporte'].amount.toNumber()).toBe(300.00)
  })

  it('deve calcular a porcentagem de limite de orçamento consumida', () => {
    expect(calculateBudgetUsage(250, 500)).toBe(50)
    expect(calculateBudgetUsage(500, 500)).toBe(100)
    expect(calculateBudgetUsage(750, 500)).toBe(150)
    expect(calculateBudgetUsage(100, 0)).toBe(0)
    expect(calculateBudgetUsage(100, null)).toBe(0)
  })

  it('deve calcular o progresso de metas de economia', () => {
    expect(calculateGoalProgress(2500, 10000)).toBe(25)
    expect(calculateGoalProgress(10000, 10000)).toBe(100)
    expect(calculateGoalProgress(12000, 10000)).toBe(100) // limit de max 100
    expect(calculateGoalProgress(500, 0)).toBe(0)
  })

  it('deve formatar valores monetários no padrão pt-BR (R$ X.XXX,XX)', () => {
    const formatted1 = formatCurrencyBRL(1250.5)
    expect(formatted1).toContain('R$')
    expect(formatted1).toContain('1.250,50')

    const formatted2 = formatCurrencyBRL(0)
    expect(formatted2).toContain('R$')
    expect(formatted2).toContain('0,00')
  })
})
