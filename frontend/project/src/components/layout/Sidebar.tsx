import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Calendar, Lightbulb, CheckSquare,
  Bell, BarChart3, Bot, BookOpen, Settings, LogOut,
  Zap, Users2, Target, Brain, Shield, Heart, RotateCcw,
  Cpu, Eye, Award
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { cn } from '../../utils/cn'

const NAV_GROUPS = [
  {
    label: 'WORKSPACE',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',       to: '/dashboard' },
      { icon: Users,           label: 'Customers',       to: '/customers' },
      { icon: Calendar,        label: 'Renewals',        to: '/renewals' },
      { icon: Lightbulb,       label: 'Recommendations', to: '/recommendations' },
      { icon: CheckSquare,     label: 'Approvals',       to: '/approvals' },
      { icon: Bell,            label: 'Alerts',          to: '/alerts' },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { icon: BarChart3,  label: 'Analytics',      to: '/analytics' },
      { icon: Users2,     label: 'Team',           to: '/team' },
      { icon: Target,     label: 'NBA Simulator',  to: '/simulator' },
      { icon: Brain,      label: 'Memory',         to: '/memory' },
      { icon: Heart,      label: 'Health Engine',  to: '/health-engine' },
      { icon: Shield,     label: 'Rules Engine',   to: '/business-rules' },
      { icon: RotateCcw,  label: 'Feedback Loop',  to: '/feedback-loop' },
    ],
  },
  {
    label: 'PLATFORM',
    items: [
      { icon: Bot,        label: 'AI Agents',      to: '/agents' },
      { icon: Eye,        label: 'Observability',  to: '/observability' },
      { icon: Award,      label: 'Success Rates',  to: '/success-rates' },
      { icon: Cpu,        label: 'Architecture',   to: '/architecture' },
      { icon: BookOpen,   label: 'Knowledge Base', to: '/knowledge' },
      { icon: Settings,   label: 'Settings',       to: '/settings' },
    ],
  },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + '/')

  return (
    <div className="w-56 bg-white dark:bg-gray-900 border-r border-slate-100 dark:border-gray-800 flex flex-col h-screen sticky top-0 transition-colors duration-300">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">CS Copilot</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-wide">AI DECISION PLATFORM</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 tracking-widest px-2 mb-1.5">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ icon: Icon, label, to }) => {
                const active = isActive(to)
                return (
                  <NavLink key={to} to={to}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 group relative',
                      active
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800 hover:text-slate-800 dark:hover:text-slate-200'
                    )}>
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-600 rounded-full" />
                    )}
                    <Icon className={cn('w-4 h-4 flex-shrink-0 transition-colors', active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300')} />
                    <span className="truncate">{label}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-slate-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors group">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-sm"
            style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)' }}>
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{user?.full_name}</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 capitalize font-medium">{user?.role}</div>
          </div>
          <button onClick={logout} title="Sign out"
            className="text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
