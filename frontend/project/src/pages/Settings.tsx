// @ts-nocheck
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Zap, Brain, Key, Check, AlertCircle, Moon, Sun, Shield, Bell, Database, ChevronRight, Cpu } from 'lucide-react'
import Header from '../components/layout/Header'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
import { settingsApi } from '../services/api'
import { useToast } from '../components/common/Toast'
import api from '../services/api'

const PROVIDER_INFO = {
  openai:  { name: 'OpenAI',        logo: '🟢', model: 'GPT-4o',               fast: 'GPT-4o Mini',         color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  groq:    { name: 'Groq',          logo: '⚡', model: 'LLaMA 3.3 70B',         fast: 'LLaMA 3.1 8B Instant', color: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800' },
  gemini:  { name: 'Google Gemini', logo: '💎', model: 'Gemini 1.5 Pro',        fast: 'Gemini 1.5 Flash',     color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
}

export default function Settings() {
  const { user } = useAuthStore()
  const { isDark, toggle } = useThemeStore()
  const toast = useToast()
  const [llmInfo, setLlmInfo] = useState(null)
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('ai')

  useEffect(() => {
    Promise.all([
      api.get('/api/v1/settings/llm-info').catch(() => null),
      settingsApi.getBusinessRules().catch(() => null),
    ]).then(([llm, biz]) => {
      if (llm) setLlmInfo(llm.data)
      if (biz) setSettings(biz.data)
    })
  }, [])

  const TABS = [
    { id: 'ai', label: 'AI Provider', icon: Brain },
    { id: 'approvals', label: 'Approvals', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Moon },
    { id: 'account', label: 'Account', icon: Cpu },
  ]

  const provider = llmInfo?.provider
  const pInfo = PROVIDER_INFO[provider] || null

  return (
    <div className="min-h-screen relative"><PageIllustration type="settings" opacity={0.65} /><div className="min-h-screen bg-slate-50 dark:bg-gray-950 relative z-10">
      <Header title="Settings" subtitle="Platform configuration" />

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-xl p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* ── AI Provider Tab ── */}
        {tab === 'ai' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Active provider */}
            {llmInfo ? (
              <div className={`rounded-2xl border p-5 ${pInfo?.color || 'bg-white dark:bg-gray-900 border-slate-100 dark:border-gray-800'}`}>
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{pInfo?.logo || '🤖'}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg">{pInfo?.name || provider}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${llmInfo.key_configured ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'}`}>
                        {llmInfo.key_configured ? '✓ Connected' : '✗ No Key'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                      <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-3 border border-white/50 dark:border-gray-700/50">
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">PRIMARY MODEL</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{pInfo?.model || llmInfo.model}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Used for recommendations & analysis</div>
                      </div>
                      <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-3 border border-white/50 dark:border-gray-700/50">
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">FAST MODEL</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{pInfo?.fast || llmInfo.fast_model}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Used for routing & classification</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 dark:text-slate-400">
                      <Key className="w-3.5 h-3.5" />
                      <span>Key: <span className="font-mono">{llmInfo.key_preview}</span></span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 p-6 text-center">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-slate-100 dark:bg-gray-800 rounded w-1/3 mx-auto" />
                  <div className="h-3 bg-slate-100 dark:bg-gray-800 rounded w-1/2 mx-auto" />
                </div>
              </div>
            )}

            {/* Provider options */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 p-5">
              <h4 className="font-bold text-slate-900 dark:text-white mb-1">Available Providers</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">To switch providers, update your <code className="bg-slate-100 dark:bg-gray-800 px-1 rounded text-xs">.env</code> file with the new key.</p>
              <div className="space-y-3">
                {Object.entries(PROVIDER_INFO).map(([key, p]) => (
                  <div key={key}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${provider === key ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50'}`}>
                    <span className="text-xl">{p.logo}</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{p.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{p.model}</div>
                    </div>
                    {provider === key && <Check className="w-4 h-4 text-blue-600" />}
                    <div className="text-right text-xs text-slate-400 dark:text-slate-500">
                      <div className="font-mono">{key === 'openai' ? 'sk-...' : key === 'groq' ? 'gsk_...' : 'AIza...'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Setup instructions */}
            <div className="bg-slate-900 dark:bg-black rounded-2xl p-5 border border-slate-700 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-400 live-dot" />
                <span className="text-green-400 text-xs font-mono font-bold">.env configuration</span>
              </div>
              <pre className="text-xs text-slate-300 font-mono leading-relaxed overflow-x-auto">{
`# Add ONE of these to your backend/.env:

OPENAI_API_KEY=sk-...        # GPT-4o (best quality)
GROQ_API_KEY=gsk_...         # LLaMA 3.3 (fastest, free tier)
GEMINI_API_KEY=AIza...       # Gemini 1.5 Pro (Google)

# LLM_PROVIDER=auto  ← auto-detected from key format`}
              </pre>
            </div>
          </motion.div>
        )}

        {/* ── Approvals Tab ── */}
        {tab === 'approvals' && settings && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 p-6 space-y-5">
            <h3 className="font-bold text-slate-900 dark:text-white">Auto-Approval Settings</h3>
            <label className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Enable Auto-Approval</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">High-confidence recommendations auto-approve without CSM review</div>
              </div>
              <button
                onClick={() => setSettings(s => ({ ...s, auto_approve_enabled: !s.auto_approve_enabled }))}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.auto_approve_enabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-gray-700'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.auto_approve_enabled ? 'translate-x-5' : ''}`} />
              </button>
            </label>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Confidence Threshold</span>
                <span className="font-bold text-blue-600">{Math.round((settings.auto_approve_confidence_threshold || 0.85) * 100)}%</span>
              </div>
              <input type="range" min="50" max="99" step="1"
                value={Math.round((settings.auto_approve_confidence_threshold || 0.85) * 100)}
                onChange={e => setSettings(s => ({ ...s, auto_approve_confidence_threshold: Number(e.target.value) / 100 }))}
                className="w-full accent-blue-600" />
              <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-1">
                <span>50% (more auto)</span><span>99% (less auto)</span>
              </div>
            </div>

            <button
              onClick={async () => {
                setSaving(true)
                try {
                  await settingsApi.updateBusinessRules(settings)
                  toast.success('Settings saved', 'Auto-approval rules updated.')
                } catch { toast.error('Failed', 'Could not save settings.') }
                setSaving(false)
              }}
              disabled={saving}
              className="btn-primary w-full justify-center flex items-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              Save Changes
            </button>
          </motion.div>
        )}

        {/* ── Appearance Tab ── */}
        {tab === 'appearance' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 p-6 space-y-5">
            <h3 className="font-bold text-slate-900 dark:text-white">Appearance</h3>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-800 rounded-xl">
              <div className="flex items-center gap-3">
                {isDark ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Toggle between light and dark theme</div>
                </div>
              </div>
              <motion.button onClick={toggle} whileTap={{ scale: 0.9 }}
                className={`w-14 h-7 rounded-full transition-all relative ${isDark ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <motion.div
                  animate={{ x: isDark ? 28 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow flex items-center justify-center">
                  {isDark ? <Moon className="w-3 h-3 text-blue-600" /> : <Sun className="w-3 h-3 text-amber-500" />}
                </motion.div>
              </motion.button>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Preview</div>
              <div className="grid grid-cols-3 gap-2">
                {['blue', 'green', 'purple'].map(c => (
                  <div key={c} className={`h-12 rounded-xl bg-${c}-50 dark:bg-${c}-950/40 border border-${c}-100 dark:border-${c}-900/60 flex items-center justify-center`}>
                    <div className={`w-6 h-6 rounded-full bg-${c}-100 dark:bg-${c}-900/60`} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Account Tab ── */}
        {tab === 'account' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 p-6 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white">Account</h3>
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-gray-800 rounded-xl">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow"
                style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)' }}>
                {user?.full_name?.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">{user?.full_name}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</div>
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium capitalize mt-0.5">{user?.role}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Account Type', user?.role === 'admin' ? 'Administrator' : 'Customer Success Manager'],
                ['Status', 'Active'],
                ['Platform', 'CS Copilot v9'],
                ['AI Provider', provider?.toUpperCase() || '—'],
              ].map(([k, v]) => (
                <div key={k} className="p-3 bg-slate-50 dark:bg-gray-800 rounded-xl">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{k}</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{v}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div></div>
  )
}
