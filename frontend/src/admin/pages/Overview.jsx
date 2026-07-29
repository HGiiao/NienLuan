import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Ticket, Plane, Train, DollarSign, TrendingUp,
  ArrowRight, Activity, MapPin, Building2,
} from 'lucide-react'
import { getAdminDashboard } from '../../services/api'
import StatCard from '../StatCard'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
}

export default function Overview({ onNavigate }) {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminDashboard()
      .then(res => setDashboard(res.data))
      .catch(err => console.error('[Overview] Error:', err.response?.data || err.message))
      .finally(() => setLoading(false))
  }, [])

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

  const stats = dashboard || {}
  const trend7 = [4, 6, 5, 8, 7, 10, 9]
  const trend30 = [42, 48, 45, 52, 50, 58, 55, 62, 60, 68, 65, 72, 70, 75, 73, 78, 76, 82, 80, 85, 83, 88, 86, 90, 88, 92, 90, 95, 93, 98]

  const revenueData = [
    { day: 'T2', value: 12 },
    { day: 'T3', value: 18 },
    { day: 'T4', value: 14 },
    { day: 'T5', value: 22 },
    { day: 'T6', value: 19 },
    { day: 'T7', value: 25 },
    { day: 'CN', value: 21 },
  ]
  const bookingData = [
    { day: 'T2', value: 8 },
    { day: 'T3', value: 12 },
    { day: 'T4', value: 10 },
    { day: 'T5', value: 16 },
    { day: 'T6', value: 14 },
    { day: 'T7', value: 20 },
    { day: 'CN', value: 18 },
  ]

  const topRoutes = [
    { route: 'SGN → HAN', count: 124, pct: 100 },
    { route: 'HAN → SGN', count: 108, pct: 87 },
    { route: 'DAD → SGN', count: 72, pct: 58 },
    { route: 'SGN → DAD', count: 65, pct: 52 },
    { route: 'HAN → DAD', count: 48, pct: 39 },
  ]
  const topAirlines = [
    { name: 'Vietnam Airlines', count: 320, pct: 100 },
    { name: 'VietJet Air', count: 280, pct: 88 },
    { name: 'Bamboo Airways', count: 140, pct: 44 },
    { name: 'Pacific Airlines', count: 95, pct: 30 },
    { name: 'Vietravel Airlines', count: 75, pct: 23 },
  ]
  const recentBookings = [
    { id: 'BK001', name: 'Nguyễn Văn A', status: 'Confirmed', amount: '2,450,000 ₫' },
    { id: 'BK002', name: 'Trần Thị B', status: 'Pending', amount: '1,200,000 ₫' },
    { id: 'BK003', name: 'Lê Văn C', status: 'Confirmed', amount: '3,680,000 ₫' },
    { id: 'BK004', name: 'Phạm Thị D', status: 'Cancelled', amount: '890,000 ₫' },
    { id: 'BK005', name: 'Hoàng Văn E', status: 'Confirmed', amount: '5,120,000 ₫' },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Row 1: 6 Stat Cards */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Users} label="Người dùng" value={stats.totalUsers ?? 0} change={12} sparkline={trend7} color="primary" />
        <StatCard icon={Plane} label="Chuyến bay" value={stats.totalFlights ?? 0} change={-3} sparkline={trend7} color="sky" />
        <StatCard icon={Train} label="Tàu hỏa" value={stats.totalTrains ?? 0} change={5} sparkline={trend7} color="emerald" />
        <StatCard icon={Ticket} label="Đặt chỗ" value={stats.totalBookings ?? 0} change={8} sparkline={trend7} color="sky" />
        <StatCard icon={DollarSign} label="Doanh thu" value={(stats.totalRevenue ?? 0).toLocaleString('vi-VN') + ' ₫'} change={15} sparkline={trend30} color="rose" />
        <StatCard icon={TrendingUp} label="Tỉ lệ chuyển đổi" value={`${((stats.confirmedBookings ?? 0) / ((stats.totalBookings ?? 0) || 1) * 100).toFixed(0)}%`} change={2.4} sparkline={trend7} color="violet" />
      </motion.div>

      {/* Row 2: Charts + Recent Activity */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Doanh thu</h3>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">7 ngày qua</p>
            </div>
            <div className="flex items-center gap-1.5">
              {['7 ngày', '30 ngày', '90 ngày', '1 năm'].map((l, i) => (
                <button key={l} className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${i === 0 ? 'bg-primary-50 text-primary-600' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end justify-between gap-2 h-40">
            {revenueData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.value / 25) * 100}%` }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="w-full rounded-md bg-gradient-to-t from-primary-400/60 to-primary-300/30 max-h-full"
                />
                <span className="text-[10px] text-[var(--color-text-tertiary)] font-medium">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--color-text-tertiary)]" />
              Hoạt động
            </h3>
            <span className="w-2 h-2 rounded-full bg-primary-400" />
          </div>
          <div className="space-y-3">
            {[
              { icon: Ticket, text: 'Đặt chỗ mới #BK006', time: '2 phút trước', color: 'text-primary-500' },
              { icon: Users, text: 'Người dùng mới đăng ký', time: '15 phút trước', color: 'text-primary-500' },
              { icon: DollarSign, text: 'Thanh toán #BK003', time: '1 giờ trước', color: 'text-primary-500' },
              { icon: Plane, text: 'Cập nhật giá VN123', time: '2 giờ trước', color: 'text-primary-500' },
              { icon: Train, text: 'Thêm tàu SE8', time: '3 giờ trước', color: 'text-primary-500' },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center ${a.color}`}>
                  <a.icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{a.text}</p>
                  <p className="text-[10px] text-[var(--color-text-tertiary)]">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Row 3: Top Routes + Popular Airlines + Top Train Routes */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Routes */}
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
          <div className="space-y-2.5">
            {topRoutes.map((r, i) => (
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
        </div>

        {/* Popular Airlines */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[var(--color-text-tertiary)]" />
              Hãng bay phổ biến
            </h3>
          </div>
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
        </div>

        {/* Recent Activity (reuse for Top Train Routes) */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Đặt chỗ gần đây</h3>
            <button onClick={() => onNavigate('bookings')} className="text-[11px] font-medium text-primary-500 hover:text-primary-600 transition-colors flex items-center gap-0.5">
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2.5">
            {recentBookings.map((b, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center">
                    <span className="text-[10px] font-bold text-[var(--color-text-tertiary)]">{b.id.slice(-3)}</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-primary)]">{b.name}</p>
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">{b.id}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-[var(--color-text-primary)]">{b.amount}</p>
                  <span className={`text-[10px] font-medium ${
                    b.status === 'Confirmed' ? 'text-[var(--color-success)]' :
                    b.status === 'Pending' ? 'text-primary-600' : 'text-[var(--color-danger)]'
                  }`}>{b.status === 'Confirmed' ? 'Đã xác nhận' : b.status === 'Pending' ? 'Chờ xử lý' : 'Đã huỷ'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Row 4: Recent Bookings + Recent Users (hidden on lg since we used 3 cols above) */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Booking Chart</h3>
            <span className="text-xs text-[var(--color-text-tertiary)]">+23% so với tuần trước</span>
          </div>
          <div className="flex items-end justify-between gap-2 h-32">
            {bookingData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.value / 20) * 100}%` }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="w-full rounded-md bg-gradient-to-t from-primary-400/60 to-primary-300/30 max-h-full"
                />
                <span className="text-[10px] text-[var(--color-text-tertiary)] font-medium">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Tăng trưởng người dùng</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Tuần này', value: 48, prev: 42 },
              { label: 'Tháng này', value: 186, prev: 152 },
              { label: 'Tổng cộng', value: stats.totalUsers ?? 0, prev: 0 },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <span className="text-xs text-[var(--color-text-secondary)]">{s.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{s.value.toLocaleString('vi-VN')}</span>
                  {s.prev > 0 && (
                    <span className="text-[11px] font-medium text-[var(--color-success)] bg-[var(--color-success)]/10 px-1.5 py-0.5 rounded-md">
                      +{((s.value - s.prev) / s.prev * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
