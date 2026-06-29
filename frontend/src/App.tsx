import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import Recommendations from './pages/Recommendations'
import Approvals from './pages/Approvals'
import Alerts from './pages/Alerts'
import Analytics from './pages/Analytics'
import Agents from './pages/Agents'
import AgentObservability from './pages/AgentObservability'
import Knowledge from './pages/Knowledge'
import Settings from './pages/Settings'
import Customer360 from './pages/Customer360'
import RenewalPipeline from './pages/RenewalPipeline'
import RecommendationSimulator from './pages/RecommendationSimulator'
import RecommendationSuccessRates from './pages/RecommendationSuccessRates'
import MemoryTimeline from './pages/MemoryTimeline'
import ArchitectureDiagrams from './pages/ArchitectureDiagrams'
import TeamPerformance from './pages/TeamPerformance'
import CustomerHealthEngine from './pages/CustomerHealthEngine'
import BusinessRulesEngine from './pages/BusinessRulesEngine'
import RecommendationFeedbackLoop from './pages/RecommendationFeedbackLoop'
import DataIngestion from './pages/DataIngestion'
import { ToastProvider } from './components/common/Toast'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="customers/:id/360" element={<Customer360 />} />
            <Route path="renewals" element={<RenewalPipeline />} />
            <Route path="simulator" element={<RecommendationSimulator />} />
            <Route path="success-rates" element={<RecommendationSuccessRates />} />
            <Route path="memory" element={<MemoryTimeline />} />
            <Route path="architecture" element={<ArchitectureDiagrams />} />
            <Route path="team" element={<TeamPerformance />} />
            <Route path="health-engine" element={<CustomerHealthEngine />} />
            <Route path="business-rules" element={<BusinessRulesEngine />} />
            <Route path="feedback-loop" element={<RecommendationFeedbackLoop />} />
            <Route path="data-ingestion" element={<DataIngestion />} />
            <Route path="recommendations" element={<Recommendations />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="agents" element={<Agents />} />
            <Route path="observability" element={<AgentObservability />} />
            <Route path="knowledge" element={<Knowledge />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
