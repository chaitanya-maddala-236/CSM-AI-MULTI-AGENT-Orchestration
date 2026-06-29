import { formatDistanceToNow, format } from 'date-fns'

export const formatDate = (d?: string) => d ? format(new Date(d), 'MMM d, yyyy') : '—'
export const formatDateTime = (d?: string) => d ? format(new Date(d), 'MMM d, yyyy HH:mm') : '—'
export const timeAgo = (d?: string) => d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : '—'
export const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
export const formatPercent = (v: number) => `${(v * 100).toFixed(0)}%`

export const healthColor = (status: string) => ({
  healthy: 'text-green-600', at_risk: 'text-amber-600', critical: 'text-red-600'
}[status] || 'text-slate-600')

export const healthBg = (status: string) => ({
  healthy: 'bg-green-50 text-green-700 border-green-100',
  at_risk: 'bg-amber-50 text-amber-700 border-amber-100',
  critical: 'bg-red-50 text-red-700 border-red-100'
}[status] || 'bg-slate-50 text-slate-700')

export const priorityColor = (priority: string) => ({
  critical: 'bg-red-50 text-red-700', high: 'bg-orange-50 text-orange-700',
  medium: 'bg-blue-50 text-blue-700', low: 'bg-slate-50 text-slate-600'
}[priority] || 'bg-slate-50 text-slate-600')

export const sentimentColor = (s: string) => ({
  positive: 'text-green-600', neutral: 'text-slate-500', negative: 'text-red-600'
}[s] || 'text-slate-500')

export const scoreColor = (score: number) => score >= 70 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-red-600'
export const scoreBg = (score: number) => score >= 70 ? '#22C55E' : score >= 40 ? '#F59E0B' : '#EF4444'
