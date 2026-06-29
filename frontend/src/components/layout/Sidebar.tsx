import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Calendar, Lightbulb, CheckSquare,
  Bell, BarChart3, Bot, BookOpen, Settings, LogOut,
  Zap, Users2, Target, Brain, Shield, Heart, RotateCcw,
  Cpu, Eye, Award, ChevronRight, Upload
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { cn } from '../../utils/cn'

const NAV_GROUPS = [
  {
    label: 'WORKSPACE',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',       to: '/dashboard' },
      { icon: Users,           label: 'Customers',       to: '/customers' },
      { icon: Upload,          label: 'Data Ingestion',  to: '/data-ingestion' },
      { icon: Calendar,        label: 'Renewals',        to: '/renewals' },
      { icon: Lightbulb,       label: 'Recommendations', to: '/recommendations' },
      { icon: CheckSquare,     label: 'Approvals',       to: '/approvals' },
      { icon: Bell,            label: 'Alerts',          to: '/alerts' },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { icon: BarChart3,  label: 'Analytics',     to: '/analytics' },
      { icon: Users2,     label: 'Team',          to: '/team' },
      { icon: Target,     label: 'NBA Simulator', to: '/simulator' },
      { icon: Brain,      label: 'Memory',        to: '/memory' },
      { icon: Heart,      label: 'Health Engine', to: '/health-engine' },
      { icon: Shield,     label: 'Rules Engine',  to: '/business-rules' },
      { icon: RotateCcw,  label: 'Feedback Loop', to: '/feedback-loop' },
    ],
  },
  {
    label: 'PLATFORM',
    items: [
      { icon: Bot,      label: 'AI Agents',     to: '/agents' },
      { icon: Eye,      label: 'Observability', to: '/observability' },
      { icon: Award,    label: 'Success Rates', to: '/success-rates' },
      { icon: Cpu,      label: 'Architecture',  to: '/architecture' },
      { icon: BookOpen, label: 'Knowledge',     to: '/knowledge' },
      { icon: Settings, label: 'Settings',      to: '/settings' },
    ],
  },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/')

  return (
    <div className={cn(
      'w-[220px] flex flex-col h-screen sticky top-0 transition-colors duration-300',
      'bg-white dark:bg-[#0D1424]',
      'border-r border-slate-100 dark:border-white/[0.05]'
    )}>

      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-b border-slate-100 dark:border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #6D28D9 100%)' }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white text-sm leading-tight tracking-tight">
              CS Copilot
            </div>
            <div className="text-[9px] text-slate-400 dark:text-slate-600 font-semibold tracking-widest uppercase">
              AI Platform
            </div>
          </div>
        </div>
      </div>

      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-600 tracking-[0.12em] px-2.5 mb-1.5 uppercase">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ icon: Icon, label, to }) => {
                const active = isActive(to)
                return (
                  <NavLink
                    key={to}
                    to={to}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-[7px] rounded-xl text-[13px] font-medium',
                      'transition-all duration-150 group relative',
                      active
                        ? 'bg-blue-50 dark:bg-indigo-500/10 text-blue-700 dark:text-indigo-300 nav-active-glow'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                    )}
                  >
                    <Icon className={cn(
                      'w-4 h-4 flex-shrink-0 transition-colors',
                      active ? 'text-blue-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    )} />
                    <span className="flex-1">{label}</span>
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-indigo-400 flex-shrink-0" />
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User footer ──────────────────────────────────────── */}
      <div className="p-3 border-t border-slate-100 dark:border-white/[0.05]">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors group cursor-pointer">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)' }}
          >
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
              {user?.full_name || 'User'}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
              {user?.role || 'CS Manager'}
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
