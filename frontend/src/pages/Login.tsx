import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Eye, EyeOff, ArrowRight, Shield, Brain, TrendingUp, CheckCircle } from 'lucide-react'
import { authApi } from '../services/api'
import { useAuthStore } from '../stores/authStore'

// ── Animated SVG illustration ──────────────────────────────────────────────────
function HeroIllustration() {
  return (
    <svg viewBox="0 0 520 420" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-lg">
      <defs>
        <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0" />
          <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="barBlue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <clipPath id="card1clip"><rect x="30" y="60" width="200" height="130" rx="16"/></clipPath>
        <clipPath id="card2clip"><rect x="290" y="40" width="200" height="150" rx="16"/></clipPath>
        <clipPath id="card3clip"><rect x="30" y="220" width="460" height="140" rx="16"/></clipPath>
      </defs>

      {/* Background grid lines */}
      {[0,1,2,3,4].map(i => (
        <motion.line key={`h${i}`} x1="0" y1={84*i+20} x2="520" y2={84*i+20}
          stroke="white" strokeOpacity="0.05" strokeWidth="1"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, delay: i * 0.1 }} />
      ))}
      {[0,1,2,3,4,5].map(i => (
        <motion.line key={`v${i}`} x1={86*i+20} y1="0" x2={86*i+20} y2="420"
          stroke="white" strokeOpacity="0.05" strokeWidth="1"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, delay: i * 0.1 }} />
      ))}

      {/* ── Card 1: Health Score ── */}
      <motion.rect x="30" y="60" width="200" height="130" rx="16"
        fill="url(#cardGrad)" stroke="white" strokeOpacity="0.15" strokeWidth="1"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }} />
      <motion.text x="50" y="93" fill="white" fillOpacity="0.5" fontSize="10" fontFamily="system-ui"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        HEALTH SCORE
      </motion.text>
      <motion.text x="50" y="122" fill="white" fontSize="32" fontWeight="800" fontFamily="system-ui"
        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, type: 'spring' }}>
        87
      </motion.text>
      <motion.text x="98" y="122" fill="#34D399" fontSize="13" fontFamily="system-ui" fontWeight="600"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        ↑ 4pts
      </motion.text>
      {/* mini sparkline */}
      <motion.polyline
        points="50,162 72,155 94,158 116,148 138,142 160,138 182,132 204,128 226,122"
        fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 0.7 }} />
      <motion.circle cx="226" cy="122" r="4" fill="#34D399"
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.9 }} />

      {/* ── Card 2: AI Recommendations ── */}
      <motion.rect x="290" y="40" width="200" height="150" rx="16"
        fill="url(#cardGrad)" stroke="white" strokeOpacity="0.15" strokeWidth="1"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }} />
      <motion.text x="310" y="72" fill="white" fillOpacity="0.5" fontSize="10" fontFamily="system-ui"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        AI RECOMMENDATIONS
      </motion.text>
      {[
        { y: 95, label: 'Schedule QBR', pct: 94, color: '#34D399' },
        { y: 118, label: 'Upsell Seats', pct: 81, color: '#60A5FA' },
        { y: 141, label: 'Feature Training', pct: 67, color: '#F59E0B' },
      ].map((item, i) => (
        <motion.g key={item.label}
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 + i * 0.12 }}>
          <text x="310" y={item.y} fill="white" fillOpacity="0.75" fontSize="10" fontFamily="system-ui">{item.label}</text>
          <rect x="310" y={item.y + 5} width="160" height="5" rx="3" fill="white" fillOpacity="0.1" />
          <motion.rect x="310" y={item.y + 5} width={0} height="5" rx="3" fill={item.color}
            animate={{ width: 160 * item.pct / 100 }}
            transition={{ duration: 1, delay: 0.9 + i * 0.15, ease: 'easeOut' }} />
          <text x="478" y={item.y} fill={item.color} fontSize="10" fontFamily="system-ui" fontWeight="700" textAnchor="end">{item.pct}%</text>
        </motion.g>
      ))}
      {/* Pulse dot */}
      <motion.circle cx="478" cy="57" r="5" fill="#34D399"
        animate={{ opacity: [1, 0.3, 1], scale: [1, 1.4, 1] }}
        transition={{ duration: 2, repeat: Infinity }} />
      <text x="468" y="61" fill="#34D399" fontSize="9" fontFamily="system-ui" textAnchor="end" fillOpacity="0.8">LIVE</text>

      {/* ── Connector line ── */}
      <motion.path d="M 230 125 Q 260 125 260 200 Q 260 245 290 195"
        stroke="url(#lineGrad)" strokeWidth="1.5" strokeDasharray="4 3" fill="none"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, delay: 1 }} />

      {/* ── Card 3: Revenue Trend ── */}
      <motion.rect x="30" y="220" width="460" height="140" rx="16"
        fill="url(#cardGrad)" stroke="white" strokeOpacity="0.15" strokeWidth="1"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }} />
      <motion.text x="50" y="250" fill="white" fillOpacity="0.5" fontSize="10" fontFamily="system-ui"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
        ANNUAL RECURRING REVENUE
      </motion.text>
      <motion.text x="50" y="278" fill="white" fontSize="26" fontWeight="800" fontFamily="system-ui"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        $2.4M
      </motion.text>
      <motion.text x="155" y="278" fill="#34D399" fontSize="12" fontFamily="system-ui" fontWeight="600"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
        +18% YoY
      </motion.text>
      {/* Bar chart */}
      {[
        { x: 50, h: 35, label: 'Jan' },
        { x: 110, h: 42, label: 'Feb' },
        { x: 170, h: 38, label: 'Mar' },
        { x: 230, h: 55, label: 'Apr' },
        { x: 290, h: 48, label: 'May' },
        { x: 350, h: 62, label: 'Jun' },
        { x: 410, h: 70, label: 'Jul' },
      ].map((bar, i) => (
        <motion.g key={bar.label}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 + i * 0.07 }}>
          <motion.rect
            x={bar.x} y={340 - bar.h} width="42" rx="5"
            fill={i === 6 ? 'url(#barGreen)' : 'url(#barBlue)'}
            fillOpacity={i === 6 ? 1 : 0.6}
            initial={{ height: 0, y: 340 }}
            animate={{ height: bar.h, y: 340 - bar.h }}
            transition={{ duration: 0.8, delay: 1 + i * 0.08, ease: 'easeOut' }} />
          <text x={bar.x + 21} y={355} fill="white" fillOpacity="0.4" fontSize="9"
            fontFamily="system-ui" textAnchor="middle">{bar.label}</text>
        </motion.g>
      ))}

      {/* ── Floating stat badges ── */}
      <motion.g initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.6, type: 'spring' }}>
        <rect x="158" y="155" width="100" height="44" rx="10"
          fill="#1E40AF" stroke="#60A5FA" strokeOpacity="0.4" strokeWidth="1" />
        <text x="208" y="174" fill="#60A5FA" fontSize="9" fontFamily="system-ui" textAnchor="middle" fillOpacity="0.8">CHURN REDUCED</text>
        <text x="208" y="192" fill="white" fontSize="16" fontWeight="800" fontFamily="system-ui" textAnchor="middle">40%</text>
      </motion.g>

      <motion.g initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.8, type: 'spring' }}>
        <rect x="330" y="200" width="110" height="44" rx="10"
          fill="#134E4A" stroke="#34D399" strokeOpacity="0.4" strokeWidth="1" />
        <text x="385" y="219" fill="#34D399" fontSize="9" fontFamily="system-ui" textAnchor="middle" fillOpacity="0.8">RESPONSE TIME</text>
        <text x="385" y="237" fill="white" fontSize="16" fontWeight="800" fontFamily="system-ui" textAnchor="middle">&lt; 2s</text>
      </motion.g>

      {/* ── AI Brain icon center ── */}
      <motion.circle cx="260" cy="200" r="22" fill="#1E3A8A" stroke="#60A5FA" strokeOpacity="0.5" strokeWidth="1.5"
        animate={{ boxShadow: ['0 0 0px #60A5FA', '0 0 20px #60A5FA', '0 0 0px #60A5FA'] }}
        transition={{ duration: 3, repeat: Infinity }}
        filter="url(#glow)" />
      <motion.text x="260" y="207" fill="#60A5FA" fontSize="18" textAnchor="middle"
        animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2.5, repeat: Infinity }}>
        ⚡
      </motion.text>
    </svg>
  )
}

export default function Login() {
  const [email, setEmail] = useState('admin@cscopilot.com')
  const [password, setPassword] = useState('admin123')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setAuth } = useAuthStore()
  const nav = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { data } = await authApi.login(email, password)
      setAuth(data.user, data.access_token, data.refresh_token)
      nav('/dashboard')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally { setLoading(false) }
  }

  const features = [
    { icon: Brain, title: 'Multi-Agent AI', desc: 'LangGraph orchestration across 8 specialized agents' },
    { icon: TrendingUp, title: 'Predictive Analytics', desc: 'Churn prediction & expansion opportunity detection' },
    { icon: Shield, title: 'Human-in-the-Loop', desc: 'Approval workflows with explainable AI reasoning' },
  ]

  return (
    <div className="min-h-screen flex bg-white dark:bg-[#0A0F1C]">
      {/* ── Left Panel ── */}
      <div className="hidden lg:flex w-[55%] relative flex-col overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 35%, #4338ca 70%, #5b21b6 100%)' }}>

        {/* Background bokeh circles */}
        <div className="absolute inset-0 overflow-hidden">
          {[
            { w: 320, h: 320, l: '-8%', t: '-10%', o: 0.08 },
            { w: 250, h: 250, l: '70%', t: '60%', o: 0.06 },
            { w: 180, h: 180, l: '40%', t: '-5%', o: 0.05 },
            { w: 200, h: 200, l: '-5%', t: '65%', o: 0.07 },
          ].map((c, i) => (
            <motion.div key={i}
              className="absolute rounded-full"
              style={{ width: c.w, height: c.h, left: c.l, top: c.t, background: 'white', opacity: c.o }}
              animate={{ scale: [1, 1.15, 1], opacity: [c.o, c.o * 1.5, c.o] }}
              transition={{ duration: 6 + i * 1.5, repeat: Infinity, delay: i * 0.8 }}
            />
          ))}
          {/* Grid dot pattern */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <motion.div className="flex items-center gap-3 mb-12"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center ring-1 ring-white/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-lg tracking-tight">CS Copilot</div>
              <div className="text-blue-300 text-xs font-medium tracking-wide">AI Decision Intelligence Platform</div>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div className="mb-8"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h1 className="text-4xl font-black text-white leading-tight mb-3">
              Turn Customer Data<br />Into Proactive Action
            </h1>
            <p className="text-blue-200 text-base leading-relaxed max-w-sm">
              AI-powered recommendations before customers churn. Predict, prevent, and grow — automatically.
            </p>
          </motion.div>

          {/* Illustration */}
          <motion.div className="flex-1 flex items-center justify-center -mx-4"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}>
            <HeroIllustration />
          </motion.div>

          {/* Feature pills */}
          <div className="space-y-2.5 mt-4">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-3 bg-white/8 backdrop-blur rounded-xl px-4 py-3 border border-white/10">
                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{title}</div>
                  <div className="text-blue-300 text-xs mt-0.5">{desc}</div>
                </div>
                <CheckCircle className="w-4 h-4 text-green-400 ml-auto flex-shrink-0" />
              </motion.div>
            ))}
          </div>

          {/* Stats row */}
          <motion.div className="flex gap-8 mt-6 pt-6 border-t border-white/10"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
            {[['98%', 'Uptime SLA'], ['< 2s', 'AI Response'], ['40%', 'Churn Reduction']].map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="text-2xl font-black text-white">{v}</div>
                <div className="text-blue-300 text-xs mt-0.5 font-medium">{l}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 dark:bg-[#0A0F1C]">
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1e40af, #4f46e5)' }}>
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Welcome back</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Sign in to your CS Copilot workspace</p>
          </div>

          {/* Demo Credentials */}
          <motion.div
            className="bg-blue-50 dark:bg-indigo-950/40 border border-blue-100 dark:border-indigo-500/20 rounded-2xl p-4 mb-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-1.5">
              <span>🔑</span> Demo Credentials
            </p>
            <div className="space-y-1 text-xs text-blue-600 dark:text-blue-400 font-mono bg-white dark:bg-indigo-950/60 rounded-xl p-2.5 border border-blue-100 dark:border-indigo-500/20">
              <div className="flex items-center justify-between">
                <span>admin@cscopilot.com</span>
                <span className="text-blue-400">/ admin123</span>
              </div>
              <div className="flex items-center justify-between">
                <span>csm@cscopilot.com</span>
                <span className="text-blue-400">/ csm12345</span>
              </div>
            </div>
          </motion.div>

          <form onSubmit={handleLogin} className="space-y-4">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900 text-red-700 dark:text-red-400 text-sm rounded-xl p-3">
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-3 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#111827] dark:text-slate-100 transition-all"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                <a href="#" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full px-4 py-3 pr-11 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#111827] dark:text-slate-100 transition-all"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 mt-2"
              style={{ background: loading ? '#93C5FD' : 'linear-gradient(135deg, #1e40af, #4f46e5)' }}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </motion.button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700">Sign up free</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
