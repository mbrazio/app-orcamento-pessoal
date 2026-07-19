'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/ui-store'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  LayoutGrid,
  Landmark,
  Tags,
  Target,
  TrendingUp,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wallet,
  User
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DashboardLayoutProps {
  children: React.ReactNode
  userEmail: string
  userName: string
}

export function DashboardClientLayout({ children, userEmail, userName }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  
  const { theme, isSidebarOpen, toggleTheme, toggleSidebar } = useUIStore()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  // Fechar menu mobile ao mudar de rota
  React.useEffect(() => {
    let active = true
    if (active) {
      setTimeout(() => {
        setIsMobileMenuOpen(false)
      }, 0)
    }
    return () => {
      active = false
    }
  }, [pathname])

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    { name: 'Transações', href: '/transactions', icon: Landmark },
    { name: 'Categorias', href: '/categories', icon: Tags },
    { name: 'Metas', href: '/goals', icon: Target },
    { name: 'Relatórios', href: '/reports', icon: TrendingUp },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-200">
      {/* SIDEBAR DESKTOP */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-card/40 backdrop-blur-md transition-all duration-300 relative ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border/50">
          <div className="flex items-center gap-3 overflow-hidden select-none">
            <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            {isSidebarOpen && (
              <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-300">
                FinanceFlow
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative select-none ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {isSidebarOpen ? (
                  <span>{item.name}</span>
                ) : (
                  <span className="absolute left-14 bg-popover border border-border text-popover-foreground px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                    {item.name}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer Sidebar / Perfil */}
        <div className="p-4 border-t border-border/50 bg-card/10">
          {isSidebarOpen ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border/30">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold truncate leading-none mb-1">{userName}</span>
                  <span className="text-xs text-muted-foreground truncate leading-none">{userEmail}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-muted-foreground border-border/50 hover:text-danger hover:border-danger/30 hover:bg-danger/5 select-none"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center border border-border/30 group relative">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="absolute left-14 bg-popover border border-border text-popover-foreground px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                  {userName}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/5 rounded-lg transition-colors group relative cursor-pointer"
              >
                <LogOut className="h-5 w-5" />
                <span className="absolute left-14 bg-popover border border-border text-popover-foreground px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                  Sair
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Collapse button trigger */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 bg-card border border-border rounded-full p-1 shadow-md hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer z-40 hidden md:block"
        >
          {isSidebarOpen ? <ChevronLeft className="h-4.5 w-4.5" /> : <ChevronRight className="h-4.5 w-4.5" />}
        </button>
      </aside>

      {/* MOBILE SIDEBAR PANEL (DRAWER) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            {/* Drawer Content */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-72 bg-card border-r border-border p-6 flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="h-6 w-6 text-primary" />
                  <span className="font-bold text-lg">FinanceFlow</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 hover:bg-accent rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>

              <div className="border-t border-border pt-4 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center border border-border/30">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold truncate">{userName}</span>
                    <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full text-muted-foreground hover:text-danger" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* VIEWPORT CONTROLLER & CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* HEADER */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border/50 bg-card/20 backdrop-blur-md sticky top-0 z-30 select-none">
          {/* Mobile Menu trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden md:block">
            {/* Rota atual */}
            <span className="text-xs text-muted-foreground">FinanceFlow / {menuItems.find(item => item.href === pathname)?.name || 'Página'}</span>
          </div>

          {/* Theme switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-indigo-500" />}
            </button>
          </div>
        </header>

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
