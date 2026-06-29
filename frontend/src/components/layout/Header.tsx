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
    <div className={`
      sticky top-0 z-20 px-6 py-3 flex items-center gap-3 transition-colors duration-300
      bg-white/90 dark:bg-[#0D1424]/90 backdrop-blur-md
      border-b border-slate-100 dark:border-white/[0.05]
    `}>
      {/* Title */}
      <div className="flex-1 min-w-0">
        {title && (
          <h1 className="text-[16px] font-bold text-slate-900 dark:text-white leading-tight tracking-tight truncate">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium truncate">
            {subtitle}
          </p>
        )}
      </div>

      {/* Search */}
      <motion.div
        animate={{ width: searchFocus ? 220 : 160 }}
        transition={{ duration: 0.2 }}
        className={`
          flex items-center gap-2 rounded-xl px-3 py-2 transition-all overflow-hidden
          ${searchFocus
            ? 'bg-white dark:bg-[#1A2540] ring-2 ring-blue-500/40 border border-blue-200 dark:border-indigo-500/30'
            : 'bg-slate-100 dark:bg-white/[0.05] border border-transparent'
          }
        `}
      >
        <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <input
          onFocus={() => setSearchFocus(true)}
          onBlur={() => setSearchFocus(false)}
          placeholder="Search..."
          className="bg-transparent text-[13px] text-slate-700 dark:text-slate-300 placeholder-slate-400 outline-none w-full"
        />
      </motion.div>

      {/* Dark mode toggle */}
      <motion.button
        onClick={toggle}
        whileTap={{ scale: 0.88 }}
        className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center
                   text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.09]
                   transition-colors border border-transparent dark:border-white/[0.04]"
        title={isDark ? 'Light mode' : 'Dark mode'}
      >
        <motion.div
          key={isDark ? 'moon' : 'sun'}
          initial={{ rotate: -30, opacity: 0, scale: 0.7 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.22 }}
        >
          {isDark
            ? <Sun className="w-4 h-4 text-amber-400" />
            : <Moon className="w-4 h-4 text-slate-500" />
          }
        </motion.div>
      </motion.button>

      {/* Alerts */}
      <button
        onClick={() => nav('/alerts')}
        className="relative w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center
                   text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.09]
                   transition-colors border border-transparent dark:border-white/[0.04]"
      >
        <Bell className="w-4 h-4" />
        {/* Live notification dot */}
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-[1.5px] border-white dark:border-[#0D1424]" />
      </button>

      {actions}

      {/* Avatar */}
      <button
        onClick={() => nav('/settings')}
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold
                   flex-shrink-0 shadow-md shadow-blue-500/20 ring-2 ring-white dark:ring-[#0D1424]
                   hover:ring-blue-300 dark:hover:ring-indigo-500/50 transition-all"
        style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)' }}
        title="Settings"
      >
        {user?.full_name?.charAt(0) || 'U'}
      </button>
    </div>
  )
}
