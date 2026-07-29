import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Route as RouteIcon, Plane, Train, MapPin, CalendarDays,
  DollarSign, TrendingUp, TrendingDown, Lightbulb, Bell, BellOff, Plus,
  Trash2, Target, ArrowRight, AlertCircle, Check, Loader,
} from 'lucide-react'
import LocationInput from '../components/LocationInput'
import { getOptimalRoute, getPriceAlerts, createPriceAlert, deletePriceAlert, togglePriceAlert, checkPriceAlerts } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'
import { useUser } from '@clerk/clerk-react'

const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60); const m = Math.round(minutes % 60)
  return `${h} giờ ${m} phút`
}
const formatTime = (dateStr) => {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
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

const alertRoutes = [
  { from: 'HAN', to: 'SGN' }, { from: 'SGN', to: 'HAN' },
  { from: 'HAN', to: 'DAD' }, { from: 'DAD', to: 'HAN' },
  { from: 'SGN', to: 'DAD' }, { from: 'DAD', to: 'SGN' },
  { from: 'HAN', to: 'CXR' }, { from: 'SGN', to: 'PQC' },
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

function RouteTab({ form, setForm, handleSearch, routes, loading, directCheapest }) {
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

      {routes.length > 0 && !loading && (
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
            {routes[0]?.label !== 'direct' && directCheapest && (
              <span className="text-sm font-semibold text-[var(--color-success)]">
                Tiết kiệm {formatCurrencyVnd(directCheapest.totalPrice - routes[0].totalPrice)} so với vé trực tiếp
              </span>
            )}
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
                        <span className="font-semibold text-[var(--color-text-primary)]">{isMultiLeg ? 'Lộ trình kết hợp' : 'Bay thẳng'}</span>
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
                    <div className="relative">
                      <div className="absolute left-[18px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-primary-400 via-primary-400 to-primary-400 rounded-full opacity-30" />
                      {segments.map((seg, j) => {
                        const prevSeg = j > 0 ? segments[j - 1] : null
                        const transferTime = prevSeg ? (new Date(seg.departureTime) - new Date(prevSeg.arrivalTime)) / 60000 : 0
                        return (
                          <div key={j} className="relative flex gap-4 pb-5 last:pb-0">
                            <div className="relative z-10 mt-1">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shadow-sm bg-primary-500 text-white">
                                {seg.type === 'flight' ? <Plane className="w-4 h-4" /> : <Train className="w-4 h-4" />}
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
                                  {seg.type === 'flight' ? <Plane className="w-3 h-3 inline" /> : <Train className="w-3 h-3 inline" />} {seg.code}
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
                  </div>
                </motion.div>
              )
            })}
          </div>
        </>
      )}

      {!loading && routes.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center mb-4">
            <MapPin className="w-7 h-7 text-[var(--color-text-tertiary)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">Nhập thông tin để tìm lộ trình tối ưu</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">Hệ thống sẽ gợi ý lộ trình kết hợp máy bay và tàu hỏa tiết kiệm nhất</p>
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
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ routeFrom: '', routeTo: '', targetPrice: '' })

  const stored = (() => { try { return JSON.parse(localStorage.getItem('user')) } catch { return null } })()
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

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.routeFrom || !form.routeTo || !form.targetPrice) return
    setSubmitting(true)
    try {
      await createPriceAlert({ email, routeFrom: form.routeFrom, routeTo: form.routeTo, targetPrice: Number(form.targetPrice) })
      setForm({ routeFrom: '', routeTo: '', targetPrice: '' })
      setShowForm(false)
      loadAlerts()
    } catch (err) {
      setError(err.response?.data?.message || 'Tạo cảnh báo thất bại')
    } finally { setSubmitting(false) }
  }

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
        <p className="text-sm text-[var(--color-text-secondary)]">Theo dõi giá vé — nhận thông báo khi giá đúng mục tiêu</p>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 h-[42px] rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md shadow-primary-500/20 text-sm">
          {showForm ? 'Đóng' : <><Plus className="w-4 h-4" /> Thêm mới</>}
        </motion.button>
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

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <form onSubmit={handleCreate} className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-5 md:p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary-500" />
                <h3 className="font-semibold text-[var(--color-text-primary)] text-sm">Tạo cảnh báo giá mới</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-tertiary)] mb-1.5 uppercase tracking-wider">Điểm đi</label>
                  <select value={form.routeFrom} onChange={e => setForm(p => ({ ...p, routeFrom: e.target.value }))}
                    className="w-full border border-[var(--color-border)] rounded-xl px-3.5 py-3 text-sm text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)]" required>
                    <option value="">Chọn điểm đi</option>
                    {[...new Set(alertRoutes.map(r => r.from))].map(code => (
                      <option key={code} value={code}>{cityName(code)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-tertiary)] mb-1.5 uppercase tracking-wider">Điểm đến</label>
                  <select value={form.routeTo} onChange={e => setForm(p => ({ ...p, routeTo: e.target.value }))}
                    className="w-full border border-[var(--color-border)] rounded-xl px-3.5 py-3 text-sm text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)]" required>
                    <option value="">Chọn điểm đến</option>
                    {[...new Set(alertRoutes.map(r => r.to))].filter(c => c !== form.routeFrom).map(code => (
                      <option key={code} value={code}>{cityName(code)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-tertiary)] mb-1.5 uppercase tracking-wider">Giá mục tiêu (VND)</label>
                <div className="relative">
                  <Target className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                  <input type="number" value={form.targetPrice} onChange={e => setForm(p => ({ ...p, targetPrice: e.target.value }))}
                    className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 py-3 text-sm text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)]"
                    placeholder="Ví dụ: 2000000" min="1" required />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)] bg-primary-500/5 px-3.5 py-2.5 rounded-xl">
                <Bell className="w-3.5 h-3.5 text-primary-500" />
                Bạn sẽ nhận được thông báo qua email khi giá vé giảm xuống mức mục tiêu
              </div>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 h-[42px] rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md shadow-primary-500/20"
                disabled={submitting}>
                {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Đang tạo...</> : 'Tạo cảnh báo'}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

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
          <p className="text-xs text-[var(--color-text-tertiary)]">Tạo cảnh báo giá để không bỏ lỡ vé rẻ</p>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {alerts.map((alert) => (
            <motion.div key={alert.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
              className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] px-5 py-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center ${
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
                      <span className="font-semibold text-[var(--color-text-primary)] text-sm">{cityName(alert.routeFrom)}</span>
                      <ArrowRight className="w-3 h-3 text-[var(--color-text-tertiary)]" />
                      <span className="font-semibold text-[var(--color-text-primary)] text-sm">{cityName(alert.routeTo)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs text-[var(--color-text-tertiary)]">Mục tiêu: <strong className="text-primary-500">{formatCurrencyVnd(alert.targetPrice)}</strong></span>
                      {alert.currentPrice && (
                        <span className="text-xs text-[var(--color-text-tertiary)]">Hiện tại: <strong className={alert.currentPrice <= alert.targetPrice ? 'text-[var(--color-success)]' : 'text-[var(--color-text-primary)]'}>{formatCurrencyVnd(alert.currentPrice)}</strong></span>
                      )}
                      {alert.notifiedAt && (
                        <span className="text-[11px] font-semibold text-white bg-[var(--color-success)] px-2 py-0.5 rounded-lg">Đã kích hoạt</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!alert.notifiedAt && (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleToggle(alert.id)}
                      className="p-2 rounded-xl text-[var(--color-text-tertiary)] hover:text-primary-400 hover:bg-primary-500/10 transition-colors" title={alert.isActive ? 'Tắt cảnh báo' : 'Bật cảnh báo'}>
                      {alert.isActive ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </motion.button>
                  )}
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleDelete(alert.id)}
                    className="p-2 rounded-xl text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors" title="Xóa">
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
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
  const [form, setForm] = useState({
    originCity: 'HAN', destinationCity: 'SGN', startDate: '', endDate: '', preferences: 'cheapest', tripType: 'one-way',
  })
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(false)
  const [directCheapest, setDirectCheapest] = useState(null)

  const handleSearch = useCallback(async () => {
    if (!form.originCity || !form.destinationCity || !form.startDate) return
    setLoading(true)
    try {
      const res = await getOptimalRoute({
        originCity: form.originCity,
        destinationCity: form.destinationCity,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.tripType === 'round-trip' && form.endDate
          ? new Date(form.endDate).toISOString()
          : new Date(form.startDate).toISOString(),
        preferences: form.preferences,
      })
      const data = res.data || []
      setRoutes(data)
      setDirectCheapest(data.find(r => r.label === 'direct') || null)
    } catch { setRoutes([]) } finally { setLoading(false) }
  }, [form])

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
              <p className="text-sm text-[var(--color-text-secondary)]">Kết hợp máy bay & tàu hỏa — Theo dõi giá vé</p>
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
            {tab === 'route' && <RouteTab key="route" form={form} setForm={setForm} handleSearch={handleSearch} routes={routes} loading={loading} directCheapest={directCheapest} />}
            {tab === 'alerts' && <AlertsTab key="alerts" />}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
