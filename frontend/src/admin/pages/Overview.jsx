import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Ticket, Plane, Train, Bus, DollarSign, TrendingUp,
  ArrowRight, Activity, Clock, CalendarClock,
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
const MODE_META = {
  flight: { icon: Plane, label: 'Chuyến bay' },
  train: { icon: Train, label: 'Tàu hỏa' },
  bus: { icon: Bus, label: 'Xe khách' },
}

// Định dạng tiền dễ đọc: 6.232.228 → "6,2tr", 994.000 → "994k", 80.000 → "80k"
const formatVndShort = (v) => {
  if (v >= 1_000_000) return (v / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + 'tr'
  if (v >= 1_000) return Math.round(v / 1_000) + 'k'
  return String(v)
}
const formatVndFull = (v) => v.toLocaleString('vi-VN') + ' ₫'

// "2026-08-21 04:10" → "04:10 · 21/08"
const formatDeparture = (s) => {
  if (!s || s.length < 16) return s || '—'
  return s.slice(11, 16) + ' · ' + s.slice(8, 10) + '/' + s.slice(5, 7)
}

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

  // Doanh thu bình quân/ngày cần biết số ngày có doanh thu
  const daysWithRevenue = (s.revenueOverTime || []).filter(r => r.revenue > 0).length

  const bestDay = useMemo(() => {
    const rows = s.revenueOverTime || []
    const best = rows.reduce((a, b) => (b.revenue > (a?.revenue ?? 0) ? b : a), null)
    if (!best) return { day: '—', value: 0 }
    return { day: best.date.slice(8) + '/' + best.date.slice(5, 7), value: best.revenue }
  }, [s])

  // Giao dịch gần đây thật
  const recentTx = (s.recentTransactions || []).slice(0, 6).map(t => ({
    id: `BK${t.id}`,
    name: t.userName || t.email || 'Khách',
    status: t.status,
    amount: t.amount.toLocaleString('vi-VN') + ' ₫',
    type: t.type,
  }))

  // Hoạt động hôm nay + chuyến sắp khởi hành (từ /api/admin/dashboard)
  const upcoming = d.upcomingDepartures || []

  const conv = d.totalBookings ? ((d.confirmedBookings ?? 0) / d.totalBookings * 100).toFixed(0) : '0'
  const revChange = s.revenueComparison?.change ?? 0
  const revenueCurrent = s.revenueComparison?.current ?? 0
  const revenuePrevious = s.revenueComparison?.previous ?? 0
  const revenueDelta = revenueCurrent - revenuePrevious
  const revenueAvg = daysWithRevenue > 0 ? Math.round(revenueCurrent / daysWithRevenue) : 0
  // StatCard nhận change là số % (null = kỳ trước không có dữ liệu → hiển thị "Mới")
  const userChange = null
  const bookingChange = null

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-[var(--color-border)] rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
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
        <StatCard icon={DollarSign} label="Tổng doanh thu" value={(d.totalRevenue ?? 0).toLocaleString('vi-VN') + ' ₫'} change={revChange} color="rose" />
        <StatCard icon={TrendingUp} label="Tỉ lệ xác nhận" value={`${conv}%`} change={null} color="violet" />
      </motion.div>

      {/* Row 2: Hôm nay — hoạt động trong ngày, việc cần xử lý */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-[var(--color-text-tertiary)]" />
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Hôm nay</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <TodayTile icon={Ticket} label="Đặt chỗ hôm nay" value={d.bookingsToday ?? 0} hint="Tổng đơn tạo trong ngày" />
          <TodayTile icon={DollarSign} label="Doanh thu hôm nay" value={formatVndFull(d.revenueToday ?? 0)} hint="Chỉ tính đơn đã xác nhận" />
          <TodayTile
            icon={Activity} label="Chờ xử lý" value={d.pendingBookings ?? 0}
            hint={(d.pendingBookings ?? 0) > 0 ? 'Cần duyệt trong Quản lý đặt chỗ' : 'Không có đơn chờ'}
            onClick={() => onNavigate('bookings')}
          />
          <TodayTile icon={CalendarClock} label="Khởi hành 24h tới" value={upcoming.length} hint="Chuyến sắp đi" />
        </div>
      </motion.div>

      {/* Row 3: Doanh thu 30 ngày + Giao dịch gần đây */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart — thiết kế dễ hiểu cho người không rành CNTT */}
        <div className="lg:col-span-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          {/* Tổng doanh thu — số lớn dễ đọc, chỉ tính đặt chỗ Đã xác nhận */}
          <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-1">Doanh thu đã xác nhận · 30 ngày qua</p>
              <p className="text-3xl font-bold text-[var(--color-text-primary)]">
                {revenueCurrent.toLocaleString('vi-VN')} <span className="text-base font-semibold text-[var(--color-text-secondary)]">₫</span>
              </p>
              <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">
                Trong đó có {daysWithRevenue} ngày có doanh thu (không phải ngày nào cũng bán được)
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium text-[var(--color-text-secondary)]">So với 30 ngày trước đó</p>
              <p className={`text-sm font-bold ${revenueDelta >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                {revenueDelta >= 0 ? '+' : '−'}{formatVndShort(Math.abs(revenueDelta))}
                <span className="text-[11px] font-medium text-[var(--color-text-tertiary)] ml-1">{revenueDelta >= 0 ? 'tăng' : 'giảm'}</span>
              </p>
              <p className="text-[10px] text-[var(--color-text-tertiary)]">Kỳ trước: {formatVndFull(revenuePrevious)}</p>
            </div>
          </div>

          {/* Các thẻ thống kê — số lớn, dễ đọc */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-[var(--color-bg-hover)] border border-[var(--color-border)] p-4">
              <p className="text-[11px] font-medium text-[var(--color-text-tertiary)] mb-2">Ngày bán chạy nhất</p>
              <p className="text-xl font-bold text-[var(--color-text-primary)]">{bestDay.day}</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">{formatVndFull(bestDay.value)}</p>
            </div>
            <div className="rounded-xl bg-[var(--color-bg-hover)] border border-[var(--color-border)] p-4">
              <p className="text-[11px] font-medium text-[var(--color-text-tertiary)] mb-2">Trung bình mỗi ngày có doanh thu</p>
              <p className="text-xl font-bold text-[var(--color-text-primary)]">{formatVndFull(revenueAvg)}</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">Tổng chia cho {daysWithRevenue} ngày</p>
            </div>
            <div className="rounded-xl bg-[var(--color-bg-hover)] border border-[var(--color-border)] p-4">
              <p className="text-[11px] font-medium text-[var(--color-text-tertiary)] mb-2">So với kỳ trước</p>
              <p className={`text-xl font-bold ${revenueDelta >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                {revenueDelta >= 0 ? '+' : '−'}{formatVndShort(Math.abs(revenueDelta))}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                {revenueDelta >= 0 ? 'Tăng' : 'Giảm'} so với {formatVndFull(revenuePrevious)} của kỳ trước
              </p>
            </div>
          </div>
        </div>

        {/* Recent Activity — từ recentTransactions thật */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--color-text-tertiary)]" />
              Giao dịch gần đây
            </h3>
            <button onClick={() => onNavigate('bookings')} className="text-[11px] font-medium text-primary-500 hover:text-primary-600 transition-colors flex items-center gap-0.5">
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </button>
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

      {/* Row 4: Chuyến sắp khởi hành trong 24h — gộp 3 loại phương tiện */}
      <motion.div variants={item} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            Chuyến sắp khởi hành (24h tới)
          </h3>
          <span className="text-xs text-[var(--color-text-tertiary)]">{upcoming.length} chuyến</span>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-[var(--color-text-tertiary)] py-8 text-center">Không có chuyến nào khởi hành trong 24h tới</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
            {upcoming.map((u, i) => {
              const meta = MODE_META[u.mode] || MODE_META.flight
              const Icon = meta.icon
              const lowSeats = u.seatsLeft <= 20
              return (
                <div key={`${u.mode}-${u.code}-${i}`} className="flex items-center gap-3 py-2.5 border-b border-[var(--color-border)]/50 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center shrink-0 text-primary-500" title={meta.label}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[var(--color-text-primary)]">{u.code}</p>
                    <p className="text-[10px] text-[var(--color-text-tertiary)] truncate">{u.route}</p>
                  </div>
                  <span className="text-[11px] font-medium text-[var(--color-text-secondary)] shrink-0">{formatDeparture(u.departureTime)}</span>
                  <span className={`shrink-0 inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                    lowSeats
                      ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20'
                      : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] border-[var(--color-border)]'
                  }`}>
                    {u.seatsLeft} chỗ
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

function TodayTile({ icon: Icon, label, value, hint, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 transition-colors ${
        onClick ? 'cursor-pointer hover:border-primary-300' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary-50 text-primary-500">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <p className="text-[11px] text-[var(--color-text-tertiary)]">{label}</p>
      </div>
      <p className="text-lg font-bold text-[var(--color-text-primary)] truncate">{value}</p>
      {hint && <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">{hint}</p>}
    </div>
  )
}
