'use client'

import * as React from 'react'
import {
  useCategories,
  useAddCategory,
  useUpdateCategory,
  useDeleteCategory
} from '@/hooks/use-finance'
import { Category } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import * as LucideIcons from 'lucide-react'
import {
  Plus,
  Trash2,
  Edit2,
  FolderOpen
} from 'lucide-react'
import { formatCurrencyBRL, toDecimal } from '@/lib/finance-math'

// Schema do formulário
const categorySchema = z.object({
  name: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres'),
  icon: z.string().min(1, 'Selecione um ícone'),
  color: z.string().min(1, 'Selecione uma cor'),
  budget_limit: z.coerce
    .number()
    .nullable()
    .optional()
    .refine((val) => val === null || val === undefined || isNaN(val) || val > 0, {
      message: 'O limite de orçamento deve ser um valor maior que zero',
    }),
})

type CategoryFormData = z.infer<typeof categorySchema>

const AVAILABLE_ICONS = [
  'Utensils',
  'Car',
  'Home',
  'HeartPulse',
  'Gamepad2',
  'Briefcase',
  'GraduationCap',
  'ShoppingBag',
  'PiggyBank',
  'Settings',
  'Plane',
  'Gift',
]

const AVAILABLE_COLORS = [
  '#EF4444',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
  '#14B8A6',
  '#64748B',
]

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useCategories()
  
  const addCatMutation = useAddCategory()
  const updateCatMutation = useUpdateCategory()
  const deleteCatMutation = useDeleteCategory()

  // Estados dos modais
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [selectedCat, setSelectedCat] = React.useState<Category | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      icon: 'Tags',
      color: '#8B5CF6',
      budget_limit: null as number | null,
    },
  })

  const selectedIcon = useWatch({ control, name: 'icon' })
  const selectedColor = useWatch({ control, name: 'color' })

  const openAddModal = () => {
    reset({
      name: '',
      icon: 'Tags',
      color: '#8B5CF6',
      budget_limit: null,
    })
    setIsAddOpen(true)
  }

  const openEditModal = (cat: Category) => {
    setSelectedCat(cat)
    reset({
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      budget_limit: cat.budget_limit || null,
    })
    setIsEditOpen(true)
  }

  const onAddSubmit = async (data: CategoryFormData) => {
    try {
      await addCatMutation.mutateAsync({
        name: data.name,
        icon: data.icon,
        color: data.color,
        budget_limit: data.budget_limit ? toDecimal(data.budget_limit).abs().toNumber() : null,
      })
      setIsAddOpen(false)
    } catch {
      // Silencioso sem console.log
    }
  }

  const onEditSubmit = async (data: CategoryFormData) => {
    if (!selectedCat) return
    try {
      await updateCatMutation.mutateAsync({
        id: selectedCat.id,
        name: data.name,
        icon: data.icon,
        color: data.color,
        budget_limit: data.budget_limit ? toDecimal(data.budget_limit).abs().toNumber() : null,
      })
      setIsEditOpen(false)
    } catch {
      // Silencioso sem console.log
    }
  }

  const onDelete = async (cat: Category) => {
    if (cat.is_default) {
      alert('Categorias padrão do sistema não podem ser excluídas.')
      return
    }
    if (confirm(`Deseja realmente arquivar a categoria "${cat.name}"? Transações desta categoria serão preservadas.`)) {
      try {
        await deleteCatMutation.mutateAsync(cat.id)
      } catch {
        // Silencioso sem console.log
      }
    }
  }

  const renderIcon = (iconName: string, color: string, className = 'h-5 w-5') => {
    // @ts-expect-error: Lucide dynamic icon indexing
    const IconComponent = LucideIcons[iconName] || LucideIcons.Tags
    return <IconComponent className={className} style={{ color }} />
  }

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight select-none">Categorias</h1>
          <p className="text-muted-foreground text-sm select-none">
            Crie categorias personalizadas e gerencie limites mensais de orçamento.
          </p>
        </div>
        <Button onClick={openAddModal} className="select-none">
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {/* GRID DE CATEGORIAS */}
      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : categories.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="glass-card rounded-xl p-5 border border-border/50 flex flex-col justify-between gap-4 transition-all hover:border-primary/30"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2.5 rounded-lg border"
                    style={{
                      backgroundColor: `${cat.color}12`,
                      borderColor: `${cat.color}35`,
                    }}
                  >
                    {renderIcon(cat.icon, cat.color, 'h-6 w-6')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground leading-none mb-1">{cat.name}</h3>
                    {cat.is_default && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md font-semibold select-none">
                        Padrão
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  {!cat.is_default && (
                    <button
                      onClick={() => onDelete(cat)}
                      className="p-1 rounded-md hover:bg-danger/10 text-muted-foreground hover:text-danger cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1 select-none">
                <span className="text-xs text-muted-foreground">Limite do Orçamento</span>
                <p className="text-sm font-bold">
                  {cat.budget_limit ? formatCurrencyBRL(cat.budget_limit) : 'Sem limite definido'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-xl p-12 text-center text-muted-foreground select-none flex flex-col items-center gap-2">
          <FolderOpen className="h-10 w-10" />
          <span className="text-sm">Nenhuma categoria criada.</span>
        </div>
      )}

      {/* MODAL ADICIONAR */}
      <Dialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Nova Categoria">
        <form onSubmit={handleSubmit(onAddSubmit)} className="space-y-4">
          <Input
            label="Nome da Categoria"
            placeholder="Ex: Assinaturas, Delivery..."
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Limite de Orçamento Mensal (Opcional)"
            type="number"
            step="0.01"
            placeholder="Deixe em branco para ilimitado"
            error={errors.budget_limit?.message}
            {...register('budget_limit')}
          />

          <div className="space-y-1.5 select-none">
            <label className="text-sm font-medium text-foreground/80 leading-none">Cor Representativa</label>
            <div className="flex flex-wrap gap-2.5 pt-1">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue('color', c)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                    selectedColor === c ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5 select-none">
            <label className="text-sm font-medium text-foreground/80 leading-none">Ícone</label>
            <div className="grid grid-cols-6 gap-2 pt-1 border border-border/50 rounded-xl p-3 bg-card/25 max-h-[140px] overflow-y-auto">
              {AVAILABLE_ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setValue('icon', i)}
                  className={`p-2.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                    selectedIcon === i
                      ? 'border-primary bg-primary/10'
                      : 'border-border/30 hover:border-border hover:bg-accent'
                  }`}
                >
                  {renderIcon(i, selectedIcon === i ? 'var(--primary)' : '#888', 'h-5 w-5')}
                </button>
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

      {/* MODAL EDITAR */}
      <Dialog isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Editar Categoria">
        <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
          <Input
            label="Nome da Categoria"
            placeholder="Ex: Delivery..."
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Limite de Orçamento Mensal (Opcional)"
            type="number"
            step="0.01"
            placeholder="Deixe em branco para ilimitado"
            error={errors.budget_limit?.message}
            {...register('budget_limit')}
          />

          <div className="space-y-1.5 select-none">
            <label className="text-sm font-medium text-foreground/80 leading-none">Cor Representativa</label>
            <div className="flex flex-wrap gap-2.5 pt-1">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue('color', c)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                    selectedColor === c ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5 select-none">
            <label className="text-sm font-medium text-foreground/80 leading-none">Ícone</label>
            <div className="grid grid-cols-6 gap-2 pt-1 border border-border/50 rounded-xl p-3 bg-card/25 max-h-[140px] overflow-y-auto">
              {AVAILABLE_ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setValue('icon', i)}
                  className={`p-2.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                    selectedIcon === i
                      ? 'border-primary bg-primary/10'
                      : 'border-border/30 hover:border-border hover:bg-accent'
                  }`}
                >
                  {renderIcon(i, selectedIcon === i ? 'var(--primary)' : '#888', 'h-5 w-5')}
                </button>
              ))}
            </div>
          </div>

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
    </div>
  )
}
