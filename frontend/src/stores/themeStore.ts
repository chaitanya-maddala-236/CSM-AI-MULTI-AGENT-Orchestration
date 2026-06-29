import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeStore {
  isDark: boolean
  toggle: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      isDark: false,
      toggle: () => {
        const next = !get().isDark
        set({ isDark: next })
        if (next) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },
    }),
    { name: 'cs-copilot-theme' }
  )
)

// Initialize on load
export function initTheme() {
  const stored = localStorage.getItem('cs-copilot-theme')
  if (stored) {
    try {
      const { state } = JSON.parse(stored)
      if (state?.isDark) {
        document.documentElement.classList.add('dark')
      }
    } catch {}
  }
}
