import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'

/* ─── Constants ─── */
const ANALYSIS_STATES = [
  'Scanning 324 Flights',
  'Scanning 48 Trains',
  'Comparing Prices',
  'Finding Best Route',
  'Optimizing Cost',
]

const NODES = [
  { id: 'vn', label: 'Vietnam Airlines', emoji: '✈️', color: '#ef4444', price: 2540000 },
  { id: 'vj', label: 'VietJet Air', emoji: '✈️', color: '#22c55e', price: 1890000 },
  { id: 'qh', label: 'Bamboo Airways', emoji: '✈️', color: '#3b82f6', price: 3100000 },
  { id: 'bl', label: 'Pacific Airlines', emoji: '✈️', color: '#f59e0b', price: 1720000 },
  { id: 'vu', label: 'Vietravel Airlines', emoji: '✈️', color: '#8b5cf6', price: 2250000 },
  { id: 'dsvn', label: 'Đường sắt VN', emoji: '🚄', color: '#06b6d4', price: 790000 },
  { id: 'weather', label: 'Weather', emoji: '🌤️', color: '#0ea5e9' },
  { id: 'hotel', label: 'Hotel', emoji: '🏨', color: '#eab308' },
]

/* ─── Helpers ─── */
function fmtPrice(p) {
  return p.toLocaleString('vi-VN') + 'đ'
}

function rng(min, max) {
  return Math.random() * (max - min) + min
}

function circPos(index, total, radius) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
}

/* ─── Particle Background ─── */
function Particles({ count = 30 }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: rng(0, 100),
      y: rng(0, 100),
      size: rng(1.5, 4),
      delay: rng(0, 5),
      duration: rng(8, 16),
      driftX: rng(-15, 15),
      driftY: rng(-15, 15),
    })), [count])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: 'rgba(249, 115, 22, 0.25)',
          }}
          animate={{
            x: [0, p.driftX, -p.driftX * 0.5, p.driftX * 0.7, 0],
            y: [0, p.driftY, -p.driftY * 0.7, p.driftY * 0.5, 0],
            opacity: [0.3, 0.8, 0.4, 0.9, 0.3],
            scale: [1, 1.3, 0.9, 1.2, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

/* ─── Pulse Ring ─── */
function PulseRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[1, 2, 3].map(i => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-orange-400/20"
          style={{ width: 320 + i * 60, height: 320 + i * 60 }}
          animate={{
            scale: [1, 1.25 + i * 0.08],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 2.5 + i * 0.3,
            repeat: Infinity,
            delay: i * 0.6,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  )
}

/* ─── AI Core ─── */
function AiCore({ phase }) {
  return (
    <div className="relative flex items-center justify-center">
      <PulseRings />
      <motion.div
        className="relative w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center"
        style={{
          background: 'radial-gradient(circle at 35% 35%, rgba(249,115,22,0.3), rgba(249,115,22,0.08) 60%, transparent)',
          boxShadow: '0 0 80px rgba(249,115,22,0.2), inset 0 0 80px rgba(249,115,22,0.05)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        animate={{
          scale: [1, 1.03, 1],
          boxShadow: [
            '0 0 80px rgba(249,115,22,0.2), inset 0 0 80px rgba(249,115,22,0.05)',
            '0 0 100px rgba(249,115,22,0.3), inset 0 0 100px rgba(249,115,22,0.08)',
            '0 0 80px rgba(249,115,22,0.2), inset 0 0 80px rgba(249,115,22,0.05)',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute inset-2 rounded-full border border-orange-400/20" />
        <div className="absolute inset-4 rounded-full border border-orange-400/10" />

        {/* Rotating energy ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, transparent, rgba(249,115,22,0.3), transparent, rgba(249,115,22,0.15), transparent)',
            maskImage: 'radial-gradient(circle at center, transparent 58%, black 62%)',
            WebkitMaskImage: 'radial-gradient(circle at center, transparent 58%, black 62%)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 90deg, transparent, rgba(249,115,22,0.2), transparent, rgba(249,115,22,0.1), transparent)',
            maskImage: 'radial-gradient(circle at center, transparent 62%, black 66%)',
            WebkitMaskImage: 'radial-gradient(circle at center, transparent 62%, black 66%)',
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />

        {/* Center icon */}
        <motion.div
          className="relative z-10 flex flex-col items-center"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-orange-400" />
        </motion.div>
      </motion.div>
    </div>
  )
}

/* ─── Network Node ─── */
function NetworkNode({ node, index, total, radius, dataFlows }) {
  const pos = useMemo(() => circPos(index, total, radius), [index, total, radius])
  const [price, setPrice] = useState(node.price ?? null)
  const isPriced = price !== null && node.price !== undefined

  useEffect(() => {
    if (!isPriced) return
    const interval = setInterval(() => {
      const change = rng(-0.04, 0.04)
      setPrice(prev => Math.round(Math.max(prev * (1 + change), 150000)))
    }, rng(2000, 5000))
    return () => clearInterval(interval)
  }, [isPriced])

  const flowActive = dataFlows.includes(node.id)

  return (
    <motion.div
      className="absolute"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 + index * 0.08, duration: 0.5, ease: 'easeOut' }}
      style={{
        left: `calc(50% + ${pos.x}px)`,
        top: `calc(50% + ${pos.y}px)`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <motion.div
        className="flex items-center gap-2 px-3 py-2 rounded-2xl backdrop-blur-lg border whitespace-nowrap transition-all duration-300"
        style={{
          backgroundColor: 'rgba(255,255,255,0.55)',
          borderColor: 'rgba(249,115,22,0.12)',
          boxShadow: flowActive
            ? '0 4px 20px rgba(249,115,22,0.15), 0 0 0 1px rgba(249,115,22,0.15)'
            : '0 2px 12px rgba(0,0,0,0.04)',
        }}
        animate={flowActive ? {
          boxShadow: [
            '0 4px 20px rgba(249,115,22,0.15), 0 0 0 1px rgba(249,115,22,0.15)',
            '0 4px 28px rgba(249,115,22,0.25), 0 0 0 2px rgba(249,115,22,0.2)',
            '0 4px 20px rgba(249,115,22,0.15), 0 0 0 1px rgba(249,115,22,0.15)',
          ],
        } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="text-base leading-none">{node.emoji}</span>
        <span
          className="text-xs font-semibold"
          style={{ color: '#0F172A' }}
        >
          {isPriced ? fmtPrice(price) : node.label}
        </span>
        {isPriced && (
          <motion.span
            className="text-[10px] font-medium"
            style={{ color: '#64748B' }}
            key={price}
            initial={{ y: -6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {node.label}
          </motion.span>
        )}
      </motion.div>
    </motion.div>
  )
}

/* ─── Data Flow Lines ─── */
function DataFlowLines({ nodes, radius, dataFlows }) {
  const svgRef = useRef(null)
  const [size, setSize] = useState({ w: 800, h: 600 })

  useEffect(() => {
    function resize() {
      setSize({ w: window.innerWidth, h: window.innerHeight })
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const cx = size.w / 2
  const cy = size.h / 2

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none"
      width={size.w}
      height={size.h}
      style={{ opacity: 0.6 }}
    >
      {nodes.map((node, i) => {
        const pos = circPos(i, nodes.length, radius)
        const x2 = cx + pos.x
        const y2 = cy + pos.y
        const isActive = dataFlows.includes(node.id)
        return (
          <g key={node.id}>
            <line
              x1={cx} y1={cy} x2={x2} y2={y2}
              stroke={isActive ? '#F97316' : '#E2E8F0'}
              strokeWidth={isActive ? 1.5 : 0.8}
              strokeDasharray={isActive ? '4 4' : '2 4'}
              opacity={isActive ? 0.6 : 0.3}
            />
            {isActive && (
              <motion.circle
                r={3}
                fill="#F97316"
                style={{
                  filter: 'drop-shadow(0 0 4px rgba(249,115,22,0.6))',
                }}
                animate={{
                  offsetDistance: ['0%', '100%'],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'linear',
                  delay: i * 0.1,
                }}
              >
                <motion.div
                  style={{ offsetPath: `path('M ${cx} ${cy} L ${x2} ${y2}')` }}
                />
              </motion.circle>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/* ─── Data Flow Particles (SVG circles animating along lines) ─── */
function FlowParticles({ nodes, radius, dataFlows, cx, cy }) {
  return (
    <>
      {nodes.map((node, i) => {
        if (!dataFlows.includes(node.id)) return null
        const pos = circPos(i, nodes.length, radius)
        const x2 = cx + pos.x
        const y2 = cy + pos.y
        const len = Math.sqrt((x2 - cx) ** 2 + (y2 - cy) ** 2)
        return (
          <motion.circle
            key={node.id}
            r={2.5}
            fill="#F97316"
            style={{
              filter: 'drop-shadow(0 0 6px rgba(249,115,22,0.8))',
            }}
            animate={{
              cx: [cx, x2],
              cy: [cy, y2],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: len / 200,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'linear',
            }}
          />
        )
      })}
    </>
  )
}

/* ─── Status Text ─── */
function StatusText({ state, index }) {
  return (
    <div className="h-12 flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={state}
          initial={{ y: 20, opacity: 0, filter: 'blur(4px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: -20, opacity: 0, filter: 'blur(4px)' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-2.5"
        >
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-orange-500"
            animate={{ scale: [1, 1.6, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-sm md:text-base font-medium text-[#64748B] tracking-tight">{state}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ─── Progress Dots ─── */
function ProgressDots({ current, total }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            background: i <= current ? '#F97316' : '#E2E8F0',
          }}
          animate={i === current ? { width: 20 } : { width: 6 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

/* ─── Result Card ─── */
function ResultCard({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="relative max-w-sm w-full mx-auto"
        >
          <div
            className="rounded-3xl p-6 border backdrop-blur-xl"
            style={{
              backgroundColor: 'rgba(255,255,255,0.7)',
              borderColor: 'rgba(249,115,22,0.12)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.06), 0 0 0 1px rgba(249,115,22,0.06)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                <motion.svg
                  className="w-3.5 h-3.5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <path d="M20 6L9 17l-5-5" />
                </motion.svg>
              </div>
              <span className="text-sm font-semibold text-[#0F172A]">Đã tìm thấy hành trình tối ưu</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/60 border border-orange-100/50">
                <span className="text-lg">✈️</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#64748B]">VietJet Air</div>
                  <div className="text-sm font-bold text-[#0F172A]">TP.HCM → Hà Nội</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-[#64748B]">07:30</div>
                  <div className="text-xs font-semibold text-orange-500">1.890.000đ</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/60 border border-orange-100/50">
                <span className="text-lg">🚄</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#64748B]">SE3</div>
                  <div className="text-sm font-bold text-[#0F172A]">Hà Nội → Hải Phòng</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-[#64748B]">13:15</div>
                  <div className="text-xs font-semibold text-orange-500">250.000đ</div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-orange-100/30 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <motion.div
                  className="w-2 h-2 rounded-full bg-orange-500"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-xs font-medium text-[#64748B]">Tiết kiệm</span>
              </div>
              <motion.span
                className="text-base font-black text-orange-500"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.8 }}
              >
                530.000đ
              </motion.span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Main Component ─── */
export default function Onboarding({ onComplete }) {
  const [phase, setPhase] = useState(0)
  const [dataFlows, setDataFlows] = useState([])
  const [showResult, setShowResult] = useState(false)
  const [showCta, setShowCta] = useState(false)
  const [countdown, setCountdown] = useState(8)
  const [radius, setRadius] = useState(280)

  /* Responsive radius */
  useEffect(() => {
    function calc() {
      const w = window.innerWidth
      if (w < 640) setRadius(110)
      else if (w < 1024) setRadius(180)
      else setRadius(260)
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  /* Phase progression */
  useEffect(() => {
    if (phase >= ANALYSIS_STATES.length) {
      setShowResult(true)
      return
    }
    const t = setTimeout(() => setPhase(p => p + 1), 1400)
    return () => clearTimeout(t)
  }, [phase])

  /* Data flow activation — progressively activate nodes */
  useEffect(() => {
    if (phase === 0) return
    const activeCount = Math.min(phase + 2, NODES.length - 1)
    const available = NODES.filter(n => n.price !== undefined)
    const subset = available.slice(0, activeCount)
    setDataFlows(subset.map(n => n.id))
  }, [phase])

  /* Countdown */
  useEffect(() => {
    if (!showResult) return
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setShowCta(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [showResult])

  const progress = 1 - countdown / 8

  return (
    <div
      className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 50%, #FFF7ED 100%)',
      }}
    >
      {/* Noise overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        }}
      />

      {/* Particles */}
      <Particles count={35} />

      {/* Logo */}
      <motion.div
        className="absolute top-6 left-6 md:top-8 md:left-8 z-20"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-2xl backdrop-blur-xl border"
          style={{
            backgroundColor: 'rgba(255,255,255,0.6)',
            borderColor: 'rgba(249,115,22,0.08)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
          }}
        >
          <motion.div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black"
            style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)' }}
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            V
          </motion.div>
          <span className="text-base font-bold tracking-tight" style={{ color: '#0F172A' }}>Vé247</span>
        </div>
      </motion.div>

      {/* Countdown pill */}
      <AnimatePresence>
        {showResult && !showCta && (
          <motion.div
            className="absolute top-6 right-6 md:top-8 md:right-8 z-20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div
              className="flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-xl border"
              style={{
                backgroundColor: 'rgba(255,255,255,0.6)',
                borderColor: 'rgba(249,115,22,0.1)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
              }}
            >
              <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="#E2E8F0" strokeWidth="2" />
                <motion.circle
                  cx="12" cy="12" r="10"
                  fill="none"
                  stroke="#F97316"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={`${progress * 62.8} 62.8`}
                  initial={false}
                  animate={{ strokeDasharray: `${progress * 62.8} 62.8` }}
                />
              </svg>
              <span className="text-sm font-semibold text-[#64748B] min-w-[1ch] tabular-nums">{countdown}s</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center layout */}
      <div className="relative flex flex-col items-center justify-center z-10 w-full px-4">
        {/* AI Core + Network */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: radius * 2 + 240, height: radius * 2 + 100 }}
        >
          {/* Data flow SVG */}
          <DataFlowLines nodes={NODES.filter(n => n.price !== undefined)} radius={radius} dataFlows={dataFlows} />

          {/* Network nodes */}
          {NODES.filter(n => n.price !== undefined).map((node, i) => (
            <NetworkNode
              key={node.id}
              node={node}
              index={i}
              total={NODES.filter(n => n.price !== undefined).length}
              radius={radius}
              dataFlows={dataFlows}
            />
          ))}

          {/* AI Core */}
          <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
            <AiCore phase={phase} />
          </div>
        </div>

        {/* Spacer */}
        <div className="h-6" />

        {/* Status text */}
        {!showResult && (
          <StatusText state={ANALYSIS_STATES[phase] || 'Optimizing...'} index={phase} />
        )}
        {!showResult && (
          <div className="mt-3">
            <ProgressDots current={phase} total={ANALYSIS_STATES.length} />
          </div>
        )}

        {/* Result card */}
        <div className="mt-4">
          <ResultCard show={showResult} />
        </div>

        {/* CTA Button */}
        <AnimatePresence>
          {showCta && (
            <motion.div
              className="mt-6"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                onClick={onComplete}
                className="relative group px-8 py-3.5 rounded-2xl font-bold text-base text-white flex items-center gap-2.5 overflow-hidden transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, #F97316, #FB923C)',
                  boxShadow: '0 8px 24px rgba(249,115,22,0.3)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(249,115,22,0.4)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(249,115,22,0.3)'
                }}
              >
                {/* Ripple effect on hover */}
                <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10 flex items-center gap-2.5">
                  Bắt đầu
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer branding */}
      <motion.div
        className="absolute bottom-6 left-0 right-0 text-center z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
      >
        <p className="text-xs font-medium" style={{ color: '#94A3B8' }}>
          Nền tảng AI so sánh giá vé máy bay & tàu hỏa
        </p>
      </motion.div>
    </div>
  )
}
