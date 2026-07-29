import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, DollarSign, Users, Ticket, MapPin, Building2,
  ArrowUp, ArrowDown, Activity,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Area,
} from 'recharts'
import { getAdminStats } from '../../services/api'

const PERIODS = [
  { key: 7, label: '7 ngày' },
  { key: 30, label: '30 ngày' },
  { key: 90, label: '90 ngày' },
  { key: 365, label: '1 năm' },
]

const DONUT_COLORS = ['var(--color-chart-3)', 'var(--color-chart-2)', 'var(--color-chart-5)', '#6B7280']

const statusLabels = { Confirmed: 'Đã xác nhận', Pending: 'Chờ xử lý', Cancelled: 'Đã huỷ' }
const statusColors = { Confirmed: 'text-[var(--color-success)]', Pending: 'text-primary-600', Cancelled: 'text-[var(--color-danger)]' }
const statusBg = { Confirmed: 'bg-[var(--color-success)]/10 border-[var(--color-success)]/20', Pending: 'bg-primary-50 border-primary-200', Cancelled: 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/20' }

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
}

function formatVnd(n) {
  if (n == null) return '0 ₫'
  return Number(n).toLocaleString('vi-VN') + ' ₫'
}

export default function StatsPage() {
  const [period, setPeriod] = useState(30)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(() => {
    setLoading(true)
    getAdminStats({ period })
      .then(res => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  useEffect(() => { fetchStats() }, [fetchStats])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-[var(--color-border)] rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-72 bg-[var(--color-border)] rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-[var(--color-border)] rounded-xl" />)}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-56 bg-[var(--color-border)] rounded-xl" />)}
        </div>
      </div>
    )
  }

  const s = stats || {}
  const rev = s.revenueComparison || {}
  const growth = s.growthMetrics || {}
  const dist = s.bookingStatusDistribution || []
  const distTotal = dist.reduce((sum, d) => sum + d.count, 0)

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header + Period Filter */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Thống kê chi tiết</h2>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-0.5">Dữ liệu tổng hợp từ hệ thống</p>
        </div>
        <div className="flex items-center gap-1.5 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-1">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p.key
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Row 1: Revenue Line Chart + KPI Cards */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Doanh thu theo ngày</h3>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">Chu kỳ {PERIODS.find(p => p.key === period)?.label.toLowerCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{formatVnd(rev.current)}</p>
              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${rev.change >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                {rev.change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {Math.abs(rev.change)}% so với kỳ trước
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={s.revenueOverTime || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} tickFormatter={v => v?.slice(5) || ''} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} tickFormatter={v => (v / 1000000).toFixed(0) + 'tr'} />
                <Tooltip
                  formatter={val => [formatVnd(val), 'Doanh thu']}
                  labelFormatter={l => 'Ngày ' + l}
                  contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-bg-card)' }}
                />
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="revenue" stroke="none" fill="url(#revGrad)" />
                <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} dot={{ r: 3, fill: '#2563EB' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <KPICard
            icon={DollarSign} label="Doanh thu kỳ này" value={formatVnd(rev.current)}
            change={rev.change} color="primary"
          />
          <KPICard
            icon={Ticket} label="Đặt chỗ (tuần này)" value={growth.bookingsThisWeek ?? 0}
            change={growth.bookingsWoW} color="accent"
          />
          <KPICard
            icon={Users} label="Người dùng mới (tuần)" value={growth.usersThisWeek ?? 0}
            change={growth.usersWoW} color="emerald"
          />
          <KPICard
            icon={TrendingUp} label="Doanh thu (tuần)" value={formatVnd(growth.revenueThisWeek)}
            change={growth.revenueWoW} color="rose"
          />
        </div>
      </motion.div>

      {/* Row 2: Donut + Monthly Bar */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Booking Status Donut */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Phân bố trạng thái đặt chỗ</h3>
            <span className="text-xs text-[var(--color-text-tertiary)]">{distTotal} tổng</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="h-48 w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dist}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="count" nameKey="status"
                    paddingAngle={3}
                  >
                    {dist.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [val, statusLabels[name] || name]}
                    contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-bg-card)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {dist.map((d, i) => (
                <div key={d.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="text-xs text-[var(--color-text-secondary)]">{statusLabels[d.status] || d.status}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">{d.count}</span>
                    <span className="text-[10px] text-[var(--color-text-tertiary)] w-10 text-right">
                      {distTotal > 0 ? Math.round(d.count / distTotal * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Revenue Bar */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Doanh thu theo tháng</h3>
            <span className="text-xs text-[var(--color-text-tertiary)]">12 tháng qua</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.monthlyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} tickFormatter={v => (v / 1000000).toFixed(0) + 'tr'} />
                <Tooltip
                  formatter={val => [formatVnd(val), 'Doanh thu']}
                  contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-bg-card)' }}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {(s.monthlyRevenue || []).map((_, i) => (
                    <Cell key={i} fill={i === ((s.monthlyRevenue || []).length - 1) ? '#2563EB' : '#93C5FD'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Row 3: Top Train Routes + Airline Market Share + Recent Transactions */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Train Routes */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            Top tuyến tàu
          </h3>
          <div className="space-y-3">
            {(s.topTrainRoutes || []).length === 0 ? (
              <p className="text-xs text-[var(--color-text-tertiary)] py-8 text-center">Chưa có dữ liệu</p>
            ) : (
              (s.topTrainRoutes || []).map((r, i) => {
                const max = Math.max(...(s.topTrainRoutes || []).map(x => x.count), 1)
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] w-3">{i + 1}</span>
                    <span className="text-xs text-[var(--color-text-secondary)] flex-1 truncate">{r.route}</span>
                    <div className="w-20 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(r.count / max) * 100}%` }}
                        transition={{ duration: 0.6, delay: i * 0.08 }}
                        className="h-full rounded-full bg-primary-400"
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] w-6 text-right">{r.count}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Airline Market Share */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            Thị phần hãng bay
          </h3>
          <div className="space-y-3">
            {(s.airlineMarketShare || []).length === 0 ? (
              <p className="text-xs text-[var(--color-text-tertiary)] py-8 text-center">Chưa có dữ liệu</p>
            ) : (
              (s.airlineMarketShare || []).map((a, i) => {
                const max = Math.max(...(s.airlineMarketShare || []).map(x => x.count), 1)
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-[var(--color-text-secondary)] flex-1 truncate">{a.airline}</span>
                    <div className="w-20 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(a.count / max) * 100}%` }}
                        transition={{ duration: 0.6, delay: i * 0.08 }}
                        className="h-full rounded-full bg-primary-400"
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] w-8 text-right">{a.count}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            Giao dịch gần đây
          </h3>
          <div className="space-y-2.5">
            {(s.recentTransactions || []).length === 0 ? (
              <p className="text-xs text-[var(--color-text-tertiary)] py-8 text-center">Chưa có giao dịch</p>
            ) : (
              (s.recentTransactions || []).map((t, i) => (
                <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-[var(--color-border)]/50 last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-[var(--color-text-tertiary)]">#{t.id}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{t.userName}</p>
                      <p className="text-[10px] text-[var(--color-text-tertiary)]">{t.date}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-[var(--color-text-primary)]">{formatVnd(t.amount)}</p>
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold border ${statusBg[t.status] || statusBg.Pending} ${statusColors[t.status] || statusColors.Pending}`}>
                      {statusLabels[t.status] || t.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* Row 4: Growth Metrics */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GrowthCard
          icon={Users} label="Người dùng mới" current={growth.usersThisWeek ?? 0}
          previous={growth.usersLastWeek ?? 0} change={growth.usersWoW}
        />
        <GrowthCard
          icon={Ticket} label="Đặt chỗ mới" current={growth.bookingsThisWeek ?? 0}
          previous={growth.bookingsLastWeek ?? 0} change={growth.bookingsWoW}
        />
        <GrowthCard
          icon={DollarSign} label="Doanh thu" current={formatVnd(growth.revenueThisWeek)}
          previous={formatVnd(growth.revenueLastWeek)} change={growth.revenueWoW}
          isCurrency
        />
      </motion.div>
    </motion.div>
  )
}

function KPICard({ icon: Icon, label, value, change, color }) {
  const isPositive = change != null && change >= 0
  const colorMap = {
    primary: { bg: 'bg-primary-50 text-primary-500' },
    accent: { bg: 'bg-primary-50 text-primary-500' },
    amber: { bg: 'bg-primary-50 text-primary-500' },
    emerald: { bg: 'bg-primary-50 text-primary-500' },
    rose: { bg: 'bg-primary-50 text-primary-500' },
  }
  const c = colorMap[color] || colorMap.primary

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.bg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-[11px] text-[var(--color-text-tertiary)] mb-0.5">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-base font-bold text-[var(--color-text-primary)]">{value}</span>
        {change != null && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1 py-0.5 rounded-md ${
            isPositive ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
          }`}>
            {isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  )
}

function GrowthCard({ icon: Icon, label, current, previous, change, isCurrency }) {
  const isPositive = change != null && change >= 0

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPositive ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--color-text-primary)]">{label}</p>
          <p className="text-[10px] text-[var(--color-text-tertiary)]">Tuần này vs tuần trước</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-[var(--color-text-primary)]">{current}</p>
          <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">Kỳ trước: {previous}</p>
        </div>
        {change != null && (
          <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold ${
            isPositive ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
          }`}>
            {isPositive ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
    </div>
  )
}
