import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const api = axios.create({ baseURL: '/api/v1', timeout: 30000 })

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  r => r,
  async error => {
    if (error.response?.status === 401) {
      const { refreshToken, setAuth, logout } = useAuthStore.getState()
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken })
          setAuth(data.user, data.access_token, data.refresh_token)
          error.config.headers.Authorization = `Bearer ${data.access_token}`
          return api(error.config)
        } catch { logout() }
      } else { logout() }
    }
    return Promise.reject(error)
  }
)

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  signup: (email: string, full_name: string, password: string, role?: string) => api.post('/auth/signup', { email, full_name, password, role }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
}

// Customers
export const customersApi = {
  list: (params?: Record<string,unknown>) => api.get('/customers', { params }),
  stats: () => api.get('/customers/stats'),
  get: (id: string) => api.get(`/customers/${id}`),
  create: (data: Record<string,unknown>) => api.post('/customers', data),
  update: (id: string, data: Record<string,unknown>) => api.patch(`/customers/${id}`, data),
}

// Recommendations
export const recommendationsApi = {
  list: (params?: Record<string,unknown>) => api.get('/recommendations', { params }),
  byCustomer: (id: string) => api.get(`/recommendations/customer/${id}`),
  approve: (id: string, data: { status: string; feedback_note?: string }) => api.post(`/recommendations/${id}/approve`, data),
  trigger: (customer_id: string) => api.post('/recommendations/trigger', { customer_id }),
}

// Agents
export const agentsApi = {
  list: () => api.get('/agents/list'),
  runs: (params?: Record<string,unknown>) => api.get('/agents/runs', { params }),
  stats: () => api.get('/agents/stats'),
}

// Analytics — single consolidated object
export const analyticsApi = {
  healthTrend: (days = 8) => api.get(`/analytics/health-trend?days=${days}`),
  recommendationStats: () => api.get('/analytics/recommendation-stats'),
  revenueTrend: (months = 6) => api.get(`/analytics/revenue-trend?months=${months}`),
  riskFormula: () => api.get('/analytics/risk-formula'),
  successRates: () => api.get('/analytics/recommendation-success-rates'),
  aiPerformance: () => api.get('/analytics/ai-performance'),
  teamPerformance: () => api.get('/analytics/team-performance'),
  upsellOpportunities: () => api.get('/analytics/upsell-opportunities'),
}

// Notifications
export const notificationsApi = {
  list: () => api.get('/notifications'),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
}

// Knowledge
export const knowledgeApi = {
  list: () => api.get('/knowledge'),
  create: (data: Record<string,unknown>) => api.post('/knowledge', data),
  delete: (id: string) => api.delete(`/knowledge/${id}`),
}

// Timeline
export const timelineApi = {
  byCustomer: (id: string) => api.get(`/timeline/customer/${id}`),
}

// Meetings
export const meetingsApi = {
  log: (data: {
    customer_id: string; type: 'meeting'|'email'|'note'
    title: string; summary: string; sentiment: 'positive'|'neutral'|'negative'
    duration_minutes?: number
  }) => api.post('/meetings', data),
  byCustomer: (customerId: string) => api.get(`/meetings/customer/${customerId}`),
}

// CSM assignment
export const csmApi = {
  list: () => api.get('/customers/csm-list'),
  assign: (customerId: string, csm_id: string | null) =>
    api.patch(`/customers/${customerId}/assign-csm`, { csm_id }),
}

// Settings
export const settingsApi = {
  getBusinessRules: () => api.get('/settings/business-rules'),
  updateBusinessRules: (data: { auto_approve_enabled: boolean; auto_approve_confidence_threshold: number }) =>
    api.put('/settings/business-rules', data),
}

// Customer 360
export const customer360Api = {
  get: (id: string) => api.get(`/customers/${id}/360`),
}

// Memory
export const memoryApi = {
  get: (customerId: string) => api.get(`/memory/customer/${customerId}`),
  store: (data: Record<string, unknown>) => api.post('/memory/store', data),
}

// Recommendation extras
export const recExtApi = {
  feedback: (id: string, data: { outcome: string; outcome_notes: string }) =>
    api.post(`/recommendations/${id}/feedback`, data),
  simulate: (customerId: string) => api.get(`/recommendations/simulate/${customerId}`),
  priorityQueue: (customerId: string) => api.get(`/recommendations/priority/${customerId}`),
}

// Renewal
export const renewalApi = {
  list: (params?: Record<string,unknown>) => api.get('/analytics/renewals', { params }),
  forecast: () => api.get('/analytics/renewal-forecast'),
  updateStage: (id: string, stage: string) => api.patch(`/customers/${id}`, { renewal_stage: stage }),
}

// Executive Summary
export const executiveSummaryApi = {
  get: (customerId: string) => api.get(`/customers/${customerId}/executive-summary`),
}

// Business Rules Engine
export const businessRulesApi = {
  get: () => api.get('/settings/business-rules'),
  update: (data: Record<string,unknown>) => api.put('/settings/business-rules', data),
  simulate: (data: Record<string,unknown>) => api.post('/settings/business-rules/simulate', data),
}

export default api
