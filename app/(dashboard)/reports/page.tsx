'use client'

import * as React from 'react'
import { useTransactions, useCategories } from '@/hooks/use-finance'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
  FileSpreadsheet,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Wallet,
  Activity,
  FileCheck
} from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import {
  calculateBalance,
  calculateTotalIncome,
  calculateTotalExpense,
  calculateCategoryTotals,
  calculateBudgetUsage,
  formatCurrencyBRL,
  toDecimal
} from '@/lib/finance-math'

export default function ReportsPage() {
  const [mounted, setMounted] = React.useState(false)
  
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = React.useState<string>(String(now.getMonth()))
  const [selectedYear, setSelectedYear] = React.useState<string>(String(now.getFullYear()))
  const [isExporting, setIsExporting] = React.useState(false)
  const [downloadLink, setDownloadLink] = React.useState<{ url: string; filename: string } | null>(null)
  const [exportError, setExportError] = React.useState<string | null>(null)

  const handleMonthChange = (val: string) => {
    setSelectedMonth(val)
    setDownloadLink(null)
    setExportError(null)
  }

  const handleYearChange = (val: string) => {
    setSelectedYear(val)
    setDownloadLink(null)
    setExportError(null)
  }

  const { data: transactions = [], isLoading: txLoading } = useTransactions()
  const { isLoading: catLoading } = useCategories()

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

  const filteredTxs = React.useMemo(() => {
    return transactions.filter((t) => {
      const tDate = new Date(t.date + 'T00:00:00')
      return tDate.getFullYear() === Number(selectedYear) && tDate.getMonth() === Number(selectedMonth)
    })
  }, [transactions, selectedMonth, selectedYear])

  if (!mounted || txLoading || catLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // Cálculos de Resumo com Decimal.js
  const totalIncomeDec = calculateTotalIncome(filteredTxs)
  const totalExpenseDec = calculateTotalExpense(filteredTxs)
  const balanceDec = calculateBalance(filteredTxs)
  
  const savingsRate = totalIncomeDec.greaterThan(0)
    ? balanceDec.dividedBy(totalIncomeDec).times(100).toNumber()
    : 0

  // Agrupar gastos por categoria usando Decimal.js
  const categoryTotalsMap = calculateCategoryTotals(filteredTxs)
  const categorySummaryList = Object.values(categoryTotalsMap).sort((a, b) => b.amount.minus(a.amount).toNumber())

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  const exportPDF = async () => {
    const element = document.getElementById('report-content')
    if (!element) return

    setIsExporting(true)
    setExportError(null)

    await new Promise((resolve) => setTimeout(resolve, 300))
    const fileName = `relatorio-FinanceFlow-${Number(selectedMonth) + 1}-${selectedYear}.pdf`

    try {
      const isLight = document.documentElement.classList.contains('light')
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: isLight ? '#ffffff' : '#0f0f14',
        logging: false,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.getElementById('report-content')
          if (!clonedEl) return

          const canvasCtx = document.createElement('canvas').getContext('2d')
          const allElements = [clonedEl, ...Array.from(clonedEl.querySelectorAll('*'))]

          allElements.forEach((node) => {
            const el = node as HTMLElement
            el.style.backdropFilter = 'none'

            if (canvasCtx) {
              const compStyle = window.getComputedStyle(el)
              
              if (compStyle.backgroundColor && compStyle.backgroundColor !== 'transparent' && compStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                try {
                  canvasCtx.fillStyle = compStyle.backgroundColor
                  el.style.backgroundColor = canvasCtx.fillStyle
                } catch {
                  el.style.backgroundColor = isLight ? '#ffffff' : '#1a1a24'
                }
              }

              if (compStyle.color) {
                try {
                  canvasCtx.fillStyle = compStyle.color
                  el.style.color = canvasCtx.fillStyle
                } catch {
                  el.style.color = isLight ? '#000000' : '#ffffff'
                }
              }

              if (compStyle.borderColor) {
                try {
                  canvasCtx.fillStyle = compStyle.borderColor
                  el.style.borderColor = canvasCtx.fillStyle
                } catch {
                  el.style.borderColor = isLight ? '#e5e7eb' : '#27272a'
                }
              }
            }
          })
        },
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 190
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight)

      const pdfBlob = pdf.output('blob')
      const blobUrl = URL.createObjectURL(pdfBlob)

      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      setTimeout(() => document.body.removeChild(link), 1000)

      setDownloadLink({ url: blobUrl, filename: fileName })
      pdf.save(fileName)
    } catch {
      // FALLBACK NATIVO DO JSPDF SE HTML2CANVAS FALHAR POR COMPATIBILIDADE DE CSS OU RENDERIZADOR
      try {
        const pdf = new jsPDF('p', 'mm', 'a4')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(16)
        pdf.text('FinanceFlow - Relatório Financeiro Mensal', 14, 20)
        
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        pdf.text(`Período: ${currentMonthLabel} de ${selectedYear}`, 14, 28)
        pdf.text(`Emitido em: ${now.toLocaleDateString('pt-BR')}`, 14, 34)

        pdf.setLineWidth(0.5)
        pdf.line(14, 38, 196, 38)

        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.text(`Receitas Totais: ${formatCurrencyBRL(totalIncomeDec)}`, 14, 48)
        pdf.text(`Despesas Totais: ${formatCurrencyBRL(totalExpenseDec)}`, 14, 56)
        pdf.text(`Saldo Líquido: ${formatCurrencyBRL(balanceDec)}`, 14, 64)
        pdf.text(`Taxa de Economia: ${savingsRate.toFixed(1)}%`, 14, 72)

        pdf.line(14, 78, 196, 78)

        pdf.setFontSize(12)
        pdf.text('Histórico de Transações:', 14, 88)

        let yPos = 98
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Data', 14, yPos)
        pdf.text('Descrição', 40, yPos)
        pdf.text('Categoria', 110, yPos)
        pdf.text('Valor', 165, yPos)

        pdf.setFont('helvetica', 'normal')
        filteredTxs.forEach((tx) => {
          yPos += 7
          if (yPos > 270) {
            pdf.addPage()
            yPos = 20
          }
          pdf.text(formatDate(tx.date), 14, yPos)
          pdf.text(tx.description.substring(0, 30), 40, yPos)
          pdf.text((tx.categories?.name || 'Sem Categoria').substring(0, 20), 110, yPos)
          pdf.text(`${tx.type === 'income' ? '+' : '-'} ${formatCurrencyBRL(tx.amount)}`, 165, yPos)
        })

        const pdfBlob = pdf.output('blob')
        const blobUrl = URL.createObjectURL(pdfBlob)

        const link = document.createElement('a')
        link.href = blobUrl
        link.download = fileName
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        setTimeout(() => document.body.removeChild(link), 1000)

        setDownloadLink({ url: blobUrl, filename: fileName })
        pdf.save(fileName)
      } catch {
        setExportError('Não foi possível gerar o PDF. Tente novamente.')
      }
    } finally {
      setIsExporting(false)
    }
  }

  const months = [
    { value: '0', label: 'Janeiro' },
    { value: '1', label: 'Fevereiro' },
    { value: '2', label: 'Março' },
    { value: '3', label: 'Abril' },
    { value: '4', label: 'Maio' },
    { value: '5', label: 'Junho' },
    { value: '6', label: 'Julho' },
    { value: '7', label: 'Agosto' },
    { value: '8', label: 'Setembro' },
    { value: '9', label: 'Outubro' },
    { value: '10', label: 'Novembro' },
    { value: '11', label: 'Dezembro' },
  ]

  const years = Array.from({ length: 5 }, (_, i) => {
    const y = now.getFullYear() - 2 + i
    return { value: String(y), label: String(y) }
  })

  const currentMonthLabel = months.find((m) => m.value === selectedMonth)?.label || ''

  return (
    <div className="space-y-6">
      {/* Barra de Ações */}
      <div className="glass-card rounded-xl p-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between select-none">
        <div className="flex flex-wrap gap-4 items-end flex-1">
          <Select
            label="Mês do Relatório"
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            options={months}
            className="w-40"
          />

          <Select
            label="Ano do Relatório"
            value={selectedYear}
            onChange={(e) => handleYearChange(e.target.value)}
            options={years}
            className="w-32"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {downloadLink && (
            <a
              id="pdf-download-anchor"
              href={downloadLink.url}
              download={downloadLink.filename}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-500 hover:bg-emerald-500/20 transition-colors"
            >
              <FileCheck className="h-4 w-4" />
              Baixar {downloadLink.filename}
            </a>
          )}

          <Button onClick={exportPDF} disabled={isExporting || filteredTxs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Gerando...' : 'Exportar Relatório PDF'}
          </Button>
        </div>
      </div>

      {exportError && (
        <div className="rounded-lg bg-danger/10 border border-danger/20 p-3 text-xs text-danger text-center select-none">
          {exportError}
        </div>
      )}

      {/* ÁREA DO CONTEÚDO DO RELATÓRIO A SER IMPRESSO */}
      {filteredTxs.length > 0 ? (
        <div
          id="report-content"
          className="rounded-2xl border border-border/60 bg-card/25 p-8 md:p-10 shadow-lg space-y-8 min-h-[1000px] flex flex-col justify-between"
        >
          {/* Header do Relatório */}
          <div className="flex items-center justify-between pb-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/15 p-2 text-primary">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">FinanceFlow</h2>
                <p className="text-xs text-muted-foreground">Relatório Financeiro Mensal</p>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>Período: {currentMonthLabel} de {selectedYear}</p>
              <p>Emitido em: {now.toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {/* Cards de Métricas */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {/* Receitas */}
            <div className="border border-border/50 rounded-xl p-4 bg-card/30 flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>Receitas</span>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="text-lg font-bold text-emerald-500 mt-1">{formatCurrencyBRL(totalIncomeDec)}</span>
            </div>

            {/* Despesas */}
            <div className="border border-border/50 rounded-xl p-4 bg-card/30 flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>Despesas</span>
                <TrendingDown className="h-4 w-4 text-rose-500" />
              </div>
              <span className="text-lg font-bold text-rose-500 mt-1">{formatCurrencyBRL(totalExpenseDec)}</span>
            </div>

            {/* Saldo Final */}
            <div className="border border-border/50 rounded-xl p-4 bg-card/30 flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>Saldo Líquido</span>
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <span className={`text-lg font-bold mt-1 ${balanceDec.greaterThanOrEqualTo(0) ? 'text-emerald-500' : 'text-rose-500'}`}>
                {formatCurrencyBRL(balanceDec)}
              </span>
            </div>

            {/* Poupança */}
            <div className="border border-border/50 rounded-xl p-4 bg-card/30 flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>Taxa de Economia</span>
                <Percent className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-lg font-bold mt-1">
                {savingsRate > 0 ? `${savingsRate.toFixed(1)}%` : '0.0%'}
              </span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-5 flex-1">
            {/* Categorias e Limites */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 select-none">
                <Activity className="h-4 w-4 text-primary" />
                Resumo por Categoria
              </h3>
              <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-2">
                {categorySummaryList.map((cat, index) => {
                  const limitPercent = calculateBudgetUsage(cat.amount, cat.limit)
                  const isBlown = cat.limit ? cat.amount.greaterThan(toDecimal(cat.limit)) : false
                  return (
                    <div key={index} className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="font-semibold">{cat.name}</span>
                        </div>
                        <span className="font-bold">{formatCurrencyBRL(cat.amount)}</span>
                      </div>
                      {cat.limit ? (
                        <div className="space-y-1">
                          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isBlown ? 'bg-danger' : 'bg-primary'
                              }`}
                              style={{ width: `${Math.min(limitPercent, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Limite: {formatCurrencyBRL(cat.limit)}</span>
                            <span className={isBlown ? 'text-danger font-semibold' : ''}>
                              {limitPercent.toFixed(0)}% do limite
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Detalhamento das Transações do Mês */}
            <div className="md:col-span-3 space-y-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 select-none">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                Histórico de Transações
              </h3>
              <div className="border border-border/50 rounded-xl overflow-hidden bg-card/10 text-xs">
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/50 bg-card/30 font-semibold text-muted-foreground select-none">
                        <th className="p-3">Data</th>
                        <th className="p-3">Descrição</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {filteredTxs.map((tx) => (
                        <tr key={tx.id}>
                          <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(tx.date)}</td>
                          <td className="p-3 font-medium truncate max-w-[120px]">{tx.description}</td>
                          <td className="p-3 text-muted-foreground">
                            {tx.categories?.name || 'Sem Categoria'}
                          </td>
                          <td
                            className={`p-3 text-right font-bold whitespace-nowrap ${
                              tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {tx.type === 'income' ? '+' : '-'} {formatCurrencyBRL(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border/50 flex justify-between items-center text-[10px] text-muted-foreground select-none">
            <span>FinanceFlow Orçamento Pessoal © 2026</span>
            <span>Gerado automaticamente pelo aplicativo</span>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-16 text-center text-muted-foreground select-none flex flex-col items-center gap-2">
          <Calendar className="h-10 w-10 text-muted-foreground" />
          <span className="text-sm">Nenhuma transação registrada neste período.</span>
        </div>
      )}
    </div>
  )
}
