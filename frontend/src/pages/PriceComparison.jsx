import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeftRight, Plane, Train, Bus, CalendarDays, Trophy, BarChart4, ArrowRight, ArrowLeft,
  TrendingUp, DollarSign, BarChart3, ArrowUp, ArrowDown, Activity, Zap, Award, Sparkles, Search, ChevronDown,
  WifiOff, RefreshCcw, Bell, AlertCircle
} from 'lucide-react'
import LocationInput from '../components/LocationInput'
import CommunityTips from '../components/CommunityTips'
import CarbonBadge from '../components/CarbonBadge'
import { useNavigate } from 'react-router-dom'
import { compareRoutes, getPriceTrends, predictPrice, getCurrentPrices } from '../services/api'
import { formatCurrencyVnd, formatDurationMs } from '../utils/formatters'
import usePriceStream from '../hooks/usePriceStream'
import useRefetchOnTabVisible from '../hooks/useRefetchOnTabVisible'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
  LineChart, Line, Area, AreaChart, Legend,
} from 'recharts'

const popularPairs = [
  { from: 'HAN', to: 'SGN' }, { from: 'HAN', to: 'DAD' },
  { from: 'SGN', to: 'DAD' }, { from: 'SGN', to: 'HAN' },
  { from: 'HAN', to: 'CXR' }, { from: 'DAD', to: 'SGN' },
]

const airlineCodes = {
  VN: 'bg-primary-500/10 text-primary-400',
  VJ: 'bg-primary-500/10 text-primary-400',
  QH: 'bg-primary-500/10 text-primary-400',
}

const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-lg p-3.5 text-xs">
      <p className="font-semibold text-[var(--color-text-primary)] mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[var(--color-text-secondary)]">{p.name}:</span>
          <span className="font-semibold text-[var(--color-text-primary)]">{formatCurrencyVnd(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function LiveIndicator({ connected = true, lastUpdated, isConnecting, waiting, reconnectError, nextUpdateIn }) {
  const timeText = lastUpdated
    ? `Cập nhật: ${lastUpdated.toLocaleTimeString('vi-VN', { hour12: false })}`
    : ''
  // Chưa có tuyến tìm kiếm (hoặc đang bắt tay SignalR) → hiển thị "Đang kết nối..."
  // thay vì "Mất kết nối" để phản ánh đúng vòng đời kết nối
  const connecting = Boolean(isConnecting || (!connected && !reconnectError && waiting))
  const label = connected ? 'Thời gian thực' : connecting ? 'Đang kết nối...' : 'Mất kết nối'

  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
        connected
          ? 'bg-emerald-500/10 border-emerald-500/20'
          : reconnectError ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'
      }`} title={`${timeText}${nextUpdateIn ? ` · Cập nhật trong ${nextUpdateIn}s` : ''}`}>
        <span className="relative flex h-2 w-2">
          {connecting ? (
            <RefreshCcw className="w-3 h-3 text-amber-500 animate-spin" />
          ) : (
            <>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                connected ? 'bg-emerald-400' : reconnectError ? 'bg-red-400' : 'bg-amber-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                connected ? 'bg-emerald-500' : reconnectError ? 'bg-red-500' : 'bg-amber-500'
              }`} />
            </>
          )}
        </span>
        <span className={`text-[11px] font-semibold ${
          connected ? 'text-emerald-500' : reconnectError ? 'text-red-500' : 'text-amber-500'
        }`}>
          {label}
        </span>
      </div>

      {!connected && reconnectError && (
        <span className="text-[11px] text-red-500 font-medium">Kiểm tra lại kết nối hoặc tải lại trang</span>
      )}

      {connected && nextUpdateIn != null && (
        <span className="text-[11px] text-[var(--color-text-tertiary)] font-mono">
          Cập nhật trong {nextUpdateIn}s
        </span>
      )}

      {timeText && (
        <span className="text-[11px] text-[var(--color-text-tertiary)] font-mono hidden md:inline">{timeText}</span>
      )}
    </div>
  )
}

function RecommendationCard({ type, route, price, savings, icon: Icon, livePriceDelta }) {
  const text =
    livePriceDelta === null
      ? null
      : livePriceDelta <= -1
        ? `Giá hiện tại thấp hơn ${Math.abs(livePriceDelta).toFixed(1)}% so với trung bình gần đây`
        : livePriceDelta >= 1
          ? `Giá hiện tại cao hơn ${livePriceDelta.toFixed(1)}% so với trung bình gần đây`
          : 'Giá hiện tại gần bằng trung bình gần đây'

  return (
    <div className="bg-gradient-to-br from-primary-500/10 to-primary-500/5 border border-primary-500/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-primary-500" />
        <span className="text-xs font-semibold text-primary-400 uppercase tracking-wider">Gợi ý tiết kiệm</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center shadow-sm">
          <Icon className="w-5 h-5 text-primary-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{route}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">bằng {type}</p>
          {text && (
            <p className={`text-[11px] font-semibold mt-0.5 ${livePriceDelta <= -1 ? 'text-emerald-500' : livePriceDelta >= 1 ? 'text-amber-500' : 'text-[var(--color-text-tertiary)]'}`}>
              {text}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-primary-500">{formatCurrencyVnd(price)}</p>
          {savings > 0 && <p className="text-[11px] font-semibold text-[var(--color-success)]">Tiết kiệm {formatCurrencyVnd(savings)}</p>}
        </div>
      </div>
    </div>
  )
}

function CompareSection({
  label, icon: Icon, accent, flights, trains, buses, outRecommendation, retRecommendation,
  liveCountdown, highlightedIds, searchParams,
}) {
  const navigate = useNavigate()
  const flightList = flights?.map(f => ({ ...f, type: 'flight', typeLabel: 'Máy bay', code: f.airlineCode })) || []
  const trainList = trains?.map(t => ({ ...t, type: 'train', typeLabel: 'Tàu hỏa', code: t.trainCode })) || []
  const busList = buses?.map(b => ({ ...b, type: 'bus', typeLabel: 'Xe khách', code: b.busCode })) || []
  const all = [...flightList, ...trainList, ...busList]
  const cheapest = all.length ? all.reduce((a, b) => a.price < b.price ? a : b) : null
  const cheapestF = flightList.length ? flightList.reduce((a, b) => a.price < b.price ? a : b) : null
  const cheapestT = trainList.length ? trainList.reduce((a, b) => a.price < b.price ? a : b) : null
  const cheapestB = busList.length ? busList.reduce((a, b) => a.price < b.price ? a : b) : null

  // Compare API coi ngày rỗng là "hôm nay". Truyền đúng ngày để trang đích
  // lọc cùng ngày và chứa đúng vé đã click; kèm highlight=id để cuộn tới vé đó.
  const today = new Date().toISOString().substring(0, 10)
  const buildParams = (item, path) => {
    const params = new URLSearchParams({
      from: searchParams?.from || item.departureLocation,
      to: searchParams?.to || item.arrivalLocation,
      date: searchParams?.date || today,
      tripType: searchParams?.tripType || 'one-way',
    })
    if (searchParams?.returnDate) params.set('returnDate', searchParams.returnDate)
    params.set('highlight', item.id)
    navigate(`${path}?${params.toString()}`)
  }
  const goToFlight = (f) => buildParams(f, '/flights')
  const goToTrain = (t) => buildParams(t, '/trains')
  const goToBus = (b) => buildParams(b, '/buses')

  return (
    <div className="mb-6">
      <div className={`${accent} px-5 py-3.5 flex items-center gap-2 rounded-t-2xl`}>
        <Icon className="w-4 h-4 text-white" />
        <h3 className="text-white font-semibold text-sm">{label}</h3>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-white/70 font-medium">{all.length} kết quả</span>
          {liveCountdown != null && (
            <span className="text-[11px] text-white/80 font-mono">Cập nhật {liveCountdown}s</span>
          )}
        </div>
      </div>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-b-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
          <div className="flex flex-col gap-3">
            <div>
              <h4 className="font-semibold text-[var(--color-text-primary)] mb-1 text-xs flex items-center gap-2">
                <BarChart4 className="w-3.5 h-3.5 text-primary-500" />
                So sánh giá thấp nhất — Máy bay vs Xe khách vs Tàu hỏa
              </h4>
              {cheapest && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Rẻ nhất: <span className="font-semibold text-[var(--color-text-primary)]">{cheapest.type === 'flight' ? <Plane className="w-3.5 h-3.5 inline" /> : cheapest.type === 'bus' ? <Bus className="w-3.5 h-3.5 inline" /> : <Train className="w-3.5 h-3.5 inline" />} {cheapest.code}</span>
                    <span className="ml-1 font-bold text-[var(--color-success)]">{formatCurrencyVnd(cheapest.price)}</span>
                  </span>
                  {(() => {
                    const prices = [cheapestF?.price, cheapestT?.price, cheapestB?.price].filter(p => p != null)
                    if (prices.length >= 2) {
                      const spread = Math.max(...prices) - Math.min(...prices)
                      if (spread > 0) {
                        return (
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            Chênh lệch: <span className="font-bold text-primary-500">{formatCurrencyVnd(spread)}</span>
                          </span>
                        )
                      }
                    }
                    return null
                  })()}
                </div>
              )}
            </div>

            {all.length > 0 && (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={[
                  ...(cheapestF ? [{ name: cheapestF.airlineCode, price: cheapestF.price, fill: 'var(--color-chart-1)', label: 'Máy bay' }] : []),
                  ...(cheapestB ? [{ name: cheapestB.busCode, price: cheapestB.price, fill: 'var(--color-chart-3)', label: 'Xe khách' }] : []),
                  ...(cheapestT ? [{ name: cheapestT.trainCode, price: cheapestT.price, fill: 'var(--color-chart-2)', label: 'Tàu hỏa' }] : []),
                ]} layout="vertical" margin={{ left: 50, right: 40, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} tickFormatter={(v) => formatCurrencyVnd(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fontWeight: 600, fill: 'var(--color-text-primary)' }} width={70} />
                  <Tooltip
                    content={({ active, payload }) => active && payload?.[0] ? (
                      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-lg p-3">
                        <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                          {payload[0].payload.label}: {formatCurrencyVnd(payload[0].value)}
                        </p>
                      </div>
                    ) : null}
                  />
                  <Bar dataKey="price" radius={[0, 6, 6, 0]} barSize={24}>
                    <LabelList dataKey="price" position="right" formatter={(v) => formatCurrencyVnd(v)} style={{ fontSize: 11, fontWeight: 600, fill: 'var(--color-text-primary)' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--color-border)]">
          <div>
            <div className="px-5 py-2 flex items-center gap-2 bg-[var(--color-bg)]">
              <Plane className="w-3.5 h-3.5 text-primary-500" />
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">Máy bay ({flights?.length || 0})</span>
              {cheapestF && <span className="text-[10px] font-semibold text-[var(--color-success)] ml-auto">Từ {formatCurrencyVnd(cheapestF.price)}</span>}
            </div>
            <div className="max-h-[220px] overflow-y-auto scrollbar-thin">
              {flights?.length > 0 ? flights.map(f => {
                const isHighlighted = highlightedIds?.has(`flight_${f.id}`)
                return (
                  <div key={f.id} onClick={() => goToFlight(f)}
                    className={`px-5 py-2.5 flex items-center justify-between hover:bg-[var(--color-border)]/20 transition-colors cursor-pointer ${
                      f.price === cheapestF?.price ? 'bg-[var(--color-success)]/5' : ''
                    } ${isHighlighted ? 'animate-pulse bg-emerald-500/5' : ''}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg shrink-0 ${airlineCodes[f.airlineCode] || 'bg-[var(--color-border)] text-[var(--color-text-tertiary)]'}`}>{f.airlineCode}</span>
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-[var(--color-text-primary)] block truncate">
                          {f.departureLocation} &rarr; {f.arrivalLocation}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)]">
                          {new Date(f.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - {new Date(f.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold shrink-0 ${f.price === cheapestF?.price ? 'text-[var(--color-success)]' : 'text-[var(--color-text-primary)]'}`}>
                      {formatCurrencyVnd(f.price)}
                    </span>
                  </div>
                )
              }) : (
                <div className="px-5 py-6 text-center text-sm text-[var(--color-text-tertiary)]">Không có chuyến bay</div>
              )}
            </div>
          </div>

          <div>
            <div className="px-5 py-2 flex items-center gap-2 bg-[var(--color-bg)]">
              <Bus className="w-3.5 h-3.5 text-primary-500" />
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">Xe khách ({buses?.length || 0})</span>
              {cheapestB && <span className="text-[10px] font-semibold text-[var(--color-success)] ml-auto">Từ {formatCurrencyVnd(cheapestB.price)}</span>}
            </div>
            <div className="max-h-[220px] overflow-y-auto scrollbar-thin">
              {buses?.length > 0 ? buses.map(b => {
                const isHighlighted = highlightedIds?.has(`bus_${b.id}`)
                return (
                  <div key={b.id} onClick={() => goToBus(b)}
                    className={`px-5 py-2.5 flex items-center justify-between hover:bg-[var(--color-border)]/20 transition-colors cursor-pointer ${
                      b.price === cheapestB?.price ? 'bg-[var(--color-success)]/5' : ''
                    } ${isHighlighted ? 'animate-pulse bg-emerald-500/5' : ''}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-lg shrink-0 bg-primary-500/10 text-primary-500">{b.busCode}</span>
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-[var(--color-text-primary)] block truncate">
                          {b.departureLocation} &rarr; {b.arrivalLocation}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)]">
                          {new Date(b.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - {new Date(b.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold shrink-0 ${b.price === cheapestB?.price ? 'text-[var(--color-success)]' : 'text-[var(--color-text-primary)]'}`}>
                      {formatCurrencyVnd(b.price)}
                    </span>
                  </div>
                )
              }) : (
                <div className="px-5 py-6 text-center text-sm text-[var(--color-text-tertiary)]">Không có xe khách</div>
              )}
            </div>
          </div>

          <div>
            <div className="px-5 py-2 flex items-center gap-2 bg-[var(--color-bg)]">
              <Train className="w-3.5 h-3.5 text-primary-500" />
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">Tàu hỏa ({trains?.length || 0})</span>
              {cheapestT && <span className="text-[10px] font-semibold text-[var(--color-success)] ml-auto">Từ {formatCurrencyVnd(cheapestT.price)}</span>}
            </div>
            <div className="max-h-[220px] overflow-y-auto scrollbar-thin">
              {trains?.length > 0 ? trains.map(t => {
                const isHighlighted = highlightedIds?.has(`train_${t.id}`)
                return (
                  <div key={t.id} onClick={() => goToTrain(t)}
                    className={`px-5 py-2.5 flex items-center justify-between hover:bg-[var(--color-border)]/20 transition-colors cursor-pointer ${
                      t.price === cheapestT?.price ? 'bg-[var(--color-success)]/5' : ''
                    } ${isHighlighted ? 'animate-pulse bg-emerald-500/5' : ''}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-lg shrink-0 bg-primary-500/10 text-primary-400">{t.trainCode}</span>
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-[var(--color-text-primary)] block truncate">
                          {t.departureLocation} &rarr; {t.arrivalLocation}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)]">
                          {new Date(t.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - {new Date(t.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold shrink-0 ${t.price === cheapestT?.price ? 'text-[var(--color-success)]' : 'text-[var(--color-text-primary)]'}`}>
                      {formatCurrencyVnd(t.price)}
                    </span>
                  </div>
                )
              }) : (
                <div className="px-5 py-6 text-center text-sm text-[var(--color-text-tertiary)]">Không có chuyến tàu</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const MODES = [
  { id: 'flight', label: 'Máy bay', icon: Plane },
  { id: 'bus', label: 'Xe khách', icon: Bus },
  { id: 'train', label: 'Tàu hỏa', icon: Train },
]

const modeLabel = (id) => MODES.find(m => m.id === id)?.label || 'Máy bay'

function ModeDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = MODES.find(m => m.id === value) || MODES[0]
  const Icon = current.icon

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] hover:border-primary-500/40 hover:text-primary-400 transition-all"
      >
        <Icon className="w-3.5 h-3.5 text-primary-500" />
        {current.label}
        <ChevronDown className={`w-3.5 h-3.5 text-[var(--color-text-tertiary)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 z-20 w-44 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden"
          >
            {MODES.map(m => {
              const MIcon = m.icon
              const active = m.id === value
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { onChange(m.id); setOpen(false) }}
                  className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-primary-500/10 text-primary-500'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/20'
                  }`}
                >
                  <MIcon className="w-3.5 h-3.5" />
                  {m.label}
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const TABS = [
  { id: 'results', label: 'Kết quả' },
  { id: 'trends', label: 'Xu hướng' },
  { id: 'tips', label: 'Mẹo & Xanh' },
]

export default function PriceComparison() {
  // Không đọc/persist localStorage — tab mới luôn bắt đầu với form trống
  const [query, setQuery] = useState({ from: '', to: '', date: '', tripType: 'one-way', returnDate: '', days: 7 })
  const [activeTab, setActiveTab] = useState('results')
  const [compareData, setCompareData] = useState(null)
  const [trendData, setTrendData] = useState([])
  const [trendMode, setTrendMode] = useState('flight') // 'flight' | 'train' | 'bus'
  const [prediction, setPrediction] = useState(null)
  const [compareLoading, setCompareLoading] = useState(false)
  const [trendLoading, setTrendLoading] = useState(false)
  const [compareError, setCompareError] = useState('')
  const [trendError, setTrendError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [realtimeEnabled, setRealtimeEnabled] = useState(true)
  const [nextTick, setNextTick] = useState(30)
  const debounceRef = useRef(null)
  const resetTimerRef = useRef(null)
  const { connected, isConnecting, lastUpdate, reconnectError } = usePriceStream(realtimeEnabled ? query.from : null, realtimeEnabled ? query.to : null)

  const handleSearch = () => fetchAll(query)

  const fetchCompare = useCallback(async (q) => {
    if (!q.from || !q.to) return
    setCompareLoading(true)
    setCompareError('')
    try {
      const params = { from: q.from, to: q.to, date: q.date || undefined }
      // Truyền email để backend áp dụng đúng quyền lợi gói (Free chỉ so sánh 1 hãng)
      const stored = (() => { try { return JSON.parse(sessionStorage.getItem('user')) } catch { return null } })()
      if (stored?.email) params.email = stored.email
      if (q.tripType === 'round-trip' && q.returnDate) {
        params.tripType = 'round-trip'
        params.returnDate = q.returnDate
      }
      const res = await compareRoutes(params)
      setCompareData(res.data)
      setCompareError('')
    } catch {
      setCompareData(null)
      setCompareError('Không thể tải dữ liệu so sánh. Vui lòng thử lại.')
    } finally { setCompareLoading(false) }
  }, [])

  const fetchTrends = useCallback(async (q, mode = trendMode) => {
    if (!q.from || !q.to) return
    setTrendLoading(true)
    setTrendError('')
    try {
      const res = await getPriceTrends({ from: q.from, to: q.to, days: q.days, mode })
      const mapped = res.data.map(d => ({
        ...d,
        date: d.date ? (typeof d.date === 'string' ? d.date.substring(0, 10) : d.date) : '',
        minPrice: Number(d.minPrice),
        maxPrice: Number(d.maxPrice),
        avgPrice: Number(d.avgPrice),
      }))
      setTrendData(mapped)
      setLastUpdated(new Date())
      setTrendError('')
    } catch {
      setTrendData([])
      setTrendError('Không thể tải dữ liệu xu hướng. Vui lòng thử lại.')
    } finally { setTrendLoading(false) }
  }, [trendMode])

  const changeTrendMode = (mode) => {
    setTrendMode(mode)
    setTrendData([]) // tránh hiển thị nhầm dữ liệu phương tiện cũ trong lúc tải
    fetchTrends(query, mode)
  }

  const fetchAll = useCallback(async (q) => {
    fetchCompare(q)
    fetchTrends(q)
    if (q.from && q.to) {
      predictPrice({ from: q.from, to: q.to, days: 7 })
        .then(r => setPrediction(r.data))
        .catch(() => setPrediction(null))
    }
    setActiveTab('results')
  }, [fetchCompare, fetchTrends])

  const handleChange = (key, value) => {
    const next = { ...query, [key]: value }
    if (key === 'tripType' && value === 'one-way') next.returnDate = ''
    setQuery(next)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchAll(next), 400)
  }

  useEffect(() => {
    if (query.from && query.to) {
      fetchAll(query)
    }
    return () => { clearTimeout(debounceRef.current) }
  }, [])

  // Reload dữ liệu khi tab được mở/chuyển tới (mở tab mới, chuyển tab, khôi phục từ bfcache)
  useRefetchOnTabVisible(() => {
    if (query.from && query.to) fetchAll(query)
  })

  useEffect(() => {
    if (!lastUpdate) return
    const today = new Date(lastUpdate.timestamp).toISOString().substring(0, 10)
    setTrendData(prev => {
      const idx = prev.findIndex(d => d.date === today)
      const entry = { date: today, minPrice: lastUpdate.minPrice, maxPrice: lastUpdate.maxPrice, avgPrice: lastUpdate.avgPrice }
      if (idx >= 0) {
        const next = [...prev]; next[idx] = entry; return next
      }
      return [...prev, entry]
    })
    setLastUpdated(new Date(lastUpdate.timestamp))
  }, [lastUpdate])

  useEffect(() => {
    if (!lastUpdated) return
    setNextTick(30)
    clearTimeout(resetTimerRef.current)
    resetTimerRef.current = setInterval(() => {
      setNextTick(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearTimeout(resetTimerRef.current)
  }, [lastUpdated])

  const chartData = useMemo(() => {
    if (!trendData.length) return []
    const base = trendData.map(d => ({ ...d, predictedPrice: null }))
    if (!prediction?.predictions?.length) return base
    const lastDate = trendData[trendData.length - 1]?.date
    const predItems = prediction.predictions.map(p => ({
      date: p.date,
      avgPrice: null,
      minPrice: null,
      maxPrice: null,
      predictedPrice: Number(p.predictedPrice),
    }))
    return [...base, ...predItems]
  }, [trendData, prediction])

  const trendStats = trendData.length > 0 ? {
    avg: trendData.reduce((s, d) => s + d.avgPrice, 0) / trendData.length,
    min: Math.min(...trendData.map(d => d.minPrice)),
    max: Math.max(...trendData.map(d => d.maxPrice)),
    first: trendData[0]?.avgPrice || 0,
    last: trendData[trendData.length - 1]?.avgPrice || 0,
  } : null
  const trend = trendStats ? (trendStats.last >= trendStats.first ? 'up' : 'down') : null
  const change = trendStats && trendStats.first > 0 ? Math.abs(((trendStats.last - trendStats.first) / trendStats.first) * 100) : 0

  const liveDelta = useMemo(() => {
    if (!lastUpdate || !trendStats?.avg || !trendStats.avg) return null
    const liveAvg = (lastUpdate.minPrice + lastUpdate.maxPrice + lastUpdate.avgPrice) / 3
    if (!liveAvg) return null
    return ((liveAvg - trendStats.avg) / trendStats.avg) * 100
  }, [lastUpdate, trendStats])

  const highlightedIds = useMemo(() => {
    if (!lastUpdate) return null
    const set = new Set()
    if (compareData?.outbound?.flights?.length) {
      const ids = compareData.outbound.flights.map(f => f.id)
      const match = compareData.outbound.flights.reduce((a, b) => a.price < b.price ? a : b)
      if (match) set.add(`flight_${match.id}`)
    }
    if (compareData?.returns?.flights?.length) {
      const match = compareData.returns.flights.reduce((a, b) => a.price < b.price ? a : b)
      if (match) set.add(`flight_${match.id}`)
    }
    if (compareData?.outbound?.trains?.length) {
      const match = compareData.outbound.trains.reduce((a, b) => a.price < b.price ? a : b)
      if (match) set.add(`train_${match.id}`)
    }
    if (compareData?.returns?.trains?.length) {
      const match = compareData.returns.trains.reduce((a, b) => a.price < b.price ? a : b)
      if (match) set.add(`train_${match.id}`)
    }
    if (compareData?.outbound?.buses?.length) {
      const match = compareData.outbound.buses.reduce((a, b) => a.price < b.price ? a : b)
      if (match) set.add(`bus_${match.id}`)
    }
    if (compareData?.returns?.buses?.length) {
      const match = compareData.returns.buses.reduce((a, b) => a.price < b.price ? a : b)
      if (match) set.add(`bus_${match.id}`)
    }
    return set.size ? set : null
  }, [lastUpdate, compareData])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
      className="max-w-7xl mx-auto px-4 py-6 md:py-8"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)]">So sánh giá vé</h1>
              <p className="text-sm text-[var(--color-text-secondary)]">Tổng hợp & so sánh giá vé máy bay, xe khách, tàu hỏa theo thời gian thực</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-[11px] font-semibold text-[var(--color-text-tertiary)]">Cập nhật TT</span>
            <button
              type="button"
              role="switch"
              aria-checked={realtimeEnabled}
              onClick={() => setRealtimeEnabled(v => !v)}
              className={`relative h-5 w-9 rounded-full transition-colors ${realtimeEnabled ? 'bg-primary-500' : 'bg-[var(--color-border)]'}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${realtimeEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </label>
          <LiveIndicator
            connected={connected}
            lastUpdated={lastUpdated}
            isConnecting={isConnecting}
            waiting={realtimeEnabled && !(query.from && query.to)}
            reconnectError={reconnectError}
            nextUpdateIn={realtimeEnabled ? nextTick : null}
          />
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 mb-6 shadow-sm">
        <div className="flex items-end gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Điểm đi</label>
            <LocationInput
              placeholder="Từ (VD: HAN)"
              value={query.from}
              onChange={v => handleChange('from', v)}
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Điểm đến</label>
            <LocationInput
              placeholder="Đến (VD: SGN)"
              value={query.to}
              onChange={v => handleChange('to', v)}
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">
              {query.tripType === 'round-trip' ? 'Ngày đi' : 'Ngày'}
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none" />
              <input
                className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 h-[42px] text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                type="date"
                value={query.date}
                onChange={e => handleChange('date', e.target.value)}
              />
            </div>
          </div>
          <AnimatePresence initial={false}>
            {query.tripType === 'round-trip' && (
              <motion.div
                initial={{ opacity: 0, width: 0, overflow: 'hidden' }}
                animate={{ opacity: 1, width: 'auto', overflow: 'visible' }}
                exit={{ opacity: 0, width: 0, overflow: 'hidden' }}
                transition={{ duration: 0.25 }}
                className="min-w-[150px]"
              >
                <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Ngày về</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none" />
                  <input
                    className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 h-[42px] text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                    type="date"
                    value={query.returnDate}
                    onChange={e => handleChange('returnDate', e.target.value)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div>
            <label className="block text-xs font-medium text-transparent mb-1.5 select-none">·</label>
            <div className="flex items-center gap-1 bg-[var(--color-border)]/30 rounded-lg p-0.5 h-[42px]">
              <button
                onClick={() => handleChange('tripType', 'one-way')}
                className={`px-3 text-xs font-semibold rounded-md border transition-all h-full flex items-center ${
                  query.tripType === 'one-way'
                    ? 'bg-primary-500 text-white shadow-sm border-transparent'
                    : 'bg-transparent border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Một chiều
              </button>
              <button
                onClick={() => handleChange('tripType', 'round-trip')}
                className={`px-3 text-xs font-semibold rounded-md border transition-all h-full flex items-center ${
                  query.tripType === 'round-trip'
                    ? 'bg-primary-500 text-white shadow-sm border-transparent'
                    : 'bg-transparent border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Khứ hồi
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-transparent mb-1.5 select-none">·</label>
            <motion.button
              onClick={handleSearch}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 h-[42px] rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md shadow-primary-500/20"
            >
              <Search className="w-4 h-4" />
              So sánh
            </motion.button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {popularPairs.map((p, i) => (
              <button
                key={i}
                onClick={() => { handleChange('from', p.from); handleChange('to', p.to) }}
                className="text-xs px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:border-primary-500/40 hover:text-primary-400 hover:bg-primary-500/5 transition-all"
              >
                {p.from} &rarr; {p.to}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-tertiary)]">Khoảng:</span>
            <div className="flex items-center gap-1 bg-[var(--color-border)]/30 rounded-lg p-0.5">
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => handleChange('days', d)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    query.days === d
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {d} ngày
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Global loading */}
      {compareLoading && trendLoading && !compareData && trendData.length === 0 && (
        <div className="space-y-4 animate-pulse">
          <div className="h-12 bg-[var(--color-border)] rounded-xl w-1/3" />
          <div className="grid md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-[var(--color-border)] rounded-xl" />)}
          </div>
        </div>
      )}

      {(compareError || trendError) && !compareLoading && !trendLoading && !compareData && trendData.length === 0 && (
        <div className="flex flex-col items-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-[var(--color-danger)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">{compareError || trendError}</p>
          <button onClick={handleSearch} className="mt-3 text-sm text-primary-500 font-semibold hover:underline">Thử lại</button>
        </div>
      )}

      {!compareLoading && !trendLoading && !compareData && trendData.length === 0 && !compareError && !trendError && (
        <div className="flex flex-col items-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center mb-4">
            <BarChart4 className="w-7 h-7 text-[var(--color-text-tertiary)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Nhập điểm đi, điểm đến để so sánh</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">Kết quả so sánh giá & xu hướng sẽ tự động cập nhật sau khi nhập</p>
        </div>
      )}

      {!compareLoading && compareData && (
        <>

          {/* Tabs */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden mb-6">
            <div className="flex border-b border-[var(--color-border)] bg-[var(--color-bg)]">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 md:flex-none md:px-6 px-3 py-3 text-sm font-semibold transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-primary-500'
                      : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.span layoutId="compareTabIndicator" className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-primary-500" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-4 md:p-5">
              <AnimatePresence mode="wait">
                {activeTab === 'results' && (
                  <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                    {query.tripType === 'round-trip' && compareData.outbound && compareData.returns ? (
                      <>
                        <CompareSection
                          label="Chiều đi"
                          icon={ArrowRight}
                          accent="bg-gradient-to-r from-primary-500 to-primary-600"
                          flights={compareData.outbound.flights}
                          trains={compareData.outbound.trains}
                          buses={compareData.outbound.buses}
                          liveCountdown={realtimeEnabled ? nextTick : null}
                          highlightedIds={highlightedIds}
                          searchParams={query}
                        />
                        <CompareSection
                          label="Chiều về"
                          icon={ArrowLeft}
                          accent="bg-gradient-to-r from-primary-500 to-primary-600"
                          flights={compareData.returns.flights}
                          trains={compareData.returns.trains}
                          buses={compareData.returns.buses}
                          liveCountdown={realtimeEnabled ? nextTick : null}
                          highlightedIds={highlightedIds}
                          searchParams={query}
                        />
                      </>
                    ) : compareData.flights || compareData.trains || compareData.buses ? (
                      <CompareSection
                        label="So sánh giá vé"
                        icon={BarChart4}
                        accent="bg-gradient-to-r from-primary-500 to-primary-600"
                        flights={compareData.flights}
                        trains={compareData.trains}
                        buses={compareData.buses}
                        liveCountdown={realtimeEnabled ? nextTick : null}
                        highlightedIds={highlightedIds}
                        searchParams={query}
                      />
                    ) : null}
                  </motion.div>
                )}

                {activeTab === 'trends' && trendData.length > 0 && (
                  <motion.div key={`trends-${trendMode}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary-500" />
                        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Xu hướng giá</h2>
                        <span className="text-xs text-[var(--color-text-tertiary)] font-mono">
                          {query.from} → {query.to}
                        </span>
                      </div>
                      <div className="ml-auto">
                        <ModeDropdown value={trendMode} onChange={changeTrendMode} />
                      </div>
                    </div>
                    <p className="text-xs text-[var(--color-text-tertiary)] -mt-2 mb-4">
                      Đang xem xu hướng giá <span className="font-semibold text-[var(--color-text-primary)]">
                        {modeLabel(trendMode).toLowerCase()}
                      </span> trên tuyến {query.from} → {query.to} — {query.days} ngày gần nhất
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                      {[
                        { label: 'Xu hướng', value: trend === 'up' ? `↑ +${change.toFixed(1)}%` : trend === 'down' ? `↓ -${change.toFixed(1)}%` : `→ ~${change.toFixed(1)}%`, colorClass: trend === 'up' ? 'text-red-400 bg-red-400/10 border-red-400/20' : trend === 'down' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-[var(--color-text-tertiary)] bg-[var(--color-bg)] border-[var(--color-border)]' },
                        { label: 'Giá thấp nhất', value: formatCurrencyVnd(trendStats?.min), colorClass: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
                        { label: 'Giá cao nhất', value: formatCurrencyVnd(trendStats?.max), colorClass: 'text-red-400 bg-red-400/10 border-red-400/20' },
                        { label: 'Trung bình', value: formatCurrencyVnd(trendStats?.avg), colorClass: 'text-primary-400 bg-primary-500/10 border-primary-500/20' },
                      ].map((stat, i) => (
                        <div key={i} className={`rounded-xl p-3 border ${stat.colorClass}`}>
                          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-80">{stat.label}</div>
                          <div className="text-sm font-black truncate">{stat.value}</div>
                        </div>
                      ))}
                    </div>

                    {lastUpdate && trendStats?.avg > 0 && (() => {
                      const liveDelta = ((lastUpdate.avgPrice - trendStats.avg) / trendStats.avg) * 100
                      const isGood = liveDelta <= -5
                      const isBad = liveDelta >= 5
                      const note = isGood ? `Hôm nay thấp hơn TB ${Math.abs(liveDelta).toFixed(1)}% — giá tốt` : isBad ? `Hôm nay cao hơn TB ${liveDelta.toFixed(1)}% — nên chờ` : 'Giá hôm nay gần bằng trung bình gần đây'
                      const cls = isGood ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : isBad ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-[var(--color-text-secondary)] bg-[var(--color-bg)] border-[var(--color-border)]'
                      return (
                        <div className={`mb-4 px-4 py-3 rounded-xl border text-xs font-semibold ${cls}`}>
                          {note}
                        </div>
                      )
                    })()}

                    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
                      <h3 className="font-semibold text-[var(--color-text-primary)] mb-0.5 flex items-center gap-2">
                        <AreaChart className="w-4 h-4" />
                        Biểu đồ xu hướng giá
                      </h3>
                      <p className="text-xs text-[var(--color-text-tertiary)] mb-4">Giá trung bình {query.days} ngày · Cập nhật realtime</p>
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="avgGradientTrend" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                          <XAxis
                            dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                            tickFormatter={(v) => { if (!v) return ''; const p = v.split('-'); return p.length >= 3 ? `${p[2]}/${p[1]}` : v }}
                          />
                          <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} tickFormatter={(v) => formatCurrencyVnd(v)} />
                          <Tooltip content={<TrendTooltip />} />
                          <Line type="monotone" dataKey="avgPrice" stroke="var(--color-chart-1)" strokeWidth={2.5}
                            dot={{ r: 3, fill: 'var(--color-chart-1)' }} activeDot={{ r: 5 }}
                            fill="url(#avgGradientTrend)" />
                          {prediction && (
                            <Line type="monotone" dataKey="predictedPrice" stroke="var(--color-chart-2)" strokeWidth={2}
                              strokeDasharray="6 3" dot={{ r: 3, fill: 'var(--color-chart-2)' }} name="Dự báo" />
                          )}
                          {lastUpdate && (() => {
                            const todayStr = new Date(lastUpdate.timestamp).toISOString().substring(0, 10)
                            const row = chartData.find(d => d.date === todayStr)
                            if (!row) return null
                            return (
                              <Line
                                type="monotone" dataKey="avgPrice" stroke="transparent" strokeWidth={0}
                                dot={{ r: 6, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
                                activeDot={{ r: 8, fill: '#22c55e' }}
                                data={[row]} name="Realtime" />
                            )
                          })()}
                        </AreaChart>
                      </ResponsiveContainer>
                      <p className="text-[11px] text-[var(--color-text-tertiary)] mt-2">Chấm xanh lá = cập nhật realtime gần nhất</p>
                    </div>

                    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm mt-6">
                      <div className="px-5 py-3.5 border-b border-[var(--color-border)]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary-500" />
                            <h3 className="font-semibold text-[var(--color-text-primary)] text-sm">
                              Giá vé theo ngày — {modeLabel(trendMode)}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[var(--color-text-tertiary)]">{trendData.length} ngày</span>
                            <ModeDropdown value={trendMode} onChange={changeTrendMode} />
                          </div>
                        </div>
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                          Giá thấp nhất / trung bình / cao nhất của{' '}
                          <span className="font-medium text-[var(--color-text-secondary)]">
                            {modeLabel(trendMode).toLowerCase()}
                          </span>{' '}
                          trên tuyến {query.from} → {query.to} theo từng ngày · Cột "Biến động" = % thay đổi so với ngày liền trước
                        </p>
                      </div>
                      <div className="overflow-x-auto max-h-[300px] overflow-y-auto scrollbar-thin">
                        {/* Desktop table */}
                        <table className="hidden sm:table w-full text-sm">
                          <thead className="bg-[var(--color-bg)] sticky top-0">
                            <tr>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">Ngày</th>
                              <th className="px-4 py-2.5 text-right text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">Thấp nhất</th>
                              <th className="px-4 py-2.5 text-right text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">Trung bình</th>
                              <th className="px-4 py-2.5 text-right text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">Cao nhất</th>
                              <th className="px-4 py-2.5 text-right text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">Biến động</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-border)]">
                            {[...trendData].reverse().map((d, i) => {
                              const prev = i < trendData.length - 1 ? trendData[trendData.length - 2 - i] : null
                              const change = prev ? ((d.avgPrice - prev.avgPrice) / prev.avgPrice * 100) : 0
                              return (
                                <tr key={i} className="hover:bg-[var(--color-border)]/20 transition-colors">
                                  <td className="px-4 py-2.5 text-[var(--color-text-primary)] font-medium">{d.date}</td>
                                  <td className="px-4 py-2.5 text-right text-[var(--color-success)] font-semibold">{formatCurrencyVnd(d.minPrice)}</td>
                                  <td className="px-4 py-2.5 text-right text-primary-400 font-semibold">{formatCurrencyVnd(d.avgPrice)}</td>
                                  <td className="px-4 py-2.5 text-right text-primary-400 font-semibold">{formatCurrencyVnd(d.maxPrice)}</td>
                                  <td className={`px-4 py-2.5 text-right font-semibold ${
                                    change > 0 ? 'text-[var(--color-danger)]' : change < 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-text-tertiary)]'
                                  }`}>
                                    {change !== 0 ? (
                                      <span className="flex items-center justify-end gap-0.5">
                                        {change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                        {Math.abs(change).toFixed(1)}%
                                      </span>
                                    ) : '—'}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                        {/* Mobile cards */}
                        <div className="sm:hidden space-y-2">
                          {[...trendData].reverse().map((d, i) => {
                            const prev = i < trendData.length - 1 ? trendData[trendData.length - 2 - i] : null
                            const change = prev ? ((d.avgPrice - prev.avgPrice) / prev.avgPrice * 100) : 0
                            const changeColor = change > 0 ? 'text-[var(--color-danger)]' : change < 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-text-tertiary)]'
                            return (
                              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                                <div className="flex flex-col gap-0.5 min-w-0">
                                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">{d.date}</span>
                                  <div className="flex items-center gap-2 text-[11px]">
                                    <span className="text-[var(--color-success)]">{formatCurrencyVnd(d.minPrice)}</span>
                                    <span className="text-primary-400">~{formatCurrencyVnd(d.avgPrice)}</span>
                                    <span className="text-primary-400">{formatCurrencyVnd(d.maxPrice)}</span>
                                  </div>
                                </div>
                                <span className={`shrink-0 text-xs font-semibold flex items-center gap-0.5 ${changeColor}`}>
                                  {change !== 0 ? <>{change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}{Math.abs(change).toFixed(1)}%</> : '—'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'trends' && (!trendData.length) && (
                  <motion.div key={`trends-empty-${trendMode}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="py-12 text-center">
                    {trendLoading ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-[var(--color-text-tertiary)]">Đang tải xu hướng giá...</p>
                      </div>
                    ) : trendError ? (
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-sm text-[var(--color-danger)]">{trendError}</p>
                        <button onClick={() => fetchTrends(query, trendMode)} className="text-sm text-primary-500 font-semibold hover:underline">Thử lại</button>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-text-tertiary)]">Chưa có dữ liệu xu hướng cho tuyến này.</p>
                    )}
                  </motion.div>
                )}

                {activeTab === 'tips' && (
                  <motion.div key="tips" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CarbonBadge from={query.from} to={query.to} detailed />
                    <CommunityTips from={query.from} to={query.to} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}

    </motion.div>
  )
}
