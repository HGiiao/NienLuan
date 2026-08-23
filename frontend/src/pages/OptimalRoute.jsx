import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Route as RouteIcon, Plane, Train, Bus, MapPin, CalendarDays,
  DollarSign, TrendingUp, TrendingDown, Lightbulb, Bell, BellOff,
  Trash2, Target, ArrowRight, AlertCircle, Check, Loader, Ticket, Clock,
} from 'lucide-react'
import LocationInput from '../components/LocationInput'
import { getOptimalRoute, getOptimalRoundTrip, getPriceAlerts, deletePriceAlert, togglePriceAlert, checkPriceAlerts } from '../services/api'
import useRefetchOnTabVisible from '../hooks/useRefetchOnTabVisible'
import { formatCurrencyVnd } from '../utils/formatters'
import { getLastSearch } from '../utils/searchHistory'
import { useUser } from '@clerk/clerk-react'

const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60); const m = Math.round(minutes % 60)
  return `${h} giờ ${m} phút`
}
const formatTime = (dateStr) => {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
}
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

const popularRoutes = [
  { origin: 'HAN', dest: 'SGN' }, { origin: 'HAN', dest: 'DAD' },
  { origin: 'SGN', dest: 'HAN' }, { origin: 'SGN', dest: 'DAD' },
  { origin: 'HAN', dest: 'CXR' }, { origin: 'DAD', dest: 'SGN' },
]

const cityNames = {
  HAN: 'Hà Nội', SGN: 'TP. HCM', DAD: 'Đà Nẵng',
  CXR: 'Nha Trang', PQC: 'Phú Quốc', HUI: 'Huế',
}
function cityName(code) { return cityNames[code] || code }

const TABS = [
  { id: 'route', label: 'Lộ trình tối ưu' },
  { id: 'alerts', label: 'Cảnh báo giá' },
]

function LiveIndicator({ connected = true }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
      connected
        ? 'bg-emerald-500/10 border-emerald-500/20'
        : 'bg-red-500/10 border-red-500/20'
    }`}>
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
          connected ? 'bg-emerald-400' : 'bg-red-400'
        }`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${
          connected ? 'bg-emerald-500' : 'bg-red-500'
        }`} />
      </span>
      <span className={`text-[11px] font-semibold ${
        connected ? 'text-emerald-500' : 'text-red-500'
      }`}>{connected ? 'Thời gian thực' : 'Mất kết nối'}</span>
    </div>
  )
}

function SegmentTimeline({ segments, onBook }) {
  return (
    <div className="relative">
      <div className="absolute left-[18px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-primary-400 via-primary-400 to-primary-400 rounded-full opacity-30" />
      {segments.map((seg, j) => {
        const prevSeg = j > 0 ? segments[j - 1] : null
        const transferTime = prevSeg ? (new Date(seg.departureTime) - new Date(prevSeg.arrivalTime)) / 60000 : 0
        return (
          <div key={j}
            onClick={seg.id != null ? () => onBook?.({ ...seg, type: seg.type }) : undefined}
            className={`relative flex gap-4 pb-5 last:pb-0 ${seg.id != null ? 'cursor-pointer rounded-lg -mx-1 px-1 transition-colors hover:bg-[var(--color-border)]/20' : ''}`}
          >
            <div className="relative z-10 mt-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shadow-sm bg-primary-500 text-white">
                {seg.type === 'flight' ? <Plane className="w-4 h-4" /> : seg.type === 'bus' ? <Bus className="w-4 h-4" /> : <Train className="w-4 h-4" />}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              {prevSeg && transferTime > 0 && (
                <div className="flex items-center gap-2 mb-2.5 text-xs text-[var(--color-text-tertiary)]">
                  <span className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
                  Chờ {formatDuration(transferTime)} tại {prevSeg.arrivalLocation}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary-500 text-white">
                  {seg.type === 'flight' ? <Plane className="w-3 h-3 inline" /> : seg.type === 'bus' ? <Bus className="w-3 h-3 inline" /> : <Train className="w-3 h-3 inline" />} {seg.code}
                </span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{seg.name}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                <span className="text-sm font-semibold text-primary-400">{seg.departureLocation}</span>
                <span className="text-xs text-[var(--color-text-tertiary)]">{formatTime(seg.departureTime)}</span>
                {formatDate(seg.departureTime) && <span className="text-xs text-[var(--color-text-tertiary)]">({formatDate(seg.departureTime)})</span>}
                <span className="text-[var(--color-border)] text-sm">&rarr;</span>
                <span className="text-sm font-semibold text-primary-400">{seg.arrivalLocation}</span>
                <span className="text-xs text-[var(--color-text-tertiary)]">{formatTime(seg.arrivalTime)}</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {(() => { const diff = (new Date(seg.arrivalTime) - new Date(seg.departureTime)) / 60000; return formatDuration(diff) })()}
                </span>
                <span className="text-xs font-bold text-primary-400 ml-auto">{formatCurrencyVnd(seg.price)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const modeName = (type) => type === 'flight' ? 'Máy bay' : type === 'bus' ? 'Xe khách' : 'Tàu hỏa'
const modesSummary = (segments) => [...new Set(segments.map(s => s.type))].map(modeName).join(' + ')

function RoundTripCard({ combo, index, onBook, onBookRoundTrip }) {
  const outbound = combo.outbound?.segments || []
  const returnex = combo.return?.segments || []
  const segCount = outbound.length + returnex.length
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.08 }}
      className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] hover:shadow-lg transition-all overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, delay: index * 0.08 }}
            className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold text-white ${index === 0 ? 'bg-primary-500 shadow-lg shadow-primary-500/20' : 'bg-primary-500'}`}>{index + 1}</motion.span>
          <div>
            <span className="font-semibold text-[var(--color-text-primary)]">Khứ hồi</span>
            <span className="text-xs text-[var(--color-text-tertiary)] ml-2 block md:inline">Đi: <strong className="text-primary-400">{modesSummary(outbound)}</strong> · Về: <strong className="text-primary-400">{modesSummary(returnex)}</strong></span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-primary-500">{formatCurrencyVnd(combo.totalPrice)}</div>
          <div className="text-xs text-[var(--color-text-tertiary)]">{formatDuration(combo.totalDurationMinutes)}</div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        <div className="rounded-xl border border-[var(--color-border)] p-3.5 bg-[var(--color-bg)]/60">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRight className="w-4 h-4 text-primary-500 rotate-[-45deg]" />
            <span className="text-xs font-bold text-primary-500 uppercase tracking-wider">Chiều đi</span>
            <span className="text-xs text-[var(--color-text-secondary)]">{outbound[0]?.departureLocation} &rarr; {outbound[outbound.length - 1]?.arrivalLocation}</span>
            <span className="ml-auto text-xs font-bold text-primary-400">{formatCurrencyVnd(outbound.reduce((s, seg) => s + Number(seg.price || 0), 0))}</span>
          </div>
          <SegmentTimeline segments={outbound} onBook={onBook} />
        </div>
        <div className="rounded-xl border border-[var(--color-border)] p-3.5 bg-[var(--color-bg)]/60">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRight className="w-4 h-4 text-accent-500" />
            <span className="text-xs font-bold text-accent-500 uppercase tracking-wider">Chiều về</span>
            <span className="text-xs text-[var(--color-text-secondary)]">{returnex[0]?.departureLocation} &rarr; {returnex[returnex.length - 1]?.arrivalLocation}</span>
            <span className="ml-auto text-xs font-bold text-primary-400">{formatCurrencyVnd(returnex.reduce((s, seg) => s + Number(seg.price || 0), 0))}</span>
          </div>
          <SegmentTimeline segments={returnex} onBook={onBook} />
        </div>
      </div>

      {onBookRoundTrip && (
        <div className="px-5 pb-4 pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-text-tertiary)]">
            Mua <span className="font-bold text-[var(--color-text-primary)]">{segCount} vé</span> 2 chiều cùng lúc trong 1 lần đặt
          </p>
          <button
            type="button"
            onClick={() => onBookRoundTrip(combo)}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md"
          >
            <Ticket className="w-4 h-4" />
            Đặt cả khứ hồi — {formatCurrencyVnd(combo.totalPrice)}
          </button>
        </div>
      )}
    </motion.div>
  )
}

function RouteTab({ form, setForm, handleSearch, routes, combos, loading, routeError, directCheapest, onBook, onBookRoute, onBookRoundTrip }) {
  const isRoundTrip = form.tripType === 'round-trip'
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-12 bg-[var(--color-border)] rounded-xl w-1/3" />
          <div className="grid md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-[var(--color-border)] rounded-xl" />)}
          </div>
        </div>
      )}

      {isRoundTrip && combos.length > 0 && !loading && (
        <>
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-primary-500/10 to-primary-500/5 border border-primary-500/20 rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Lightbulb className="w-5 h-5 text-primary-500" />
              <span className="text-sm text-[var(--color-text-secondary)]">
                Tìm thấy <strong className="text-primary-400">{combos.length}</strong> combo khứ hồi {form.originCity} &rarr; {form.destinationCity}
              </span>
            </div>
          </motion.div>

          <div className="space-y-5">
            {combos.map((combo, i) => (
              <RoundTripCard key={i} combo={combo} index={i} onBook={onBook} onBookRoundTrip={onBookRoundTrip} />
            ))}
          </div>
        </>
      )}

      {!isRoundTrip && routes.length > 0 && !loading && (
        <>
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-primary-500/10 to-primary-500/5 border border-primary-500/20 rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Lightbulb className="w-5 h-5 text-primary-500" />
              <span className="text-sm text-[var(--color-text-secondary)]">
                Tìm thấy <strong className="text-primary-400">{routes.length}</strong> lộ trình cho {form.originCity} &rarr; {form.destinationCity}
                {directCheapest && <span className="ml-2">| Trực tiếp rẻ nhất: <strong className="text-[var(--color-success)]">{formatCurrencyVnd(directCheapest.totalPrice)}</strong></span>}
              </span>
            </div>
            {routes[0]?.label !== 'direct' && directCheapest && (() => {
              const saving = directCheapest.totalPrice - routes[0].totalPrice
              return saving > 0 ? (
                <span className="text-sm font-semibold text-[var(--color-success)]">
                  Tiết kiệm {formatCurrencyVnd(saving)} so với vé trực tiếp
                </span>
              ) : null
            })()}
          </motion.div>

          <div className="space-y-5">
            {routes.map((route, i) => {
              const segments = route.segments || []
              const isMultiLeg = segments.length > 1
              const savings = directCheapest && isMultiLeg ? directCheapest.totalPrice - route.totalPrice : 0
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] hover:shadow-lg transition-all overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-3">
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, delay: i * 0.08 }}
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold text-white ${i === 0 ? 'bg-primary-500 shadow-lg shadow-primary-500/20' : 'bg-primary-500'}`}>{i + 1}</motion.span>
              <div>
                <span className="font-semibold text-[var(--color-text-primary)]">{isMultiLeg ? 'Lộ trình kết hợp' : segments[0]?.type === 'flight' ? 'Bay thẳng' : 'Đi thẳng'}</span>
                {route.label !== 'direct' && <span className="text-xs text-[var(--color-text-tertiary)] ml-2">({route.label})</span>}
              </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {savings > 0 && <span className="text-xs font-bold text-white bg-[var(--color-success)] px-2.5 py-1 rounded-lg">-{formatCurrencyVnd(savings)}</span>}
                      <div className="text-right">
                        <div className="text-xl font-bold text-primary-500">{formatCurrencyVnd(route.totalPrice)}</div>
                        <div className="text-xs text-[var(--color-text-tertiary)]">{formatDuration(route.totalDurationMinutes)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-4">
                    <SegmentTimeline segments={segments} onBook={onBook} />

                    {isMultiLeg && onBookRoute && (
                      <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          Mua <span className="font-bold text-[var(--color-text-primary)]">{segments.length} vé</span> cùng lúc trong 1 lần đặt
                        </p>
                        <button
                          type="button"
                          onClick={() => onBookRoute(route)}
                          className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md"
                        >
                          <Ticket className="w-4 h-4" />
                          Đặt cả lộ trình — {formatCurrencyVnd(route.totalPrice)}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </>
      )}

      {routeError && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm font-semibold text-[var(--color-danger)]">{routeError}</p>
          <button onClick={handleSearch} className="text-sm text-primary-500 font-semibold hover:underline">Thử lại</button>
        </div>
      )}

      {!loading && (isRoundTrip ? combos.length === 0 : routes.length === 0) && !routeError && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center mb-4">
            <MapPin className="w-7 h-7 text-[var(--color-text-tertiary)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Nhập thông tin để tìm lộ trình tối ưu</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">Hệ thống sẽ gợi ý lộ trình kết hợp máy bay, xe khách và tàu hỏa tiết kiệm nhất</p>
        </motion.div>
      )}
    </motion.div>
  )
}

function AlertsTab() {
  const navigate = useNavigate()
  const { isSignedIn, user: clerkUser } = useUser()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkedResult, setCheckedResult] = useState(null)
  const [checking, setChecking] = useState(false)

  const stored = (() => { try { return JSON.parse(sessionStorage.getItem('user')) } catch { return null } })()
  const email = stored?.email || clerkUser?.primaryEmailAddress?.emailAddress || ''
  const isAuthed = !!email

  const loadAlerts = useCallback(async () => {
    if (!email) { setLoading(false); return }
    try {
      const res = await getPriceAlerts(email)
      setAlerts(res.data)
    } catch { setError('Không thể tải danh sách cảnh báo') }
    finally { setLoading(false) }
  }, [email])

  useEffect(() => {
    if (!isAuthed) { navigate('/auth'); return }
    loadAlerts()
  }, [isAuthed, loadAlerts, navigate])

  // Reload danh sách cảnh báo khi tab được mở/chuyển tới
  useRefetchOnTabVisible(loadAlerts)

  const handleDelete = async (id) => {
    try {
      await deletePriceAlert(id)
      setAlerts(prev => prev.filter(a => a.id !== id))
    } catch { setError('Xóa thất bại') }
  }

  const handleToggle = async (id) => {
    try {
      await togglePriceAlert(id)
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a))
    } catch { setError('Thay đổi thất bại') }
  }

  const handleCheck = async () => {
    setChecking(true)
    setCheckedResult(null)
    try {
      const res = await checkPriceAlerts(email)
      setCheckedResult(res.data)
      loadAlerts()
    } catch { setError('Kiểm tra thất bại') }
    finally { setChecking(false) }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Các vé bạn bấm <Bell className="w-3.5 h-3.5 inline text-primary-500" /> <span className="font-semibold">Theo dõi</span> ở trang tìm kiếm sẽ hiện tại đây — nhận thông báo ngay khi giá giảm xuống mức mong muốn
        </p>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/10 px-4 py-3 rounded-xl mb-6">
          <AlertCircle className="w-4 h-4" /><span>{error}</span>
        </motion.div>
      )}

      {checkedResult && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl mb-6 ${
          checkedResult.triggered?.length > 0
            ? 'text-[var(--color-success)] bg-[var(--color-success)]/10'
            : 'text-[var(--color-text-secondary)] bg-[var(--color-bg)]'
        }`}>
          <Bell className="w-4 h-4" />
          <span>
            {checkedResult.triggered?.length > 0
              ? `Có ${checkedResult.triggered.length} cảnh báo được kích hoạt! Giá đã giảm xuống mức mục tiêu.`
              : 'Không có cảnh báo nào được kích hoạt.'}
          </span>
        </motion.div>
      )}


      {alerts.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-[var(--color-text-tertiary)] font-medium">{alerts.length} cảnh báo</p>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleCheck}
            className="flex items-center gap-2 border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:bg-[var(--color-border)]/40 text-[var(--color-text-primary)] px-4 h-[40px] rounded-xl font-semibold transition-all text-sm">
            {checking ? <Loader className="w-4 h-4 animate-spin" /> : <TrendingDown className="w-4 h-4" />}
            Kiểm tra giá
          </motion.button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-[var(--color-border)] rounded-xl" />)}
        </div>
      ) : alerts.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center mb-4">
            <Bell className="w-7 h-7 text-[var(--color-text-tertiary)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Chưa có cảnh báo nào</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">Bấm nút Theo dõi trên bất kỳ vé nào ở trang tìm kiếm để theo dõi giá tại đây</p>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {alerts.map((alert) => {
            const reached = alert.currentPrice != null && Number(alert.currentPrice) <= Number(alert.targetPrice)
            const delta = alert.currentPrice != null && Number(alert.targetPrice) > 0
              ? ((Number(alert.currentPrice) - Number(alert.targetPrice)) / Number(alert.targetPrice)) * 100 : null
            return (
              <motion.div key={alert.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] px-5 py-4 hover:shadow-md transition-all">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Icon + tuyến + trạng thái */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center ${
                      alert.notifiedAt
                        ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
                        : alert.isActive
                          ? 'bg-primary-500/10 text-primary-500'
                          : 'bg-[var(--color-bg)] text-[var(--color-text-tertiary)]'
                    }`}>
                      {alert.notifiedAt ? <Check className="w-5 h-5" /> : alert.isActive ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[var(--color-text-primary)] text-sm">
                          {cityName(alert.routeFrom)} → {cityName(alert.routeTo)}
                        </p>
                        {!alert.notifiedAt && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${alert.isActive ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-border)]/40 text-[var(--color-text-tertiary)]'}`}>
                            {alert.isActive ? 'Đang bật' : 'Tạm tắt'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-1 flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />Tạo lúc {new Date(alert.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                        <span>Thông báo khi giá ≤ <strong className="text-primary-500">{formatCurrencyVnd(alert.targetPrice)}</strong></span>
                      </p>
                      {alert.notifiedAt && (
                        <p className="text-xs text-[var(--color-success)] mt-1 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          Giá đã đạt mục tiêu lúc {new Date(alert.notifiedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Thống kê: mục tiêu / hiện tại / chênh lệch — giống trang Hồ sơ */}
                  <div className="grid grid-cols-3 gap-2 md:gap-3 shrink-0 md:w-auto md:min-w-[250px]">
                    <div className="text-left md:text-right">
                      <p className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)] flex items-center gap-1 md:justify-end"><Target className="w-3 h-3" />Mục tiêu</p>
                      <p className="text-sm font-bold text-primary-500">{formatCurrencyVnd(alert.targetPrice)}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)]">Giá hiện tại</p>
                      {alert.currentPrice != null ? (
                        <p className={`text-sm font-bold ${reached ? 'text-[var(--color-success)]' : 'text-[var(--color-text-primary)]'}`}>{formatCurrencyVnd(alert.currentPrice)}</p>
                      ) : (
                        <p className="text-sm text-[var(--color-text-tertiary)]">—</p>
                      )}
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-[10px] uppercase font-semibold text-[var(--color-text-tertiary)]">Chênh lệch</p>
                      {delta != null ? (
                        <p className={`text-sm font-bold ${reached ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                          {reached ? 'Đạt mục tiêu' : `+${delta.toFixed(1)}%`}
                        </p>
                      ) : <p className="text-sm text-[var(--color-text-tertiary)]">—</p>}
                    </div>
                  </div>

                  {/* Hành động */}
                  <div className="flex items-center gap-1 shrink-0 self-end md:self-center">
                    {!alert.notifiedAt && (
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleToggle(alert.id)}
                        className="p-2 rounded-xl text-[var(--color-text-tertiary)] hover:text-primary-400 hover:bg-primary-500/10 transition-colors" title={alert.isActive ? 'Tạm dừng theo dõi tuyến này' : 'Tiếp tục theo dõi tuyến này'}>
                        {alert.isActive ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                      </motion.button>
                    )}
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleDelete(alert.id)}
                      className="p-2 rounded-xl text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors" title="Xóa cảnh báo">
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {!isSignedIn && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 p-4 bg-primary-500/5 border border-primary-500/20 rounded-2xl">
          <p className="text-xs text-primary-400 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" />
            Cảnh báo giá dùng email tài khoản backend. Clerk users nên đăng nhập qua email/password để dùng tính năng này.
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}

export default function OptimalRoute() {
  const navigate = useNavigate()
  const { isSignedIn } = useUser()
  const [tab, setTab] = useState('route')
  const [searchParams] = useSearchParams()
  // Điền sẵn từ URL params (liên kết mang theo from/to/date) → fallback lần tra cứu
  // gần nhất trên trang chủ/trang tìm kiếm → form trống nếu không có gì
  const [form, setForm] = useState(() => {
    const urlFrom = searchParams.get('from')
    const urlTo = searchParams.get('to')
    let src = null
    if (urlFrom && urlTo) {
      src = {
        from: urlFrom, to: urlTo,
        date: searchParams.get('date') || '',
        returnDate: searchParams.get('returnDate') || '',
        tripType: searchParams.get('tripType'),
      }
    } else {
      const s = getLastSearch()
      if (s) src = { from: s.from, to: s.to, date: s.date, returnDate: s.returnDate, tripType: s.tripType }
    }
    const tripType = src?.tripType === 'round-trip' ? 'round-trip' : 'one-way'
    return {
      originCity: src?.from || '',
      destinationCity: src?.to || '',
      startDate: src?.date || '',
      endDate: tripType === 'round-trip' ? (src.returnDate || '') : '',
      preferences: 'cheapest',
      tripType,
    }
  })
  const [routes, setRoutes] = useState([])
  const [combos, setCombos] = useState([])
  const [loading, setLoading] = useState(false)
  const [routeError, setRouteError] = useState('')
  const [directCheapest, setDirectCheapest] = useState(null)
  const searchedRef = useRef(false)

  const handleSearch = useCallback(async () => {
    if (!form.originCity || !form.destinationCity || !form.startDate) return
    if (form.tripType === 'round-trip' && !form.endDate) return
    searchedRef.current = true
    setLoading(true)
    setRouteError('')
    const isRoundTrip = form.tripType === 'round-trip'
    try {
      if (isRoundTrip) {
        const res = await getOptimalRoundTrip({
          originCity: form.originCity,
          destinationCity: form.destinationCity,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          preferences: form.preferences,
        })
        setCombos(res.data || [])
        setRoutes([])
      } else {
        const res = await getOptimalRoute({
          originCity: form.originCity,
          destinationCity: form.destinationCity,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.startDate).toISOString(),
          preferences: form.preferences,
        })
        const data = res.data || []
        setRoutes(data)
        setCombos([])
        setDirectCheapest(data.find(r => r.label === 'direct') || null)
      }
    } catch {
      setRoutes([])
      setCombos([])
      setRouteError('Không thể tìm lộ trình. Vui lòng thử lại sau.')
    } finally { setLoading(false) }
  }, [form])

  // Tự chạy tìm kiếm đúng 1 lần khi mở trang đã có sẵn dữ liệu điền đủ
  // (từ liên kết URL params hoặc lần tra cứu gần nhất trên trang chủ)
  useEffect(() => {
    if (!form.originCity || !form.destinationCity || !form.startDate) return
    if (form.tripType === 'round-trip' && !form.endDate) return
    searchedRef.current = true
    handleSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reload lộ trình đã tìm khi tab được mở/chuyển tới (chỉ khi đã từng tìm kiếm)
  useRefetchOnTabVisible(() => {
    if (searchedRef.current) handleSearch()
  })

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
              <RouteIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)]">Lộ trình & Cảnh báo giá</h1>
              <p className="text-sm text-[var(--color-text-secondary)]">Kết hợp máy bay, xe khách & tàu hỏa — Theo dõi giá vé</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LiveIndicator />
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 mb-6 shadow-sm">
        <div className="flex items-end gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Điểm đi</label>
            <LocationInput
              placeholder="Điểm đi (VD: HAN)"
              value={form.originCity}
              onChange={v => setForm(p => ({ ...p, originCity: v }))}
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Điểm đến</label>
            <LocationInput
              placeholder="Điểm đến (VD: SGN)"
              value={form.destinationCity}
              onChange={v => setForm(p => ({ ...p, destinationCity: v }))}
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Ngày đi</label>
            <div className="relative">
              <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none" />
              <input className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 h-[42px] text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
            </div>
          </div>
          <AnimatePresence initial={false}>
            {form.tripType === 'round-trip' && (
              <motion.div initial={{ opacity: 0, width: 0, overflow: 'hidden' }} animate={{ opacity: 1, width: 'auto', overflow: 'visible' }} exit={{ opacity: 0, width: 0, overflow: 'hidden' }} transition={{ duration: 0.25 }} className="min-w-[150px]">
                <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Ngày về</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none" />
                  <input className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 h-[42px] text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)]"
                    type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="min-w-[130px]">
            <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Ưu tiên</label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
              <select className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 h-[42px] text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] appearance-none" value={form.preferences} onChange={e => setForm(p => ({ ...p, preferences: e.target.value }))}>
                <option value="cheapest">Rẻ nhất</option>
                <option value="fastest">Nhanh nhất</option>
                <option value="balanced">Cân bằng</option>
                <option value="fewest_stops">Ít dừng nhất</option>
                <option value="earliest_arrival">Đến sớm nhất</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-transparent mb-1.5 select-none">·</label>
            <div className="flex items-center gap-1 bg-[var(--color-border)]/30 rounded-lg p-0.5 h-[42px]">
              <button onClick={() => setForm(p => ({ ...p, tripType: 'one-way', endDate: '' }))}
                className={`px-3 text-xs font-semibold rounded-md border transition-all h-full flex items-center ${
                  form.tripType === 'one-way'
                    ? 'bg-primary-500 text-white shadow-sm border-transparent'
                    : 'bg-transparent border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                }`}>Một chiều</button>
              <button onClick={() => setForm(p => ({ ...p, tripType: 'round-trip' }))}
                className={`px-3 text-xs font-semibold rounded-md border transition-all h-full flex items-center ${
                  form.tripType === 'round-trip'
                    ? 'bg-primary-500 text-white shadow-sm border-transparent'
                    : 'bg-transparent border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                }`}>Khứ hồi</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-transparent mb-1.5 select-none">·</label>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSearch}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 h-[42px] rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md shadow-primary-500/20">
              <TrendingUp className="w-4 h-4" />
              Tìm kiếm
            </motion.button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {popularRoutes.map((p, i) => (
            <button key={i} onClick={() => setForm(f => ({ ...f, originCity: p.origin, destinationCity: p.dest }))}
              className="text-xs px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:border-primary-500/40 hover:text-primary-400 hover:bg-primary-500/5 transition-all">{p.origin} &rarr; {p.dest}</button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="flex border-b border-[var(--color-border)] bg-[var(--color-bg)]">
          {TABS.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`flex-1 md:flex-none md:px-6 px-3 py-3 text-sm font-semibold transition-colors relative ${
                tab === item.id ? 'text-primary-500' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
              }`}>
              {item.label}
              {tab === item.id && (
                <motion.span layoutId="routeTabIndicator" className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-primary-500" />
              )}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-5">
          <AnimatePresence mode="wait">
            {tab === 'route' && <RouteTab key="route" form={form} setForm={setForm} handleSearch={handleSearch} routes={routes} combos={combos} loading={loading} routeError={routeError} directCheapest={directCheapest} onBook={(item) => navigate(`/booking/${item.type}/${item.id}`, { state: { item } })} onBookRoute={(route) => navigate(`/booking/multi/route`, { state: { route } })} onBookRoundTrip={(combo) => navigate(`/booking/multi/roundtrip`, { state: { route: { segments: [...(combo.outbound?.segments || []), ...(combo.return?.segments || [])], totalPrice: combo.totalPrice, roundTrip: true, outboundCount: combo.outbound?.segments?.length || 0 } } })} />}
            {tab === 'alerts' && <AlertsTab key="alerts" />}
          </AnimatePresence>
        </div>
      </div>

    </motion.div>
  )
}
