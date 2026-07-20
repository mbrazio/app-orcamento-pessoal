import Decimal from 'decimal.js'

export type DecimalInstance = InstanceType<typeof Decimal>

// Configurar precisão do Decimal para 20 dígitos significativos
Decimal.config({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export function toDecimal(val: number | string | DecimalInstance | null | undefined): DecimalInstance {
  if (val === null || val === undefined || val === '') {
    return new Decimal(0)
  }
  if (val instanceof Decimal) {
    return val
  }
  try {
    return new Decimal(val)
  } catch {
    return new Decimal(0)
  }
}

/**
 * Soma total de receitas usando Decimal
 */
export function calculateTotalIncome(
  transactions: Array<{ amount: number | string | DecimalInstance; type: 'income' | 'expense' }>
): DecimalInstance {
  return transactions.reduce((acc, t) => {
    if (t.type === 'income') {
      return acc.plus(toDecimal(t.amount))
    }
    return acc
  }, new Decimal(0))
}

/**
 * Soma total de despesas usando Decimal
 */
export function calculateTotalExpense(
  transactions: Array<{ amount: number | string | DecimalInstance; type: 'income' | 'expense' }>
): DecimalInstance {
  return transactions.reduce((acc, t) => {
    if (t.type === 'expense') {
      return acc.plus(toDecimal(t.amount))
    }
    return acc
  }, new Decimal(0))
}

/**
 * Saldo total (Receitas - Despesas)
 */
export function calculateBalance(
  transactions: Array<{ amount: number | string | DecimalInstance; type: 'income' | 'expense' }>
): DecimalInstance {
  const income = calculateTotalIncome(transactions)
  const expense = calculateTotalExpense(transactions)
  return income.minus(expense)
}

/**
 * Agrupa despesas por categoria calculando os totais com Decimal
 */
export function calculateCategoryTotals(
  transactions: Array<{
    amount: number | string | DecimalInstance
    type: 'income' | 'expense'
    categories?: {
      name: string
      color: string
      budget_limit?: number | string | DecimalInstance | null
    } | null
  }>
): Record<string, { name: string; amount: DecimalInstance; color: string; limit: DecimalInstance | null }> {
  const categoriesMap: Record<
    string,
    { name: string; amount: DecimalInstance; color: string; limit: DecimalInstance | null }
  > = {}

  transactions.forEach((t) => {
    if (t.type === 'expense' && t.categories) {
      const catName = t.categories.name
      const catColor = t.categories.color
      const catLimit = t.categories.budget_limit != null ? toDecimal(t.categories.budget_limit) : null

      if (!categoriesMap[catName]) {
        categoriesMap[catName] = {
          name: catName,
          amount: new Decimal(0),
          color: catColor,
          limit: catLimit,
        }
      }

      categoriesMap[catName].amount = categoriesMap[catName].amount.plus(toDecimal(t.amount))
    }
  })

  return categoriesMap
}

/**
 * Calcula a porcentagem do orçamento consumida (0 a 100+)
 */
export function calculateBudgetUsage(
  expenseAmount: number | string | DecimalInstance,
  budgetLimit: number | string | DecimalInstance | null | undefined
): number {
  if (!budgetLimit) return 0
  const limit = toDecimal(budgetLimit)
  if (limit.isZero() || limit.isNegative()) return 0
  
  const expense = toDecimal(expenseAmount)
  return expense.dividedBy(limit).times(100).toNumber()
}

/**
 * Calcula o progresso de uma meta financeira (0 a 100)
 */
export function calculateGoalProgress(
  currentAmount: number | string | DecimalInstance,
  targetAmount: number | string | DecimalInstance
): number {
  const target = toDecimal(targetAmount)
  if (target.isZero() || target.isNegative()) return 0

  const current = toDecimal(currentAmount)
  const pct = current.dividedBy(target).times(100).toNumber()
  return Math.min(Math.max(pct, 0), 100)
}

/**
 * Formata um valor financeiro (Decimal, number ou string) no locale pt-BR (R$ X.XXX,XX)
 */
export function formatCurrencyBRL(val: number | string | DecimalInstance | null | undefined): string {
  const decimalVal = toDecimal(val)
  const numVal = decimalVal.toNumber()
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numVal)
}
