import { scoreBg } from '../../utils/helpers'

interface Props { score: number; size?: number; strokeWidth?: number }

export default function ScoreRing({ score, size = 56, strokeWidth = 5 }: Props) {
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  const color = scoreBg(score)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={strokeWidth} className="text-slate-200 dark:text-gray-700" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <span className="absolute text-xs font-bold text-slate-700 dark:text-slate-300">{Math.round(score)}</span>
    </div>
  )
}
