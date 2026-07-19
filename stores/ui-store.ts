import { create } from 'zustand'

interface UIState {
  theme: 'dark' | 'light'
  isSidebarOpen: boolean
  toggleTheme: () => void
  toggleSidebar: () => void
  setSidebarOpen: (isOpen: boolean) => void
  initTheme: () => void
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'dark',
  isSidebarOpen: true,
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark'
      if (typeof window !== 'undefined') {
        const root = window.document.documentElement
        if (newTheme === 'light') {
          root.classList.add('light')
        } else {
          root.classList.remove('light')
        }
        localStorage.setItem('theme', newTheme)
      }
      return { theme: newTheme }
    }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  initTheme: () => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null
      const activeTheme = savedTheme || 'dark'

      const root = window.document.documentElement
      if (activeTheme === 'light') {
        root.classList.add('light')
      } else {
        root.classList.remove('light')
      }
      set({ theme: activeTheme })
    }
  }
}))
