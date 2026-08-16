import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Ticket, Plane, Train, DollarSign, TrendingUp,
  ArrowRight, Activity, MapPin, Building2,
} from 'lucide-react'
import { getAdminDashboard, getAdminStats } from '../../services/api'
import StatCard from '../StatCard'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
}

const STATUS_LABEL = { Confirmed: 'Đã xác nhận', Pending: 'Chờ xử lý', Cancelled: 'Đã huỷ' }

// Định dạng tiền dễ đọc: 6.232.228 → "6,2tr", 994.000 → "994k", 80.000 → "80k"
const formatVndShort = (v) => {
  if (v >= 1_000_000) return (v / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + 'tr'
  if (v >= 1_000) return Math.round(v / 1_000) + 'k'
  return String(v)
}
const formatVndFull = (v) => v.toLocaleString('vi-VN') + ' ₫'

export default function Overview({ onNavigate }) {
  const [dashboard, setDashboard] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAdminDashboard(), getAdminStats({ period: 30 })])
      .then(([d, s]) => {
        setDashboard(d.data)
        setStats(s.data)
      })
      .catch(err => console.error('[Overview] Error:', err.response?.data || err.message))
      .finally(() => setLoading(false))
  }, [])

  const d = dashboard || {}
  const s = stats || {}

  // Bar chart data từ revenueOverTime thật (label dd/MM)
  const revenueChart = useMemo(() => {
    const rows = s.revenueOverTime || []
    const max = Math.max(...rows.map(r => r.revenue), 1)
    const best = rows.reduce((a, b) => (b.revenue > (a?.revenue ?? 0) ? b : a), null)
    return rows.map(r => ({
      day: r.date.slice(8) + '/' + r.date.slice(5, 7),
      value: r.revenue,
      pct: Math.max((r.revenue / max) * 100, 2),
      isBest: best != null && r.date === best.date,
    }))
  }, [s])

  const bestDay = useMemo(() => {
    const rows = s.revenueOverTime || []
    const best = rows.reduce((a, b) => (b.revenue > (a?.revenue ?? 0) ? b : a), null)
    if (!best) return { day: '—', value: 0 }
    return { day: best.date.slice(8) + '/' + best.date.slice(5, 7), value: best.revenue }
  }, [s])

  // Phân bố trạng thái đặt chỗ — màu + % để vẽ thanh ngang
  const statusDist = useMemo(() => {
    const rows = s.bookingStatusDistribution || []
    const total = rows.reduce((sum, r) => sum + r.count, 0) || 1
    const colors = {
      Confirmed: 'bg-[var(--color-success)]',
      Pending: 'bg-primary-500',
      Cancelled: 'bg-[var(--color-danger)]',
    }
    return rows.map(r => ({
      status: r.status,
      label: STATUS_LABEL[r.status] || r.status,
      count: r.count,
      pct: Math.round((r.count / total) * 100),
      color: colors[r.status] || 'bg-[var(--color-border)]',
    }))
  }, [s])
  const totalBookings = s.bookingStatusDistribution?.reduce((sum, r) => sum + r.count, 0) ?? 0

  const bookingChart = useMemo(() => {
    const rows = s.bookingsOverTime || []
    const max = Math.max(...rows.map(r => r.count), 1)
    return rows.map(r => ({
      day: r.date.slice(8) + '/' + r.date.slice(5, 7),
      value: r.count,
      pct: Math.max((r.count / max) * 100, 2),
    }))
  }, [s])

  // Top tuyến bay thật (backend trả { route, count })
  const topFlightRoutes = useMemo(() => {
    const rows = s.topFlightRoutes || []
    const max = Math.max(...rows.map(r => r.count), 1)
    return rows.map(r => ({ route: r.route, count: r.count, pct: Math.round((r.count / max) * 100) }))
  }, [s])

  // Hãng bay thật
  const topAirlines = useMemo(() => {
    const rows = s.airlineMarketShare || []
    const max = Math.max(...rows.map(r => r.count), 1)
    return rows.map(r => ({ name: r.airline, count: r.count, pct: Math.round((r.count / max) * 100) }))
  }, [s])

  // Giao dịch gần đây thật
  const recentTx = (s.recentTransactions || []).slice(0, 6).map(t => ({
    id: `BK${t.id}`,
    name: t.userName || t.email || 'Khách',
    status: t.status,
    amount: t.amount.toLocaleString('vi-VN') + ' ₫',
    type: t.type,
  }))

  const conv = d.totalBookings ? ((d.confirmedBookings ?? 0) / d.totalBookings * 100).toFixed(0) : '0'
  const revChange = s.revenueComparison?.change ?? 0
  const gm = s.growthMetrics || {}
  // StatCard nhận change là số % (null = kỳ trước không có dữ liệu → hiển thị "Mới")
  const userChange = gm.usersWoW ?? null
  const bookingChange = gm.bookingsWoW ?? null

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-[var(--color-border)] rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-72 bg-[var(--color-border)] rounded-xl" />
          <div className="h-72 bg-[var(--color-border)] rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Row 1: 6 Stat Cards — dữ liệu thật từ /api/admin/dashboard */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Users} label="Người dùng" value={d.totalUsers ?? 0} change={userChange} color="primary" />
        <StatCard icon={Plane} label="Chuyến bay" value={d.totalFlights ?? 0} change={null} color="sky" />
        <StatCard icon={Train} label="Tàu hỏa" value={d.totalTrains ?? 0} change={null} color="emerald" />
        <StatCard icon={Ticket} label="Đặt chỗ" value={d.totalBookings ?? 0} change={bookingChange} color="sky" />
        <StatCard icon={DollarSign} label="Doanh thu" value={(d.totalRevenue ?? 0).toLocaleString('vi-VN') + ' ₫'} change={revChange} color="rose" />
        <StatCard icon={TrendingUp} label="Tỉ lệ xác nhận" value={`${conv}%`} change={null} color="violet" />
      </motion.div>

      {/* Row 2: Doanh thu thật + Hoạt động */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart — thiết kế dễ hiểu cho người không rành CNTT */}
        <div className="lg:col-span-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          {/* Tổng doanh thu — số lớn dễ đọc */}
          <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-1">Tổng doanh thu trong 30 ngày qua</p>
              <p className="text-3xl font-bold text-[var(--color-text-primary)]">
                {(s.revenueComparison?.current ?? 0).toLocaleString('vi-VN')} <span className="text-base font-semibold text-[var(--color-text-secondary)]">₫</span>
              </p>
            </div>
            <span className={`text-[11px] font-medium px-2 py-1 rounded-md ${revChange >= 0 ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'}`}>
              {revChange >= 0 ? '+' : ''}{revChange}% so với 30 ngày trước đó
            </span>
          </div>

          {revenueChart.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)] py-8 text-center">Chưa có dữ liệu doanh thu</p>
          ) : (
            <>
              {/* Biểu đồ cột — mỗi cột là 1 ngày có đặt chỗ */}
              <div className="flex items-end justify-between gap-2 h-36">
                {revenueChart.map((r, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] truncate max-w-full">
                      {formatVndShort(r.value)}
                    </span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${r.pct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className={`w-full rounded-md bg-gradient-to-t from-primary-500 to-primary-400 ${r.isBest ? 'ring-2 ring-accent-500/60' : ''}`}
                      title={`${r.day}: ${r.value.toLocaleString('vi-VN')} ₫`}
                    />
                    <span className="text-[10px] text-[var(--color-text-tertiary)] font-medium">{r.day}</span>
                  </div>
                ))}
              </div>

              {/* Tóm tắt bằng lời — dễ hiểu nhất */}
              <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--color-text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-primary-500" />
                  <span><b>{bestDay.day}</b> bán chạy nhất: <b className="text-[var(--color-text-primary)]">{formatVndFull(bestDay.value)}</b></span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-border)]" />
                  Những ngày không có cột nghĩa là không có đặt chỗ
                </span>
              </div>
            </>
          )}

          {/* Phân bố trạng thái đặt chỗ — kèm chú giải */}
          <div className="mt-5 pt-5 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[var(--color-text-primary)]">Tình trạng đặt chỗ (toàn bộ thời gian)</p>
              <span className="text-[10px] text-[var(--color-text-tertiary)]">Tổng {totalBookings} đặt chỗ</span>
            </div>
            {statusDist.length === 0 ? (
              <p className="text-xs text-[var(--color-text-tertiary)] py-3 text-center">Chưa có đặt chỗ nào</p>
            ) : (
              <>
                <div className="flex h-3 rounded-full overflow-hidden bg-[var(--color-border)]/50">
                  {statusDist.map((s, i) => s.pct > 0 && (
                    <motion.div
                      key={i}
                      initial={{ width: 0 }}
                      animate={{ width: `${s.pct}%` }}
                      transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
                      className={s.color}
                      title={`${s.label}: ${s.count}`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2.5">
                  {statusDist.map((s, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
                      <span className={`w-2.5 h-2.5 rounded-sm ${s.color}`} />
                      {s.label}: <b className="text-[var(--color-text-primary)]">{s.count}</b>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recent Activity — từ recentTransactions thật */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--color-text-tertiary)]" />
              Giao dịch gần đây
            </h3>
            <span className="w-2 h-2 rounded-full bg-primary-400" />
          </div>
          {recentTx.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)] py-8 text-center">Chưa có giao dịch</p>
          ) : (
            <div className="space-y-3">
              {recentTx.map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center text-primary-500">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{t.name}</p>
                    <p className="text-[10px] text-[var(--color-text-tertiary)]">{t.id} · {t.type}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-[var(--color-text-primary)]">{t.amount}</p>
                    <span className={`text-[10px] font-medium ${
                      t.status === 'Confirmed' ? 'text-[var(--color-success)]' :
                      t.status === 'Pending' ? 'text-primary-600' : 'text-[var(--color-danger)]'
                    }`}>{STATUS_LABEL[t.status] || t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Row 3: Top Routes + Airlines + Bookings gần đây — dữ liệu thật */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Routes thật */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[var(--color-text-tertiary)]" />
              Top tuyến bay
            </h3>
            <button onClick={() => onNavigate('flights')} className="text-[11px] font-medium text-primary-500 hover:text-primary-600 transition-colors flex items-center gap-0.5">
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {topFlightRoutes.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)] py-8 text-center">Chưa có dữ liệu tuyến bay</p>
          ) : (
            <div className="space-y-2.5">
              {topFlightRoutes.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-[var(--color-text-secondary)] w-24">{r.route}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${r.pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="h-full rounded-full bg-primary-400"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] w-8 text-right">{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Popular Airlines thật */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[var(--color-text-tertiary)]" />
              Hãng bay phổ biến
            </h3>
          </div>
          {topAirlines.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)] py-8 text-center">Chưa có dữ liệu hãng bay</p>
          ) : (
            <div className="space-y-2.5">
              {topAirlines.map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-[var(--color-text-secondary)] flex-1">{a.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${a.pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="h-full rounded-full bg-primary-400"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] w-8 text-right">{a.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Đặt chỗ gần đây — từ recentTransactions thật */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Đặt chỗ gần đây</h3>
            <button onClick={() => onNavigate('bookings')} className="text-[11px] font-medium text-primary-500 hover:text-primary-600 transition-colors flex items-center gap-0.5">
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {recentTx.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)] py-8 text-center">Chưa có đặt chỗ</p>
          ) : (
            <div className="space-y-2.5">
              {recentTx.map((b, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-[var(--color-text-tertiary)]">{b.id.slice(-3)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{b.name}</p>
                      <span className="text-[10px] text-[var(--color-text-tertiary)]">{b.id}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-[var(--color-text-primary)]">{b.amount}</p>
                    <span className={`text-[10px] font-medium ${
                      b.status === 'Confirmed' ? 'text-[var(--color-success)]' :
                      b.status === 'Pending' ? 'text-primary-600' : 'text-[var(--color-danger)]'
                    }`}>{STATUS_LABEL[b.status] || b.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Row 4: Booking chart thật + Tăng trưởng */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Booking chart — bookingsOverTime thật */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Số lượng đặt chỗ</h3>
            <span className="text-xs text-[var(--color-text-tertiary)]">30 ngày qua</span>
          </div>
          {bookingChart.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)] py-8 text-center">Chưa có dữ liệu đặt chỗ</p>
          ) : (
            <div className="flex items-end justify-between gap-2 h-32">
              {bookingChart.map((b, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${b.pct}%` }}
                    transition={{ duration: 0.5, delay: i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="w-full rounded-md bg-gradient-to-t from-primary-500 to-primary-400"
                    title={`${b.value} đặt chỗ`}
                  />
                  <span className="text-[10px] text-[var(--color-text-tertiary)] font-medium">{b.day}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tăng trưởng — growthMetrics thật */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Tăng trưởng</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Người dùng mới (tuần này)', value: gm.usersThisWeek ?? 0, prev: gm.usersWoW ?? null, isPct: true },
              { label: 'Đặt chỗ mới (tuần này)', value: gm.bookingsThisWeek ?? 0, prev: gm.bookingsWoW ?? null, isPct: true },
              { label: 'Tổng người dùng', value: d.totalUsers ?? 0, prev: null, isPct: false },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <span className="text-xs text-[var(--color-text-secondary)]">{s.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{(s.value ?? 0).toLocaleString('vi-VN')}</span>
                  {s.isPct && s.prev != null ? (
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${s.prev >= 0 ? 'text-[var(--color-success)] bg-[var(--color-success)]/10' : 'text-[var(--color-danger)] bg-[var(--color-danger)]/10'}`}>
                      {s.prev >= 0 ? '+' : ''}{s.prev}%
                    </span>
                  ) : s.isPct && (s.value ?? 0) > 0 ? (
                    <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-primary-50 text-primary-600">Mới</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
