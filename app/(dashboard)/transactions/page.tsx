'use client'

import * as React from 'react'
import {
  useTransactions,
  useCategories,
  useAddTransaction,
  useUpdateTransaction,
  useDeleteTransaction
} from '@/hooks/use-finance'
import { Transaction } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Plus,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Search,
  ChevronLeft,
  ChevronRight,
  FileUp,
  AlertTriangle
} from 'lucide-react'

// Schema do formulário
const transactionSchema = z.object({
  description: z.string().min(2, 'A descrição deve ter no mínimo 2 caracteres'),
  amount: z.coerce.number().gt(0, 'O valor deve ser maior que zero'),
  type: z.enum(['income', 'expense']),
  category_id: z.string().min(1, 'Selecione uma categoria'),
  date: z.string().min(1, 'Selecione uma data'),
  is_recurring: z.boolean().default(false),
  recurrence_interval: z.enum(['daily', 'weekly', 'monthly', 'yearly']).nullable().optional(),
})

type TransactionFormData = z.infer<typeof transactionSchema>

export default function TransactionsPage() {
  const { data: categories = [] } = useCategories()
  
  // Estados de Filtros
  const [search, setSearch] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState<'all' | 'income' | 'expense'>('all')
  const [categoryFilter, setCategoryFilter] = React.useState('all')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')
  
  // Filtros aplicados para a query
  const queryFilters = React.useMemo(() => ({
    search,
    type: typeFilter === 'all' ? undefined : typeFilter,
    categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  }), [search, typeFilter, categoryFilter, startDate, endDate])

  const { data: transactions = [], isLoading } = useTransactions(queryFilters)

  // Mutações
  const addTxMutation = useAddTransaction()
  const updateTxMutation = useUpdateTransaction()
  const deleteTxMutation = useDeleteTransaction()

  // Estados dos Modais
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isImportOpen, setIsImportOpen] = React.useState(false)
  const [selectedTx, setSelectedTx] = React.useState<Transaction | null>(null)

  // Paginação simples
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 8
  const totalPages = Math.ceil(transactions.length / itemsPerPage)
  const paginatedTxs = transactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, typeFilter, categoryFilter, startDate, endDate])

  // React Hook Form para cadastro/edição
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: '',
      amount: 0,
      type: 'expense' as 'income' | 'expense',
      category_id: '',
      date: new Date().toISOString().split('T')[0],
      is_recurring: false,
      recurrence_interval: null as 'daily' | 'weekly' | 'monthly' | 'yearly' | null,
    },
  })

  const isRecurringValue = watch('is_recurring')

  const openAddModal = () => {
    reset({
      description: '',
      amount: 0,
      type: 'expense',
      category_id: categories.length > 0 ? categories[0].id : '',
      date: new Date().toISOString().split('T')[0],
      is_recurring: false,
      recurrence_interval: null,
    })
    setIsAddOpen(true)
  }

  const openEditModal = (tx: Transaction) => {
    setSelectedTx(tx)
    reset({
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category_id: tx.category_id || '',
      date: tx.date,
      is_recurring: tx.is_recurring,
      recurrence_interval: tx.recurrence_interval,
    })
    setIsEditOpen(true)
  }

  const onAddSubmit = async (data: TransactionFormData) => {
    try {
      await addTxMutation.mutateAsync({
        ...data,
        recurrence_interval: data.is_recurring ? (data.recurrence_interval || 'monthly') : null,
      })
      setIsAddOpen(false)
    } catch (e) {
      console.error(e)
    }
  }

  const onEditSubmit = async (data: TransactionFormData) => {
    if (!selectedTx) return
    try {
      await updateTxMutation.mutateAsync({
        id: selectedTx.id,
        ...data,
        recurrence_interval: data.is_recurring ? (data.recurrence_interval || 'monthly') : null,
      })
      setIsEditOpen(false)
    } catch (e) {
      console.error(e)
    }
  }

  const onDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      try {
        await deleteTxMutation.mutateAsync(id)
      } catch (e) {
        console.error(e)
      }
    }
  }

  // ----------------------------------------------------
  // ESTADOS E FUNÇÕES DO IMPORTADOR DE CSV
  // ----------------------------------------------------
  const [csvLines, setCsvLines] = React.useState<string[][]>([])
  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([])
  
  // Mapeamentos de campos da transação para índice da coluna do CSV
  const [descCol, setDescCol] = React.useState<string>('-1')
  const [amountCol, setAmountCol] = React.useState<string>('-1')
  const [dateCol, setDateCol] = React.useState<string>('-1')
  const [typeCol, setTypeCol] = React.useState<string>('-1') // Opcional (se não mapeado, assume 'expense')
  const [catCol, setCatCol] = React.useState<string>('-1')   // Opcional (se não mapeado, assume a primeira categoria)

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) return

      // Parser manual básico de CSV
      const rows = text.split('\n').map(line => {
        const result = []
        let current = ''
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        result.push(current.trim())
        return result
      }).filter(row => row.length > 0 && row.some(cell => cell !== ''))

      if (rows.length > 0) {
        setCsvHeaders(rows[0])
        setCsvLines(rows.slice(1)) // Remove cabeçalho
        
        // Tentar mapeamento automático
        const headersLower = rows[0].map(h => h.toLowerCase())
        setDescCol(String(headersLower.findIndex(h => h.includes('desc') || h.includes('nome') || h.includes('título'))))
        setAmountCol(String(headersLower.findIndex(h => h.includes('valor') || h.includes('quant') || h.includes('preço') || h.includes('amount'))))
        setDateCol(String(headersLower.findIndex(h => h.includes('data') || h.includes('dia') || h.includes('date'))))
        setTypeCol(String(headersLower.findIndex(h => h.includes('tipo') || h.includes('type'))))
        setCatCol(String(headersLower.findIndex(h => h.includes('categ') || h.includes('grupo') || h.includes('category'))))
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  const executeCsvImport = async () => {
    const dIdx = Number(descCol)
    const aIdx = Number(amountCol)
    const dtIdx = Number(dateCol)
    const tIdx = Number(typeCol)
    const cIdx = Number(catCol)

    if (dIdx === -1 || aIdx === -1 || dtIdx === -1) {
      alert('Descrição, Valor e Data são campos obrigatórios para o mapeamento.')
      return
    }

    let successCount = 0

    // Mapear cada linha do CSV
    for (const line of csvLines) {
      if (line.length <= Math.max(dIdx, aIdx, dtIdx)) continue

      const rawDesc = line[dIdx]
      // Remover símbolos de moeda e converter para número
      const rawAmount = parseFloat(line[aIdx].replace(/[R$\s.]/g, '').replace(',', '.'))
      let rawDate = line[dtIdx]

      // Ajustar formato da data (ex: DD/MM/YYYY para YYYY-MM-DD)
      if (rawDate.includes('/')) {
        const parts = rawDate.split('/')
        if (parts.length === 3) {
          rawDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
        }
      }

      // Tipo padrão
      let rawType: 'income' | 'expense' = 'expense'
      if (tIdx !== -1 && line[tIdx]) {
        const tVal = line[tIdx].toLowerCase()
        if (tVal.includes('receita') || tVal.includes('ganho') || tVal.includes('income') || tVal.includes('entrada')) {
          rawType = 'income'
        }
      }

      // Categoria padrão ou mapeada
      let rawCategoryId = categories[0]?.id
      if (cIdx !== -1 && line[cIdx]) {
        const catName = line[cIdx].toLowerCase().trim()
        const matched = categories.find(c => c.name.toLowerCase().includes(catName) || catName.includes(c.name.toLowerCase()))
        if (matched) {
          rawCategoryId = matched.id
        }
      }

      if (rawDesc && !isNaN(rawAmount) && rawDate) {
        try {
          await addTxMutation.mutateAsync({
            description: rawDesc,
            amount: rawAmount,
            type: rawType,
            category_id: rawCategoryId,
            date: rawDate,
            is_recurring: false,
            recurrence_interval: null
          })
          successCount++
        } catch (e) {
          console.error('Erro ao importar linha: ', line, e)
        }
      }
    }

    alert(`${successCount} transações importadas com sucesso!`)
    setIsImportOpen(false)
    setCsvLines([])
    setCsvHeaders([])
  }

  // Formatação em BRL (R$)
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  return (
    <div className="space-y-6">
      {/* Título & Botões */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight select-none">Transações</h1>
          <p className="text-muted-foreground text-sm select-none">
            Gerencie suas receitas e despesas ou importe novos dados usando CSV.
          </p>
        </div>
        <div className="flex items-center gap-2 select-none">
          <Button variant="outline" onClick={() => setIsImportOpen(true)} className="border-border/50">
            <FileUp className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
          <Button onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Transação
          </Button>
        </div>
      </div>

      {/* BARRA DE FILTROS (GLASSMORPHISM) */}
      <div className="glass-card rounded-xl p-4 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-5 items-end">
        {/* Busca */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-muted-foreground select-none">Buscar</label>
          <div className="relative">
            <Input
              placeholder="Ex: Supermercado, Aluguel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Tipo */}
        <Select
          label="Tipo"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | 'income' | 'expense')}
          options={[
            { value: 'all', label: 'Todos os tipos' },
            { value: 'income', label: 'Receitas' },
            { value: 'expense', label: 'Despesas' },
          ]}
        />

        {/* Categoria */}
        <Select
          label="Categoria"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        {/* Período */}
        <div className="flex gap-2 w-full md:col-span-1">
          <div className="w-full space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground select-none">Início</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="w-full space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground select-none">Fim</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* LISTA DE TRANSAÇÕES */}
      <div className="glass-card rounded-xl overflow-hidden shadow-xs border border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-card/40 text-xs font-semibold text-muted-foreground uppercase select-none">
                <th className="p-4">Descrição</th>
                <th className="p-4">Categoria</th>
                <th className="p-4">Data</th>
                <th className="p-4">Tipo</th>
                <th className="p-4 text-right">Valor</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </td>
                </tr>
              ) : paginatedTxs.length > 0 ? (
                paginatedTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-accent/15 transition-colors">
                    <td className="p-4 font-medium">{tx.description}</td>
                    <td className="p-4">
                      {tx.categories ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: tx.categories.color }}
                          />
                          <span>{tx.categories.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs select-none">Sem categoria</span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">{formatDate(tx.date)}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold select-none ${
                          tx.type === 'income'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {tx.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td
                      className={`p-4 text-right font-bold ${
                        tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                    </td>
                    <td className="p-4 flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(tx)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(tx.id)}
                        className="p-1.5 rounded-md hover:bg-danger/10 text-muted-foreground hover:text-danger cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground select-none">
                    Nenhuma transação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground bg-card/10 select-none">
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-1.5 border border-border rounded-lg hover:bg-accent disabled:opacity-50 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-1.5 border border-border rounded-lg hover:bg-accent disabled:opacity-50 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL ADICIONAR */}
      <Dialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Nova Transação">
        <form onSubmit={handleSubmit(onAddSubmit)} className="space-y-4">
          <Input
            label="Descrição"
            placeholder="Ex: Combustível, Freelance..."
            error={errors.description?.message}
            {...register('description')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valor (R$)"
              type="number"
              step="0.01"
              placeholder="0,00"
              error={errors.amount?.message}
              {...register('amount')}
            />

            <Select
              label="Tipo"
              error={errors.type?.message}
              {...register('type')}
              options={[
                { value: 'expense', label: 'Despesa' },
                { value: 'income', label: 'Receita' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Categoria"
              error={errors.category_id?.message}
              {...register('category_id')}
            >
              <option value="">Selecione...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Input
              label="Data"
              type="date"
              error={errors.date?.message}
              {...register('date')}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_recurring"
              className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary"
              {...register('is_recurring')}
            />
            <label htmlFor="is_recurring" className="text-sm text-foreground/80 select-none">
              Esta é uma transação recorrente
            </label>
          </div>

          {isRecurringValue && (
            <Select
              label="Frequência de Recorrência"
              error={errors.recurrence_interval?.message}
              {...register('recurrence_interval')}
              options={[
                { value: 'monthly', label: 'Mensal' },
                { value: 'weekly', label: 'Semanal' },
                { value: 'daily', label: 'Diário' },
                { value: 'yearly', label: 'Anual' },
              ]}
            />
          )}

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

      {/* MODAL EDITAR */}
      <Dialog isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Editar Transação">
        <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
          <Input
            label="Descrição"
            placeholder="Ex: Combustível..."
            error={errors.description?.message}
            {...register('description')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valor (R$)"
              type="number"
              step="0.01"
              placeholder="0,00"
              error={errors.amount?.message}
              {...register('amount')}
            />

            <Select
              label="Tipo"
              error={errors.type?.message}
              {...register('type')}
              options={[
                { value: 'expense', label: 'Despesa' },
                { value: 'income', label: 'Receita' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Categoria"
              error={errors.category_id?.message}
              {...register('category_id')}
            >
              <option value="">Selecione...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Input
              label="Data"
              type="date"
              error={errors.date?.message}
              {...register('date')}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_recurring_edit"
              className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary"
              {...register('is_recurring')}
            />
            <label htmlFor="is_recurring_edit" className="text-sm text-foreground/80 select-none">
              Esta é uma transação recorrente
            </label>
          </div>

          {isRecurringValue && (
            <Select
              label="Frequência de Recorrência"
              error={errors.recurrence_interval?.message}
              {...register('recurrence_interval')}
              options={[
                { value: 'monthly', label: 'Mensal' },
                { value: 'weekly', label: 'Semanal' },
                { value: 'daily', label: 'Diário' },
                { value: 'yearly', label: 'Anual' },
              ]}
            />
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL IMPORTAR CSV (MAPPER DE COLUNAS) */}
      <Dialog isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} title="Importar Transações via CSV">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-border/70 rounded-xl p-6 text-center hover:border-primary/50 transition-colors relative cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-2 select-none">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
              <span className="text-sm font-semibold">Clique para selecionar seu arquivo CSV</span>
              <span className="text-xs text-muted-foreground">Formato compatível: .csv codificado em UTF-8</span>
            </div>
          </div>

          {csvLines.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg select-none">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Mapeie os campos abaixo associando as colunas do seu arquivo CSV com os dados da transação.</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Descrição */}
                <Select
                  label="Coluna da Descrição"
                  value={descCol}
                  onChange={(e) => setDescCol(e.target.value)}
                >
                  <option value="-1">Selecione...</option>
                  {csvHeaders.map((h, i) => (
                    <option key={i} value={i}>
                      Coluna {i}: {h || `(Vazio)`}
                    </option>
                  ))}
                </Select>

                {/* Valor */}
                <Select
                  label="Coluna do Valor"
                  value={amountCol}
                  onChange={(e) => setAmountCol(e.target.value)}
                >
                  <option value="-1">Selecione...</option>
                  {csvHeaders.map((h, i) => (
                    <option key={i} value={i}>
                      Coluna {i}: {h || `(Vazio)`}
                    </option>
                  ))}
                </Select>

                {/* Data */}
                <Select
                  label="Coluna da Data"
                  value={dateCol}
                  onChange={(e) => setDateCol(e.target.value)}
                >
                  <option value="-1">Selecione...</option>
                  {csvHeaders.map((h, i) => (
                    <option key={i} value={i}>
                      Coluna {i}: {h || `(Vazio)`}
                    </option>
                  ))}
                </Select>

                {/* Tipo */}
                <Select
                  label="Coluna do Tipo (Opcional)"
                  value={typeCol}
                  onChange={(e) => setTypeCol(e.target.value)}
                >
                  <option value="-1">Assumir Despesa por padrão</option>
                  {csvHeaders.map((h, i) => (
                    <option key={i} value={i}>
                      Coluna {i}: {h || `(Vazio)`}
                    </option>
                  ))}
                </Select>

                {/* Categoria */}
                <div className="col-span-2">
                  <Select
                    label="Coluna da Categoria (Opcional)"
                    value={catCol}
                    onChange={(e) => setCatCol(e.target.value)}
                  >
                    <option value="-1">Assumir primeira categoria disponível por padrão</option>
                    {csvHeaders.map((h, i) => (
                      <option key={i} value={i}>
                        Coluna {i}: {h || `(Vazio)`}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="bg-card/40 border border-border/50 p-4 rounded-xl space-y-2 select-none">
                <span className="text-xs font-semibold text-muted-foreground">Previsão das primeiras linhas:</span>
                <div className="max-h-[120px] overflow-y-auto text-xs space-y-1 pr-2">
                  {csvLines.slice(0, 3).map((line, rIdx) => (
                    <div key={rIdx} className="p-1.5 bg-background/50 rounded border border-border/30 truncate">
                      {line.join(' | ')}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setCsvLines([]); setCsvHeaders([]); }}>
                  Limpar Arquivo
                </Button>
                <Button onClick={executeCsvImport} loading={addTxMutation.isPending}>
                  Confirmar Importação
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  )
}
