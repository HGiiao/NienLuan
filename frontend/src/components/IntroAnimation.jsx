import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

/* ─── Data ─── */
export const CITIES = [
  { id: 'HAN', name: 'Hà Nội', x: 155, y: 72 },
  { id: 'HPH', name: 'Hải Phòng', x: 185, y: 82 },
  { id: 'HUE', name: 'Huế', x: 120, y: 218 },
  { id: 'DAD', name: 'Đà Nẵng', x: 120, y: 248 },
  { id: 'CXR', name: 'Nha Trang', x: 142, y: 352 },
  { id: 'DAL', name: 'Đà Lạt', x: 122, y: 390 },
  { id: 'SGN', name: 'TP.HCM', x: 120, y: 448 },
  { id: 'CAN', name: 'Cần Thơ', x: 100, y: 478 },
  { id: 'PQC', name: 'Phú Quốc', x: 58, y: 500 },
]

export const REVEAL_ORDER = ['HAN', 'DAD', 'CXR', 'SGN', 'CAN']

export const FLIGHT_ROUTES = [
  { from: 'HAN', to: 'DAD' },
  { from: 'DAD', to: 'SGN' },
  { from: 'HAN', to: 'SGN' },
]

const TRAIN_ROUTE = ['HAN', 'HPH', 'HUE', 'DAD', 'CXR', 'SGN']

export const PRICE_BUBBLES = [
  { cityId: 'HAN', x: 162, y: 60, lines: ['✈ Vietnam Airlines 2.540.000đ', '🚄 SE1 790.000đ'] },
  { cityId: 'DAD', x: 128, y: 236, lines: ['✈ VietJet 1.890.000đ', '✈ Bamboo 2.100.000đ'] },
  { cityId: 'SGN', x: 128, y: 436, lines: ['✈ Pacific 1.720.000đ', '🚄 SE3 480.000đ'] },
  { cityId: 'CXR', x: 150, y: 340, lines: ['✈ Vietravel 1.550.000đ'] },
  { cityId: 'HUE', x: 128, y: 206, lines: ['🚄 SE2 620.000đ'] },
]

export const AI_STATES = [
  'Đang phân tích 214 chuyến bay...',
  'Đang phân tích 36 chuyến tàu...',
  'Đang so sánh 125 mức giá...',
  'Đang tìm hành trình tối ưu...',
  'Đã sẵn sàng!',
]

export const SUGGESTION = {
  route: 'TP.HCM → Đà Nẵng → Huế',
  saving: '530.000đ',
}

export const VIETNAM_PATH = "M175,28 Q185,38 188,52 Q190,62 182,68 Q170,78 155,75 Q140,72 128,62 Q118,55 112,65 Q106,78 100,90 Q95,100 88,105 Q78,110 65,120 Q55,132 52,145 Q50,158 60,165 Q72,170 85,165 Q95,160 105,158 Q112,158 115,170 Q118,185 112,200 Q105,215 95,225 Q82,238 78,250 Q75,262 85,272 Q98,280 112,280 Q128,280 142,272 Q152,262 155,250 Q157,242 160,248 Q165,258 162,272 Q155,290 145,302 Q135,318 132,335 Q130,350 122,362 Q112,375 100,380 Q88,385 80,395 Q75,408 78,425 Q82,442 78,452 Q70,462 55,470 Q42,478 35,490 Q28,505 32,518 Q38,530 52,538 Q62,544 68,540 Q72,535 65,522 Q58,510 55,498 Q52,488 58,478 Q65,468 75,458 Q85,448 90,435 Q95,420 92,408 Q88,398 80,392 Q72,388 65,382 Q58,375 55,365 Q52,352 58,338 Q65,322 72,308 Q78,295 80,280 Q82,268 78,258 Q72,250 65,245 Q58,240 52,232 Q48,222 55,212 Q62,202 72,195 Q82,188 88,178 Q92,168 90,158 Q88,148 82,140 Q75,132 68,128 Q58,124 55,118 Q52,110 58,100 Q65,90 75,82 Q85,76 92,72 Q98,68 100,62 Q102,55 98,48 Q95,42 88,38 Q80,35 72,38 Q65,42 60,48 Q55,55 52,65 Q48,78 52,88 Q55,95 62,100 Q70,105 78,105 Q85,105 92,100 Q98,95 102,88 Q105,80 108,72 Q112,62 118,55 Q125,48 132,48 Q140,48 148,55 Q155,62 158,72 Q160,82 158,92 Q155,100 152,105 Q148,108 145,108 Q140,108 138,105 Q135,100 135,95 Q135,88 138,80 Q140,72 145,65 Q150,58 158,52 Q165,45 172,38 Q178,30 175,28Z"

/* ─── Helpers ─── */
function cityById(id) { return CITIES.find(c => c.id === id) }

/* ─── Deep particles ─── */
function DeepParticles() {
  const items = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    id: i, x: Math.random() * 94 + 3, y: Math.random() * 94 + 3,
    s: Math.random() * 1.6 + 0.6, d: Math.random() * 18 + 14, dx: Math.random() * 22 - 11, dy: Math.random() * 22 - 11,
  })), [])
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {items.map(p => (
        <motion.div key={p.id} className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, background: 'rgba(249,115,22,0.28)' }}
          animate={{ x: [0, p.dx, -p.dx * 0.5, 0], y: [0, p.dy, -p.dy * 0.5, 0], opacity: [0.08, 0.45, 0.18, 0.45, 0.08] }}
          transition={{ duration: p.d, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

/* ─── Map with tilt + spotlight ─── */
function VietnamMap({ visibleCities, routeActive, tilt }) {
  const TRAIN_PTS = useMemo(() => TRAIN_ROUTE.map(id => cityById(id)).filter(Boolean), [])
  const FLIGHT_PATHS = useMemo(() => FLIGHT_ROUTES.map(r => {
    const from = cityById(r.from); const to = cityById(r.to)
    if (!from || !to) return null
    const midX = (from.x + to.x) / 2 + 10
    const midY = (from.y + to.y) / 2 - 25
    return { d: `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`, from, to }
  }).filter(Boolean), [])

  const rotateX = tilt.y * 2.8
  const rotateY = tilt.x * -2.8

  return (
    <motion.div className="relative" style={{ perspective: 1000, zIndex: 2 }}>
      <motion.div className="relative"
        animate={{ rotateX, rotateY, y: 10 }}
        transition={{ type: 'spring', stiffness: 80, damping: 16, mass: 0.7 }}
        style={{ transformStyle: 'preserve-3d' }}>
        {/* Spotlight that follows tilt */}
        <div className="absolute -inset-14 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${50 + tilt.x * 20}% ${50 + tilt.y * 20}%, rgba(249,115,22,0.12) 0%, transparent 55%)`,
            filter: 'blur(14px)',
            zIndex: 0,
          }} />

        <svg viewBox="0 0 200 560" className="w-full h-full relative" style={{ filter: 'drop-shadow(0 14px 36px rgba(0,0,0,0.06))', zIndex: 1 }}>
          <defs>
            <filter id="mapShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#000000" floodOpacity="0.05"/>
            </filter>
            <linearGradient id="mapFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98"/>
              <stop offset="100%" stopColor="#F8FAFC" stopOpacity="0.93"/>
            </linearGradient>
            <filter id="glowSm" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glowLg" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="4.4" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Vietnam shape */}
          <motion.path
            d={VIETNAM_PATH}
            fill="url(#mapFill)"
            stroke="rgba(249,115,22,0.10)"
            strokeWidth="1.3"
            filter="url(#mapShadow)"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Nodes */}
          {CITIES.map((city, i) => {
            const show = visibleCities.includes(city.id)
            return (
              <g key={city.id}>
                <circle cx={city.x} cy={city.y} r="10" fill="none" stroke="#F97316" strokeWidth="1.5" opacity="0">
                  {show && (
                    <animate attributeName="opacity" values="0;0.55;0" dur="2.2s" begin={`${i * 0.08 + 0.2}s`} repeatCount="indefinite" />
                  )}
                  {show && (
                    <animate attributeName="r" values="8;20;8" dur="2.2s" begin={`${i * 0.08 + 0.2}s`} repeatCount="indefinite" />
                  )}
                </circle>
                <circle cx={city.x} cy={city.y} r="4.4" fill="#0F172A" stroke="#FFFFFF" strokeWidth="2.2" opacity="0">
                  {show && (
                    <animate attributeName="opacity" from="0" to="1" dur="0.44s" begin={`${i * 0.08 + 0.2}s`} fill="freeze" />
                  )}
                </circle>
                {/* Specular highlight */}
                {show && (
                  <circle cx={city.x - 1.4} cy={city.y - 1.4} r="1.3" fill="#FFFFFF" opacity="0">
                    <animate attributeName="opacity" from="0" to="0.9" dur="0.36s" begin={`${i * 0.08 + 0.3}s`} fill="freeze" />
                  </circle>
                )}
                <text x={city.x} y={city.y + 17} textAnchor="middle" fontSize="7.2" fontWeight="700" fill="#0F172A" opacity="0">
                  {show && (
                    <animate attributeName="opacity" from="0" to="1" dur="0.38s" begin={`${i * 0.08 + 0.38}s`} fill="freeze" />
                  )}
                  {city.name}
                </text>
              </g>
            )
          })}

          {/* Train route */}
          {routeActive && TRAIN_PTS.length > 1 && (() => {
            const trainD = TRAIN_PTS.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
            return (
              <g>
                <path d={trainD} fill="none" stroke="#0F172A" strokeWidth="2.2" strokeDasharray="5 7" opacity="0" strokeLinecap="round">
                  <animate attributeName="opacity" from="0" to="0.38" dur="0.8s" begin="0.45s" fill="freeze" />
                </path>
                <circle r="2.5" fill="#0F172A" stroke="#FFFFFF" strokeWidth="1.5" opacity="0">
                  <animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="0.85s" fill="freeze" />
                  <animateMotion dur="11s" begin="0.85s" repeatCount="indefinite" path={trainD} />
                </circle>
                {/* train glow trail */}
                <circle r="3.2" fill="#FFFFFF" opacity="0" filter="url(#glowSm)">
                  <animate attributeName="opacity" values="0;0.35;0" dur="2.4s" begin="0.85s" repeatCount="indefinite" />
                  <animateMotion dur="11s" begin="0.85s" repeatCount="indefinite" path={trainD} />
                </circle>
              </g>
            )
          })()}

          {/* Flight routes */}
          {FLIGHT_PATHS.map((f, i) => (
            <g key={i}>
              <path d={f.d} fill="none" stroke="#F97316" strokeWidth="3.2" opacity="0" strokeLinecap="round">
                <animate attributeName="opacity" from="0" to="0.24" dur="0.7s" begin={`${i * 0.2 + 0.2}s`} fill="freeze" />
                <animate attributeName="stroke-opacity" values="0.24;0.10;0.24" dur="4s" begin={`${i * 0.2 + 0.6}s`} repeatCount="indefinite" />
              </path>
              <path d={f.d} fill="none" stroke="#F97316" strokeWidth="1.7" strokeDasharray="4 5" opacity="0" strokeLinecap="round">
                <animate attributeName="opacity" from="0" to="0.90" dur="0.7s" begin={`${i * 0.2 + 0.2}s`} fill="freeze" />
                <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="3s" begin={`${i * 0.2 + 0.4}s`} repeatCount="indefinite" />
              </path>
            </g>
          ))}

          {/* plane with extended trail */}
          {routeActive && (
            <g>
              {FLIGHT_PATHS.map((f, i) => {
                const pathStr = `M ${f.from.x} ${f.from.y} Q ${(f.from.x+f.to.x)/2+10} ${(f.from.y+f.to.y)/2-25} ${f.to.x} ${f.to.y}`
                return (
                  <g key={`plane-${i}`}>
                    {/* long fade trail */}
                    <circle r="2.8" fill="#F97316" opacity="0" filter="url(#glowLg)">
                      <animate attributeName="opacity" values="0;0.22;0" dur="3.4s" begin={`${i * 1.05}s`} repeatCount="indefinite" />
                      <animateMotion dur="3.2s" begin={`${i * 1.05}s`} repeatCount="indefinite" path={pathStr} />
                    </circle>
                    {/* mid trail */}
                    <circle r="1.9" fill="#FFFFFF" opacity="0">
                      <animate attributeName="opacity" values="0;0.45;0" dur="2.8s" begin={`${i * 1.05}s`} repeatCount="indefinite" />
                      <animateMotion dur="3.2s" begin={`${i * 1.05}s`} repeatCount="indefinite" path={pathStr} />
                    </circle>
                    {/* head */}
                    <circle r="1.3" fill="#FFFFFF" stroke="#F97316" strokeWidth="1.1" opacity="0.95">
                      <animateMotion dur="3.2s" begin={`${i * 1.05}s`} repeatCount="indefinite" path={pathStr} />
                    </circle>
                  </g>
                )
              })}
            </g>
          )}
        </svg>
      </motion.div>
    </motion.div>
  )
}

/* ─── AI Card ─── */
function TypingText({ text, speed = 28, className, style }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed('')
    setDone(false)
    if (!text) return
    let i = 0
    const interval = setInterval(() => {
      i += 1
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(interval)
        setDone(true)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return (
    <span className={className} style={style}>
      {displayed}
      {!done && <span className="inline-block w-1.5 h-4 ml-0.5 align-middle bg-orange-500/80 animate-pulse" />}
    </span>
  )
}

export function AiCard({ state, isDone }) {
  return (
    <motion.div className="rounded-2xl border px-4 py-3 md:px-5 md:py-3.5"
      style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: 'rgba(249,115,22,0.12)', boxShadow: '0 12px 32px rgba(0,0,0,0.05)', transformStyle: 'preserve-3d' }}
      initial={{ opacity: 0, y: -10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, scale: 1.01, boxShadow: '0 18px 44px rgba(0,0,0,0.08)' }}>
      <div className="flex items-center gap-2.5">
        <motion.div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0"
          style={{ background: isDone ? 'linear-gradient(135deg, #16A34A, #22C55E)' : 'linear-gradient(135deg, #F97316, #FB923C)', boxShadow: isDone ? '0 8px 18px rgba(22,163,74,0.22)' : '0 8px 18px rgba(249,115,22,0.22)' }}
          animate={!isDone ? { rotate: [0, 4, -4, 0] } : {}}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
          {isDone ? '✓' : '🧠'}
        </motion.div>
        <span className="text-xs md:text-sm font-semibold" style={{ color: '#0F172A' }}>
          <TypingText text={state} speed={26} />
        </span>
        {!isDone && (
          <motion.span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#F97316', boxShadow: '0 0 8px rgba(249,115,22,0.45)' }}
            animate={{ scale: [1, 1.6, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 1, repeat: Infinity }} />
        )}
      </div>
    </motion.div>
  )
}

/* ─── Price Bubble ─── */
export function PriceBubble({ bubble }) {
  return (
    <motion.div className="absolute pointer-events-none"
      initial={{ opacity: 0, scale: 0.88, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: -10 }}
      exit={{ opacity: 0, scale: 0.92, y: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      style={{ zIndex: 30 }}>
      <div className="rounded-xl px-3 py-2 backdrop-blur-md border text-xs whitespace-nowrap"
        style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderColor: 'rgba(249,115,22,0.14)', boxShadow: '0 10px 28px rgba(0,0,0,0.07)' }}>
        {bubble.lines.map((line, i) => (
          <div key={i}>
            {i > 0 && <div className="h-px my-1" style={{ backgroundColor: 'rgba(249,115,22,0.10)' }} />}
            <span className="font-semibold" style={{ color: '#0F172A' }}>{line}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ─── Suggestion Card ─── */
export function SuggestionCard({ show, onComplete, tilt }) {
  const rotateX = tilt.y * -2.2
  const rotateY = tilt.x * 2.2
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, scale: 0.92, y: 24, filter: 'blur(6px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm mx-auto"
          whileHover={{ y: -4, scale: 1.015, boxShadow: '0 24px 70px rgba(0,0,0,0.08)' }}>
          <motion.div className="rounded-3xl p-5 md:p-6 border backdrop-blur-xl"
            animate={{ rotateX, rotateY }}
            transition={{ type: 'spring', stiffness: 90, damping: 18 }}
            style={{
              backgroundColor: 'rgba(255,255,255,0.84)', borderColor: 'rgba(249,115,22,0.12)',
              boxShadow: '0 22px 64px rgba(0,0,0,0.05)', transformStyle: 'preserve-3d',
            }}>
            <motion.div className="flex items-center gap-2 mb-4"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#16A34A' }}>
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>Gợi ý hôm nay</span>
            </motion.div>
            <div className="space-y-2.5 mb-4">
              <motion.div className="flex items-center gap-3 p-3 rounded-2xl"
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.18 }}
                style={{ backgroundColor: 'rgba(255,255,255,0.65)', border: '1px solid rgba(249,115,22,0.07)' }}>
                <span className="text-lg">✈️</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold" style={{ color: '#64748B' }}>VietJet Air</div>
                  <div className="text-sm font-bold" style={{ color: '#0F172A' }}>TP.HCM → Đà Nẵng</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-medium" style={{ color: '#64748B' }}>07:30</div>
                  <div className="text-xs font-semibold" style={{ color: '#F97316' }}>1.890.000đ</div>
                </div>
              </motion.div>
              <motion.div className="flex items-center gap-3 p-3 rounded-2xl"
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.32 }}
                style={{ backgroundColor: 'rgba(255,255,255,0.65)', border: '1px solid rgba(249,115,22,0.07)' }}>
                <span className="text-lg">🚄</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold" style={{ color: '#64748B' }}>SE3</div>
                  <div className="text-sm font-bold" style={{ color: '#0F172A' }}>Đà Nẵng → Huế</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-medium" style={{ color: '#64748B' }}>13:15</div>
                  <div className="text-xs font-semibold" style={{ color: '#F97316' }}>250.000đ</div>
                </div>
              </motion.div>
            </div>
            <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(249,115,22,0.07)' }}>
              <div className="flex items-center gap-1.5">
                <motion.div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#16A34A', boxShadow: '0 0 10px rgba(22,163,74,0.4)' }}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }} />
                <span className="text-[10px] font-medium" style={{ color: '#64748B' }}>Tiết kiệm</span>
              </div>
              <motion.span className="text-base font-black" style={{ color: '#F97316', textShadow: '0 0 18px rgba(249,115,22,0.25)' }}
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.5 }}>
                {SUGGESTION.saving}
              </motion.span>
            </div>
            <motion.button onClick={onComplete}
              className="w-full mt-4 py-3 rounded-xl font-bold text-sm text-white transition-all duration-300"
              style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)', boxShadow: '0 6px 20px rgba(249,115,22,0.24)' }}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}>
              Xem hành trình
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Countdown ─── */
export function CountdownPill({ visible, seconds, onSkip }) {
  const pct = ((8 - seconds) / 8) * 100
  const r = 10; const circ = 2 * Math.PI * r; const dash = (pct / 100) * circ
  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="absolute top-5 right-5 md:top-8 md:right-8 z-30">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full border"
            style={{ backgroundColor: 'rgba(255,255,255,0.72)', borderColor: 'rgba(249,115,22,0.10)', backdropFilter: 'blur(12px)', boxShadow: '0 2px 14px rgba(0,0,0,0.03)' }}>
            <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r={r} fill="none" stroke="#E2E8F0" strokeWidth="2" />
              <motion.circle cx="12" cy="12" r={r} fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`} />
            </svg>
            <span className="text-xs font-semibold tabular-nums w-6 text-center" style={{ color: '#64748B' }}>{seconds}</span>
            <button onClick={onSkip} className="text-[11px] font-bold" style={{ color: '#F97316' }}>Bỏ qua</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Main ─── */
export default function IntroAnimation({ onComplete }) {
  const [visibleCities, setVisibleCities] = useState([])
  const [routeActive, setRouteActive] = useState(false)
  const [aiStep, setAiStep] = useState(0)
  const [showSuggestion, setShowSuggestion] = useState(false)
  const [showCta, setShowCta] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [countdown, setCountdown] = useState(8)
  const [priceBubbleKey, setPriceBubbleKey] = useState(0)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const [idle, setIdle] = useState(false)
  const containerRef = useRef(null)

  /* Lock body scroll while intro is visible (the app behind is still mounted,
     so without this the body scrollbar + the intro's own scrollbar = 2 bars) */
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  /* Mouse parallax/tilt + idle auto-tilt */
  useEffect(() => {
    const handle = (e) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      setMouse({ x, y })
      setIdle(false)
    }
    const idleTimer = setTimeout(() => setIdle(true), 1800)
    window.addEventListener('mousemove', handle, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handle)
      clearTimeout(idleTimer)
    }
  }, [])

  /* Auto gentle tilt when idle */
  const tilt = useMemo(() => {
    if (idle) {
      const t = Date.now() / 1000
      return {
        x: Math.sin(t * 0.55) * 0.08,
        y: Math.cos(t * 0.65) * 0.06,
      }
    }
    return mouse
  }, [mouse, idle])

  /* Step 1: reveal cities */
  useEffect(() => {
    if (completed) return
    const nextIndex = visibleCities.length
    if (nextIndex >= REVEAL_ORDER.length) return
    const t = setTimeout(() => {
      setVisibleCities(prev => [...prev, REVEAL_ORDER[nextIndex]])
    }, 220)
    return () => clearTimeout(t)
  }, [visibleCities, completed])

  /* Step 2: activate routes */
  useEffect(() => {
    if (visibleCities.length < REVEAL_ORDER.length) return
    const t = setTimeout(() => setRouteActive(true), 420)
    return () => clearTimeout(t)
  }, [visibleCities])

  /* Step 3: AI progression */
  useEffect(() => {
    if (!routeActive) return
    if (aiStep >= AI_STATES.length) { setShowSuggestion(true); return }
    const t = setTimeout(() => setAiStep(p => p + 1), 950)
    return () => clearTimeout(t)
  }, [routeActive, aiStep])

  /* Step 4: price bubbles cycling */
  useEffect(() => {
    if (!routeActive) return
    const keys = PRICE_BUBBLES.map((_, i) => i)
    let i = 0
    const interval = setInterval(() => {
      setPriceBubbleKey(keys[i % keys.length])
      i++
    }, 2000)
    return () => clearInterval(interval)
  }, [routeActive])

  /* Countdown */
  useEffect(() => {
    if (!showSuggestion) return
    const t = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearInterval(t); return 0 } return prev - 1 })
    }, 1000)
    return () => clearInterval(t)
  }, [showSuggestion])

  const handleStart = useCallback(() => {
    if (completed) return
    setCompleted(true)
    setTimeout(onComplete, 280)
  }, [completed, onComplete])

  useEffect(() => {
    if (countdown > 0 || completed) return
    setShowCta(true)
    const t = setTimeout(() => handleStart(), 1600)
    return () => clearTimeout(t)
  }, [countdown, completed, handleStart])

  const activeBubble = PRICE_BUBBLES[priceBubbleKey] || null
  const mapH = 560
  const mapW = 200
  const bubbleStyle = activeBubble ? {
    position: 'absolute',
    left: `${(activeBubble.x / mapW) * 100 + 9}%`,
    top: `${(activeBubble.y / mapH) * 100}%`,
    transform: 'translateY(-50%)',
    zIndex: 30,
  } : undefined

  return (
    <div ref={containerRef} className="fixed inset-0 z-[9999] overflow-y-auto"
      style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 55%, #FFF7ED 100%)' }}>
      {/* Texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat', backgroundSize: '180px 180px', zIndex: 0,
        }} />
      <DeepParticles />

      {/* Logo */}
      <motion.div className="absolute top-5 left-5 md:top-8 md:left-8 z-20"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border"
          style={{ backgroundColor: 'rgba(255,255,255,0.78)', borderColor: 'rgba(249,115,22,0.08)', backdropFilter: 'blur(14px)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black"
            style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)', boxShadow: '0 8px 18px rgba(249,115,22,0.24)' }}>V</div>
          <span className="text-sm font-bold tracking-tight" style={{ color: '#0F172A' }}>Vé247</span>
        </div>
      </motion.div>

      {/* Countdown */}
      <CountdownPill visible={showSuggestion && !showCta && !completed} seconds={countdown} onSkip={handleStart} />

      {/* Center content */}
      <div className="relative min-h-screen flex flex-col items-center justify-center z-10 px-4 py-20">
        {/* Map with depth layers */}
        <div className="relative w-full max-w-[260px] md:max-w-[300px]" style={{ zIndex: 2, transformStyle: 'preserve-3d' }}>
          {/* background glow layer */}
          <motion.div className="absolute -inset-10 pointer-events-none"
            animate={{ x: mouse.x * -18, y: mouse.y * -18 }}
            transition={{ type: 'spring', stiffness: 60, damping: 20, mass: 0.5 }}
            style={{
              background: `radial-gradient(circle at ${50 + mouse.x * 14}% ${50 + mouse.y * 14}%, rgba(249,115,22,0.14) 0%, transparent 55%)`,
              filter: 'blur(16px)',
              zIndex: 0,
            }} />
          <motion.div className="absolute -inset-6 pointer-events-none"
            animate={{ x: mouse.x * -10, y: mouse.y * -10 }}
            transition={{ type: 'spring', stiffness: 80, damping: 18, mass: 0.6 }}
            style={{
              background: `radial-gradient(circle at ${50 + mouse.x * 10}% ${50 + mouse.y * 10}%, rgba(249,115,22,0.10) 0%, transparent 50%)`,
              filter: 'blur(10px)',
              zIndex: 1,
            }} />
          <VietnamMap visibleCities={visibleCities} routeActive={routeActive} tilt={tilt} />

          {/* Price bubbles */}
          {activeBubble && (
            <div style={bubbleStyle}>
              <PriceBubble bubble={activeBubble} />
            </div>
          )}
        </div>

        {/* AI Card */}
        {(routeActive || showSuggestion) && (
          <motion.div className="mt-4 md:mt-6 w-full max-w-sm"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <motion.div animate={{ rotateX: tilt.y * -1.4, rotateY: tilt.x * 1.4 }} transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              style={{ transformStyle: 'preserve-3d' }}>
              <AiCard state={AI_STATES[Math.min(aiStep, AI_STATES.length - 1)]} isDone={aiStep >= AI_STATES.length} tilt={tilt} />
            </motion.div>
          </motion.div>
        )}

        {/* Suggestion */}
        <div className="mt-4 md:mt-6 w-full max-w-sm">
          <SuggestionCard show={showSuggestion} onComplete={handleStart} tilt={tilt} />
        </div>

        {/* CTA */}
        <AnimatePresence>
          {showCta && (
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="mt-6 w-full max-w-sm">
              <motion.button whileHover={{ scale: 1.03, y: -3 }} whileTap={{ scale: 0.97 }} onClick={handleStart}
                className="w-full py-3.5 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)', boxShadow: '0 14px 36px rgba(249,115,22,0.30)' }}>
                <span>Bắt đầu</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tagline */}
      <motion.div className="absolute bottom-5 md:bottom-6 left-0 right-0 text-center z-20"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.8 }}>
        <p className="text-[10px] md:text-xs font-medium" style={{ color: '#94A3B8' }}>
          Nền tảng AI so sánh giá vé máy bay & tàu hỏa trên khắp Việt Nam
        </p>
      </motion.div>
    </div>
  )
}
