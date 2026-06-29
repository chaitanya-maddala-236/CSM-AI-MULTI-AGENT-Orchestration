export interface User {
  id: string; email: string; full_name: string; role: string;
  is_active: boolean; avatar_url?: string; created_at?: string;
}

export interface Company {
  id: string; name: string; industry?: string; website?: string;
  size?: string; country?: string; annual_revenue?: number;
}

export interface Customer {
  id: string; name: string; email: string; title?: string;
  health_score: number; churn_probability: number; health_status: string;
  sentiment: string; sentiment_score: number; plan?: string;
  mrr: number; arr: number; renewal_date?: string; seats: number;
  tags: string[]; is_active: boolean; created_at?: string; last_activity?: string;
  company?: Company; csm?: User;
}

export interface Recommendation {
  id: string; customer_id: string; title: string; description?: string;
  category?: string; priority: string; status: string;
  actions: string[]; evidence: string[]; reasoning?: string;
  confidence_score: number; risk_score: number;
  approved_by?: string; approved_at?: string; feedback_note?: string;
  created_at?: string; customer?: Customer;
}

export interface AgentRun {
  id: string; customer_id?: string; workflow_id?: string; agent_name?: string;
  status: string; execution_time_ms: number; token_usage: Record<string,number>;
  llm_provider?: string; error?: string; logs: string[];
  started_at?: string; completed_at?: string;
}

export interface DashboardStats {
  total_customers: number; healthy: number; at_risk: number; critical: number;
  renewals_this_month: number; upsell_opportunities: number;
  pending_approvals: number; avg_health_score: number; total_arr: number;
}

export interface Notification {
  id: string; title: string; message: string; type: string;
  is_read: boolean; related_customer_id?: string; created_at?: string;
}

export interface Timeline {
  id: string; customer_id: string; event_type: string; title: string;
  description?: string; event_metadata: Record<string,unknown>; occurred_at?: string;
}

export interface KnowledgeDoc {
  id: string; title: string; category: string; tags: string[];
  is_active: boolean; created_at?: string;
}

export interface AuthState {
  user: User | null; token: string | null; refreshToken: string | null;
  isAuthenticated: boolean;
}
