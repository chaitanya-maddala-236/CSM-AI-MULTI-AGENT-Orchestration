/**
 * PageIllustration — renders a themed SVG as a fixed background behind page content.
 * Usage: <PageIllustration type="dashboard" />
 * The SVG is pointer-events:none and z-index:0 so it never blocks clicks.
 */

type IllustrationType =
  | 'dashboard' | 'customers' | 'analytics' | 'agents'
  | 'knowledge' | 'approvals' | 'settings' | 'alerts'
  | 'renewals' | 'recommendations' | 'memory' | 'architecture'
  | 'team' | 'simulator'

interface Props {
  type: IllustrationType
  opacity?: number
}

// ── Shared defs ────────────────────────────────────────────────────────────
const SharedDefs = () => (
  <defs>
    <linearGradient id="gBlue" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.12" />
      <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.04" />
    </linearGradient>
    <linearGradient id="gGreen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#16A34A" stopOpacity="0.10" />
      <stop offset="100%" stopColor="#059669" stopOpacity="0.03" />
    </linearGradient>
    <linearGradient id="gRed" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#DC2626" stopOpacity="0.10" />
      <stop offset="100%" stopColor="#9333EA" stopOpacity="0.03" />
    </linearGradient>
    <linearGradient id="gPurple" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.10" />
      <stop offset="100%" stopColor="#2563EB" stopOpacity="0.03" />
    </linearGradient>
    <linearGradient id="gAmber" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#D97706" stopOpacity="0.10" />
      <stop offset="100%" stopColor="#EA580C" stopOpacity="0.03" />
    </linearGradient>
  </defs>
)

// ── Dashboard: floating metric cards + chart lines ─────────────────────────
function DashboardIllustration() {
  return (
    <svg viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <SharedDefs />
      {/* Grid */}
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={i * 110} y1="0" x2={i * 110} y2="700"
          stroke="#2563EB" strokeOpacity="0.04" strokeWidth="1" />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i} x1="0" y1={i * 100} x2="1200" y2={i * 100}
          stroke="#2563EB" strokeOpacity="0.04" strokeWidth="1" />
      ))}
      {/* Floating cards */}
      <rect x="40" y="80" width="200" height="110" rx="16" fill="url(#gBlue)" stroke="#2563EB" strokeOpacity="0.12" strokeWidth="1" />
      <rect x="900" y="60" width="240" height="130" rx="16" fill="url(#gGreen)" stroke="#16A34A" strokeOpacity="0.12" strokeWidth="1" />
      <rect x="1000" y="400" width="180" height="100" rx="16" fill="url(#gPurple)" stroke="#7C3AED" strokeOpacity="0.12" strokeWidth="1" />
      <rect x="20" y="450" width="160" height="90" rx="16" fill="url(#gAmber)" stroke="#D97706" strokeOpacity="0.12" strokeWidth="1" />
      {/* Chart line — health trend */}
      <polyline
        points="100,500 200,460 320,480 440,420 560,390 680,370 800,340 920,310 1040,280 1140,250"
        fill="none" stroke="#2563EB" strokeOpacity="0.15" strokeWidth="2.5" strokeLinecap="round" />
      {/* Chart line — revenue */}
      <polyline
        points="100,580 200,565 320,555 440,540 560,520 680,500 800,475 920,450 1040,420 1140,395"
        fill="none" stroke="#16A34A" strokeOpacity="0.12" strokeWidth="2" strokeLinecap="round" />
      {/* Pie circle hint */}
      <circle cx="1100" cy="200" r="70" fill="none" stroke="#4F46E5" strokeOpacity="0.08" strokeWidth="18" />
      <circle cx="1100" cy="200" r="70" fill="none" stroke="#16A34A" strokeOpacity="0.06" strokeWidth="18"
        strokeDasharray="175 264" strokeDashoffset="0" />
      {/* Bar chart shadows */}
      {[200, 260, 320, 380, 440].map((x, i) => (
        <rect key={i} x={x} y={580 - i * 18 - 30} width="40" rx="6"
          height={i * 18 + 30} fill="#2563EB" fillOpacity="0.06" />
      ))}
      {/* Dot nodes */}
      {[[100, 500], [320, 480], [560, 390], [800, 340], [1040, 280]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5" fill="#2563EB" fillOpacity="0.18" />
      ))}
    </svg>
  )
}

// ── Customers: network nodes ───────────────────────────────────────────────
function CustomersIllustration() {
  const nodes = [
    [600, 350], [350, 200], [850, 200], [200, 420], [700, 180],
    [1000, 350], [450, 500], [800, 480], [150, 250], [950, 150],
  ] as [number, number][]
  return (
    <svg viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <SharedDefs />
      {/* Connect all to center */}
      {nodes.slice(1).map(([x, y], i) => (
        <line key={i} x1="600" y1="350" x2={x} y2={y}
          stroke="#2563EB" strokeOpacity="0.07" strokeWidth="1.5" />
      ))}
      {/* Secondary connections */}
      <line x1="350" y1="200" x2="200" y2="420" stroke="#2563EB" strokeOpacity="0.05" strokeWidth="1" />
      <line x1="850" y1="200" x2="1000" y2="350" stroke="#16A34A" strokeOpacity="0.05" strokeWidth="1" />
      <line x1="450" y1="500" x2="200" y2="420" stroke="#7C3AED" strokeOpacity="0.05" strokeWidth="1" />
      {/* Node circles */}
      {nodes.map(([x, y], i) => {
        const colors = ['#2563EB', '#16A34A', '#DC2626', '#7C3AED', '#D97706']
        const c = colors[i % colors.length]
        const r = i === 0 ? 28 : 16 + (i % 3) * 4
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={r + 8} fill={c} fillOpacity="0.04" />
            <circle cx={x} cy={y} r={r} fill={c} fillOpacity="0.10" stroke={c} strokeOpacity="0.2" strokeWidth="1" />
          </g>
        )
      })}
      {/* Health rings */}
      <circle cx="350" cy="200" r="40" fill="none" stroke="#16A34A" strokeOpacity="0.12" strokeWidth="6"
        strokeDasharray="188 63" />
      <circle cx="1000" cy="350" r="36" fill="none" stroke="#DC2626" strokeOpacity="0.12" strokeWidth="6"
        strokeDasharray="80 150" />
    </svg>
  )
}

// ── Analytics: chart grid ─────────────────────────────────────────────────
function AnalyticsIllustration() {
  return (
    <svg viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <SharedDefs />
      {/* Grid */}
      {Array.from({ length: 10 }, (_, i) => (
        <line key={`h${i}`} x1="60" y1={60 + i * 60} x2="1140" y2={60 + i * 60}
          stroke="#94A3B8" strokeOpacity="0.07" strokeWidth="1" strokeDasharray="4 6" />
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <line key={`v${i}`} x1={60 + i * 98} y1="40" x2={60 + i * 98} y2="660"
          stroke="#94A3B8" strokeOpacity="0.07" strokeWidth="1" strokeDasharray="4 6" />
      ))}
      {/* Area chart fill */}
      <path d="M 60 540 L 158 500 L 256 490 L 354 460 L 452 420 L 550 380 L 648 350 L 746 310 L 844 275 L 942 250 L 1040 220 L 1140 190 L 1140 660 L 60 660 Z"
        fill="#2563EB" fillOpacity="0.05" />
      <polyline
        points="60,540 158,500 256,490 354,460 452,420 550,380 648,350 746,310 844,275 942,250 1040,220 1140,190"
        fill="none" stroke="#2563EB" strokeOpacity="0.18" strokeWidth="2.5" strokeLinecap="round" />
      {/* Second line */}
      <polyline
        points="60,600 158,580 256,575 354,555 452,540 550,520 648,505 746,490 844,470 942,455 1040,440 1140,420"
        fill="none" stroke="#16A34A" strokeOpacity="0.12" strokeWidth="2" strokeLinecap="round" />
      {/* Bar groups */}
      {[160, 320, 480, 640, 800, 960].map((x, i) => (
        <g key={i}>
          <rect x={x - 18} y={580 - i * 22 - 40} width="16" height={i * 22 + 40} rx="4"
            fill="#2563EB" fillOpacity="0.08" />
          <rect x={x + 2} y={590 - i * 15 - 30} width="16" height={i * 15 + 30} rx="4"
            fill="#16A34A" fillOpacity="0.07" />
        </g>
      ))}
      {/* Donut */}
      <circle cx="1060" cy="200" r="65" fill="none" stroke="#2563EB" strokeOpacity="0.10" strokeWidth="20" />
      <circle cx="1060" cy="200" r="65" fill="none" stroke="#16A34A" strokeOpacity="0.08" strokeWidth="20"
        strokeDasharray="163 245" />
      <circle cx="1060" cy="200" r="65" fill="none" stroke="#DC2626" strokeOpacity="0.06" strokeWidth="20"
        strokeDasharray="61 347" strokeDashoffset="-163" />
    </svg>
  )
}

// ── Agents: pipeline flow ──────────────────────────────────────────────────
function AgentsIllustration() {
  const agents = [
    { x: 80,  y: 340, label: 'Memory',        color: '#7C3AED' },
    { x: 240, y: 340, label: 'Planner',        color: '#2563EB' },
    { x: 400, y: 240, label: 'Interaction',    color: '#16A34A' },
    { x: 400, y: 340, label: 'Usage',          color: '#D97706' },
    { x: 400, y: 440, label: 'Sentiment',      color: '#EC4899' },
    { x: 560, y: 240, label: 'Knowledge',      color: '#0891B2' },
    { x: 560, y: 440, label: 'Sentiment+',     color: '#EA580C' },
    { x: 720, y: 340, label: 'Recommendation', color: '#2563EB' },
    { x: 880, y: 340, label: 'Memory Save',    color: '#7C3AED' },
  ]
  const edges: [number, number][] = [
    [0,1],[1,2],[1,3],[1,4],[2,5],[4,6],[5,7],[6,7],[7,8]
  ]
  return (
    <svg viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <SharedDefs />
      {/* Background grid */}
      {Array.from({length:8}, (_,i) => (
        <line key={i} x1="0" y1={i*100} x2="1200" y2={i*100}
          stroke="#64748B" strokeOpacity="0.04" strokeWidth="1" />
      ))}
      {/* Edges */}
      {edges.map(([a,b], i) => (
        <line key={i}
          x1={agents[a].x + 40} y1={agents[a].y}
          x2={agents[b].x - 40} y2={agents[b].y}
          stroke="#94A3B8" strokeOpacity="0.12" strokeWidth="2"
          markerEnd="url(#arrow)" />
      ))}
      {/* Agent nodes */}
      {agents.map((ag, i) => (
        <g key={i}>
          <circle cx={ag.x} cy={ag.y} r="38" fill={ag.color} fillOpacity="0.06"
            stroke={ag.color} strokeOpacity="0.15" strokeWidth="1.5" />
          <circle cx={ag.x} cy={ag.y} r="24" fill={ag.color} fillOpacity="0.10" />
        </g>
      ))}
      {/* Glow on planner (index 1) */}
      <circle cx="240" cy="340" r="50" fill="#2563EB" fillOpacity="0.04" />
      {/* Token flow dots */}
      {[300, 500, 700, 900, 1100].map((x, i) => (
        <circle key={i} cx={x} cy={340 + (i%2===0 ? -10 : 10)} r="4"
          fill="#2563EB" fillOpacity="0.15" />
      ))}
      {/* Status bars top right */}
      {['Planner','Interaction','Knowledge','Recommendation'].map((_, i) => (
        <g key={i}>
          <rect x="980" y={120 + i * 48} width="180" height="32" rx="8"
            fill="#2563EB" fillOpacity="0.04" stroke="#2563EB" strokeOpacity="0.08" strokeWidth="1" />
          <rect x="980" y={120 + i * 48} width={[140, 120, 160, 110][i]} height="32" rx="8"
            fill={['#16A34A','#2563EB','#7C3AED','#D97706'][i]} fillOpacity="0.08" />
        </g>
      ))}
    </svg>
  )
}

// ── Knowledge: document grid + search rays ────────────────────────────────
function KnowledgeIllustration() {
  return (
    <svg viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <SharedDefs />
      {/* Search circle */}
      <circle cx="600" cy="350" r="200" fill="none" stroke="#2563EB" strokeOpacity="0.06" strokeWidth="40" />
      <circle cx="600" cy="350" r="130" fill="none" stroke="#2563EB" strokeOpacity="0.05" strokeWidth="20" />
      <circle cx="600" cy="350" r="60" fill="#2563EB" fillOpacity="0.06" />
      {/* Rays */}
      {Array.from({length:12}, (_,i) => {
        const angle = i * 30 * Math.PI / 180
        const x1 = 600 + 70 * Math.cos(angle), y1 = 350 + 70 * Math.sin(angle)
        const x2 = 600 + 230 * Math.cos(angle), y2 = 350 + 230 * Math.sin(angle)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="#2563EB" strokeOpacity="0.06" strokeWidth="1.5" />
      })}
      {/* Document cards */}
      {[
        [80, 100], [300, 60], [900, 80], [1050, 200],
        [60, 500], [200, 580], [950, 480], [1080, 560],
        [420, 580], [750, 560],
      ].map(([x, y], i) => {
        const w = 140 + (i % 3) * 20, h = 90 + (i % 2) * 20
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} rx="10"
              fill="#2563EB" fillOpacity="0.04" stroke="#2563EB" strokeOpacity="0.08" strokeWidth="1" />
            <rect x={x + 10} y={y + 15} width={w - 20} height="5" rx="3" fill="#2563EB" fillOpacity="0.10" />
            <rect x={x + 10} y={y + 28} width={w - 35} height="4" rx="2" fill="#94A3B8" fillOpacity="0.12" />
            <rect x={x + 10} y={y + 40} width={w - 25} height="4" rx="2" fill="#94A3B8" fillOpacity="0.10" />
          </g>
        )
      })}
    </svg>
  )
}

// ── Approvals: checkmark + workflow boxes ─────────────────────────────────
function ApprovalsIllustration() {
  return (
    <svg viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <SharedDefs />
      {/* Workflow steps */}
      {['AI Generate', 'Pending Review', 'CSM Decision', 'Execute'].map((label, i) => {
        const x = 150 + i * 250
        const approved = i < 2
        return (
          <g key={i}>
            {/* Connector */}
            {i < 3 && <line x1={x + 60} y1="350" x2={x + 190} y2="350"
              stroke="#94A3B8" strokeOpacity="0.10" strokeWidth="2" strokeDasharray="6 4" />}
            {/* Box */}
            <rect x={x - 60} y="300" width="120" height="100" rx="16"
              fill={approved ? '#16A34A' : '#2563EB'} fillOpacity="0.06"
              stroke={approved ? '#16A34A' : '#2563EB'} strokeOpacity="0.14" strokeWidth="1.5" />
            {/* Check / clock */}
            {approved ? (
              <path d={`M ${x-18} 352 L ${x-5} 365 L ${x+22} 338`}
                stroke="#16A34A" strokeOpacity="0.25" strokeWidth="3" fill="none" strokeLinecap="round" />
            ) : (
              <circle cx={x} cy="350" r="16" fill="none" stroke="#2563EB" strokeOpacity="0.15" strokeWidth="2" />
            )}
          </g>
        )
      })}
      {/* Big check in background */}
      <path d="M 520 480 L 570 540 L 680 400"
        stroke="#16A34A" strokeOpacity="0.06" strokeWidth="18" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Confidence bars on right */}
      {[92, 78, 65, 88].map((pct, i) => (
        <g key={i}>
          <rect x="950" y={180 + i * 80} width="220" height="32" rx="8"
            fill="#F1F5F9" fillOpacity="0.5" />
          <rect x="950" y={180 + i * 80} width={220 * pct / 100} height="32" rx="8"
            fill="#2563EB" fillOpacity="0.10" />
          <rect x="1175" y={190 + i * 80} width="10" height="12" rx="2"
            fill="#16A34A" fillOpacity="0.18" />
        </g>
      ))}
    </svg>
  )
}

// ── Settings: gear + sliders ──────────────────────────────────────────────
function SettingsIllustration() {
  return (
    <svg viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <SharedDefs />
      {/* Big gear */}
      <circle cx="900" cy="400" r="160" fill="none" stroke="#94A3B8" strokeOpacity="0.06" strokeWidth="30"
        strokeDasharray="60 20" />
      <circle cx="900" cy="400" r="100" fill="none" stroke="#94A3B8" strokeOpacity="0.05" strokeWidth="20" />
      <circle cx="900" cy="400" r="50" fill="#64748B" fillOpacity="0.04" />
      {/* Small gear */}
      <circle cx="200" cy="250" r="90" fill="none" stroke="#2563EB" strokeOpacity="0.06" strokeWidth="20"
        strokeDasharray="40 15" />
      <circle cx="200" cy="250" r="55" fill="#2563EB" fillOpacity="0.04" />
      {/* Slider controls */}
      {[200, 300, 400, 500].map((y, i) => (
        <g key={i}>
          <rect x="350" y={y} width="400" height="8" rx="4" fill="#94A3B8" fillOpacity="0.08" />
          <rect x="350" y={y} width={[280, 200, 320, 240][i]} height="8" rx="4"
            fill="#2563EB" fillOpacity="0.12" />
          <circle cx={350 + [280, 200, 320, 240][i]} cy={y + 4} r="10"
            fill="white" stroke="#2563EB" strokeOpacity="0.20" strokeWidth="2" />
        </g>
      ))}
      {/* Toggle switches */}
      {[580, 640, 700].map((y, i) => (
        <g key={i}>
          <rect x="350" y={y - 12} width="52" height="24" rx="12"
            fill={i === 1 ? '#2563EB' : '#94A3B8'} fillOpacity={i === 1 ? 0.20 : 0.10} />
          <circle cx={i === 1 ? 390 : 362} cy={y} r="10"
            fill={i === 1 ? '#2563EB' : '#94A3B8'} fillOpacity="0.25" />
        </g>
      ))}
    </svg>
  )
}

// ── Alerts: notification bells + pulses ────────────────────────────────────
function AlertsIllustration() {
  return (
    <svg viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <SharedDefs />
      {/* Pulse rings */}
      {[[600, 350], [200, 200], [1000, 150], [150, 500], [1050, 520]].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={50 + i * 8} fill="none"
            stroke={i === 0 ? '#DC2626' : i === 2 ? '#D97706' : '#2563EB'}
            strokeOpacity="0.06" strokeWidth="12" />
          <circle cx={cx} cy={cy} r={25 + i * 4} fill="none"
            stroke={i === 0 ? '#DC2626' : i === 2 ? '#D97706' : '#2563EB'}
            strokeOpacity="0.08" strokeWidth="6" />
          <circle cx={cx} cy={cy} r="12"
            fill={i === 0 ? '#DC2626' : i === 2 ? '#D97706' : '#2563EB'}
            fillOpacity="0.10" />
        </g>
      ))}
      {/* Notification cards */}
      {[[350, 120], [650, 80], [800, 540], [300, 520]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="200" height="60" rx="12"
          fill={['#FEF2F2', '#FFFBEB', '#EFF6FF', '#FEF2F2'][i]}
          fillOpacity="0.5"
          stroke={['#DC2626', '#D97706', '#2563EB', '#DC2626'][i]}
          strokeOpacity="0.10" strokeWidth="1" />
      ))}
    </svg>
  )
}

// ── Renewals: calendar + timeline ─────────────────────────────────────────
function RenewalsIllustration() {
  return (
    <svg viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <SharedDefs />
      {/* Calendar grid */}
      {Array.from({length:7}, (_,col) =>
        Array.from({length:5}, (_,row) => {
          const x = 80 + col * 90, y = 120 + row * 80
          const highlight = (col===2&&row===1)||(col===5&&row===3)
          return (
            <rect key={`${col}-${row}`} x={x} y={y} width="70" height="60" rx="10"
              fill={highlight ? '#DC2626' : '#2563EB'} fillOpacity={highlight ? 0.08 : 0.04}
              stroke={highlight ? '#DC2626' : '#2563EB'} strokeOpacity="0.10" strokeWidth="1" />
          )
        })
      )}
      {/* Timeline line */}
      <line x1="900" y1="100" x2="900" y2="600" stroke="#2563EB" strokeOpacity="0.08" strokeWidth="3" />
      {/* Timeline markers */}
      {[150, 260, 380, 490, 560].map((y, i) => (
        <g key={i}>
          <circle cx="900" cy={y} r="8" fill={['#DC2626','#D97706','#2563EB','#16A34A','#7C3AED'][i]} fillOpacity="0.18" />
          <rect x="920" y={y - 16} width="200" height="32" rx="8"
            fill="#F8FAFC" fillOpacity="0.6"
            stroke={['#DC2626','#D97706','#2563EB','#16A34A','#7C3AED'][i]}
            strokeOpacity="0.12" strokeWidth="1" />
        </g>
      ))}
    </svg>
  )
}

// ── Recommendations: lightbulb + action cards ─────────────────────────────
function RecommendationsIllustration() {
  return (
    <svg viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <SharedDefs />
      {/* Central bulb glow */}
      <circle cx="600" cy="350" r="180" fill="#2563EB" fillOpacity="0.04" />
      <circle cx="600" cy="350" r="100" fill="#2563EB" fillOpacity="0.06" />
      <circle cx="600" cy="350" r="50" fill="#2563EB" fillOpacity="0.08" />
      {/* Rays */}
      {Array.from({length:8}, (_,i) => {
        const a = i * 45 * Math.PI / 180
        return <line key={i} x1={600 + 60*Math.cos(a)} y1={350 + 60*Math.sin(a)}
          x2={600 + 200*Math.cos(a)} y2={350 + 200*Math.sin(a)}
          stroke="#2563EB" strokeOpacity="0.07" strokeWidth="2" />
      })}
      {/* Rec cards */}
      {[
        [80, 200, '#DC2626'], [80, 380, '#D97706'], [80, 520, '#2563EB'],
        [950, 180, '#16A34A'], [950, 360, '#7C3AED'], [950, 520, '#2563EB'],
      ].map(([x, y, c], i) => (
        <g key={i}>
          <rect x={x as number} y={y as number} width="220" height="100" rx="14"
            fill={c as string} fillOpacity="0.05"
            stroke={c as string} strokeOpacity="0.12" strokeWidth="1.5" />
          <circle cx={(x as number) + 22} cy={(y as number) + 22} r="10"
            fill={c as string} fillOpacity="0.15" />
          <rect x={(x as number) + 40} y={(y as number) + 16} width="120" height="6" rx="3"
            fill={c as string} fillOpacity="0.12" />
          <rect x={(x as number) + 40} y={(y as number) + 30} width="80" height="5" rx="2"
            fill="#94A3B8" fillOpacity="0.12" />
          <rect x={(x as number) + 14} y={(y as number) + 55} width={(180 * [0.94,0.81,0.67,0.88,0.75,0.92][i])} height="8" rx="4"
            fill={c as string} fillOpacity="0.12" />
        </g>
      ))}
    </svg>
  )
}

// ── Memory: brain / neural network ────────────────────────────────────────
function MemoryIllustration() {
  const dots: [number, number][] = [
    [600,350],[420,250],[780,250],[350,420],[850,420],
    [500,160],[700,160],[280,310],[920,310],[600,500],
    [450,550],[750,550],[200,420],[1000,420],
  ]
  return (
    <svg viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <SharedDefs />
      {/* Connections */}
      {[[0,1],[0,2],[0,3],[0,4],[1,5],[2,6],[1,7],[2,8],[0,9],[9,10],[9,11],[3,12],[4,13]].map(([a,b],i) => (
        <line key={i} x1={dots[a][0]} y1={dots[a][1]} x2={dots[b][0]} y2={dots[b][1]}
          stroke="#7C3AED" strokeOpacity="0.07" strokeWidth="1.5" />
      ))}
      {/* Nodes */}
      {dots.map(([x,y],i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={i===0?32:18} fill="#7C3AED" fillOpacity={i===0?0.12:0.07}
            stroke="#7C3AED" strokeOpacity="0.15" strokeWidth="1" />
          {i===0 && <circle cx={x} cy={y} r="16" fill="#7C3AED" fillOpacity="0.15" />}
        </g>
      ))}
      {/* Memory trail boxes */}
      {[[60,100],[60,220],[60,340],[60,460]].map(([x,y],i) => (
        <rect key={i} x={x} y={y} width="180" height="70" rx="12"
          fill="#7C3AED" fillOpacity="0.04" stroke="#7C3AED" strokeOpacity="0.10" strokeWidth="1" />
      ))}
    </svg>
  )
}

// ── Team: org chart ───────────────────────────────────────────────────────
function TeamIllustration() {
  return (
    <svg viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <SharedDefs />
      {/* Org lines */}
      <line x1="600" y1="140" x2="600" y2="220" stroke="#2563EB" strokeOpacity="0.10" strokeWidth="2" />
      <line x1="300" y1="220" x2="900" y2="220" stroke="#2563EB" strokeOpacity="0.10" strokeWidth="2" />
      {[300, 600, 900].map(x => (
        <g key={x}>
          <line x1={x} y1="220" x2={x} y2="320" stroke="#2563EB" strokeOpacity="0.10" strokeWidth="2" />
          {[-90, 0, 90].map(dx => (
            <g key={dx}>
              <line x1={x} y1="400" x2={x + dx} y2="440" stroke="#94A3B8" strokeOpacity="0.08" strokeWidth="1.5" />
              <circle cx={x + dx} cy="460" r="22"
                fill="#2563EB" fillOpacity="0.06" stroke="#2563EB" strokeOpacity="0.12" strokeWidth="1" />
            </g>
          ))}
        </g>
      ))}
      {/* Top box */}
      <rect x="520" y="90" width="160" height="60" rx="14"
        fill="#2563EB" fillOpacity="0.08" stroke="#2563EB" strokeOpacity="0.15" strokeWidth="1.5" />
      {/* Mid boxes */}
      {[220, 520, 820].map((x, i) => (
        <rect key={i} x={x} y="230" width="160" height="60" rx="14"
          fill={['#16A34A','#2563EB','#7C3AED'][i]} fillOpacity="0.06"
          stroke={['#16A34A','#2563EB','#7C3AED'][i]} strokeOpacity="0.12" strokeWidth="1" />
      ))}
      {/* Performance bars */}
      {[400, 480, 560, 640].map((y, i) => (
        <g key={i}>
          <rect x="980" y={y} width="200" height="28" rx="6"
            fill="#F8FAFC" fillOpacity="0.6" stroke="#E2E8F0" strokeOpacity="0.5" strokeWidth="1" />
          <rect x="980" y={y} width={[160, 120, 180, 140][i]} height="28" rx="6"
            fill={['#16A34A','#2563EB','#D97706','#7C3AED'][i]} fillOpacity="0.12" />
        </g>
      ))}
    </svg>
  )
}

// ── Simulator: crystal ball + probability bars ────────────────────────────
function SimulatorIllustration() {
  return (
    <svg viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <SharedDefs />
      {/* Crystal ball */}
      <circle cx="600" cy="360" r="200" fill="none" stroke="#7C3AED" strokeOpacity="0.06" strokeWidth="40" />
      <circle cx="600" cy="360" r="140" fill="#7C3AED" fillOpacity="0.04" />
      <circle cx="600" cy="360" r="80" fill="#7C3AED" fillOpacity="0.07" />
      <circle cx="560" cy="320" r="30" fill="white" fillOpacity="0.05" />
      {/* Probability bars */}
      {[
        [89, '#16A34A', 'Executive Call'],
        [74, '#2563EB', 'Training Session'],
        [58, '#D97706', 'Feature Walkthrough'],
        [41, '#DC2626', 'Discount Offer'],
      ].map(([pct, color, label], i) => (
        <g key={i}>
          <rect x="880" y={160 + i * 100} width="280" height="48" rx="10"
            fill="#F8FAFC" fillOpacity="0.5" stroke={color as string} strokeOpacity="0.08" strokeWidth="1" />
          <rect x="880" y={160 + i * 100} width={280 * (pct as number) / 100} height="48" rx="10"
            fill={color as string} fillOpacity="0.10" />
          <circle cx="908" cy={184 + i * 100} r="12"
            fill={color as string} fillOpacity="0.18" />
        </g>
      ))}
      {/* Input boxes left */}
      {[120, 260, 400, 540].map((y, i) => (
        <rect key={i} x="40" y={y} width="240" height="90" rx="14"
          fill="#7C3AED" fillOpacity="0.04" stroke="#7C3AED" strokeOpacity="0.08" strokeWidth="1" />
      ))}
    </svg>
  )
}

// ── Generic / Architecture ──────────────────────────────────────────────
function GenericIllustration({ gradient = 'gBlue' }: { gradient?: string }) {
  return (
    <svg viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <SharedDefs />
      {/* Dot matrix */}
      {Array.from({length:15}, (_,col) =>
        Array.from({length:9}, (_,row) => (
          <circle key={`${col}-${row}`}
            cx={40 + col * 80} cy={40 + row * 80} r="2.5"
            fill="#94A3B8" fillOpacity="0.10" />
        ))
      )}
      {/* Feature boxes */}
      {[[80,120],[80,300],[80,480],[900,120],[900,300],[900,480]].map(([x,y],i) => (
        <rect key={i} x={x} y={y} width="200" height="120" rx="16"
          fill={`url(#${gradient})`} stroke="#2563EB" strokeOpacity="0.08" strokeWidth="1" />
      ))}
      {/* Center connector */}
      <circle cx="600" cy="350" r="80" fill={`url(#${gradient})`} />
      {[120,240,360,480,600].map((y, i) => (
        <line key={i} x1="280" y1={y} x2="900" y2={700-y}
          stroke="#2563EB" strokeOpacity="0.04" strokeWidth="1" />
      ))}
    </svg>
  )
}

// ── Main export ──────────────────────────────────────────────────────────
export default function PageIllustration({ type, opacity = 1 }: Props) {
  const map: Record<IllustrationType, JSX.Element> = {
    dashboard:       <DashboardIllustration />,
    customers:       <CustomersIllustration />,
    analytics:       <AnalyticsIllustration />,
    agents:          <AgentsIllustration />,
    knowledge:       <KnowledgeIllustration />,
    approvals:       <ApprovalsIllustration />,
    settings:        <SettingsIllustration />,
    alerts:          <AlertsIllustration />,
    renewals:        <RenewalsIllustration />,
    recommendations: <RecommendationsIllustration />,
    memory:          <MemoryIllustration />,
    architecture:    <GenericIllustration gradient="gBlue" />,
    team:            <TeamIllustration />,
    simulator:       <SimulatorIllustration />,
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0, opacity }}
      aria-hidden="true"
    >
      {map[type] ?? <GenericIllustration />}
    </div>
  )
}
