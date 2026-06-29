import { Bell, Search, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'

interface HeaderProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const { user } = useAuthStore()
  const { isDark, toggle } = useThemeStore()
  const nav = useNavigate()
  const [searchFocus, setSearchFocus] = useState(false)

  return (
    <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-slate-100 dark:border-gray-800 px-6 py-3.5 flex items-center gap-4 transition-colors duration-300">
      <div className="flex-1">
        {title && <h1 className="text-[17px] font-bold text-slate-900 dark:text-slate-100 leading-tight">{title}</h1>}
        {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">{subtitle}</p>}
      </div>

      {/* Search */}
      <div
        className={`flex items-center gap-2 bg-slate-100 dark:bg-gray-800 rounded-xl px-3 py-2 transition-all ${searchFocus ? 'ring-2 ring-blue-400 bg-white dark:bg-gray-700' : ''}`}
        style={{ width: searchFocus ? 240 : 180 }}
      >
        <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <input
          onFocus={() => setSearchFocus(true)}
          onBlur={() => setSearchFocus(false)}
          placeholder="Search..."
          className="bg-transparent text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 outline-none w-full"
        />
      </div>

      {/* Dark mode toggle */}
      <motion.button
        onClick={toggle}
        whileTap={{ scale: 0.9 }}
        className="relative w-9 h-9 rounded-xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <motion.div
          key={isDark ? 'moon' : 'sun'}
          initial={{ rotate: -30, opacity: 0, scale: 0.7 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </motion.div>
      </motion.button>

      {/* Alerts */}
      <button
        onClick={() => nav('/alerts')}
        className="relative w-9 h-9 rounded-xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors"
      >
        <Bell className="w-4 h-4" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-800" />
      </button>

      {actions}

      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)' }}
        onClick={() => nav('/settings')}
      >
        {user?.full_name?.charAt(0) || 'U'}
      </div>
    </div>
  )
}
