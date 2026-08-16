import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, CalendarDays, Clock, AlertCircle,
  Plus, Plane, Train, Ticket, UserPlus,
  ChevronRight, Home,
} from 'lucide-react'
import { AdminProvider, AdminSidebar, ToastContainer, ConfirmDialog } from '../admin'
import GlobalSearch from '../admin/GlobalSearch'
import NotificationBell from '../components/NotificationBell'
import Overview from '../admin/pages/Overview'
import FlightsPage from '../admin/pages/FlightsPage'
import TrainsPage from '../admin/pages/TrainsPage'
import BusesPage from '../admin/pages/BusesPage'
import BookingsPage from '../admin/pages/BookingsPage'
import UsersPage from '../admin/pages/UsersPage'
import SubscriptionsPage from '../admin/pages/SubscriptionsPage'
import PromoCodesPage from '../admin/pages/PromoCodesPage'
import NotificationsPage from '../admin/pages/NotificationsPage'
import StatsPage from '../admin/pages/StatsPage'
import { getAdminDashboard } from '../services/api'

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

const quickActions = [
  { id: 'flights', label: 'Thêm chuyến bay', icon: Plane, color: 'bg-primary-50 text-primary-600 hover:bg-primary-100' },
  { id: 'trains', label: 'Thêm tàu hỏa', icon: Train, color: 'bg-primary-50 text-primary-600 hover:bg-primary-100' },
  { id: 'bookings', label: 'Tạo booking', icon: Ticket, color: 'bg-primary-50 text-primary-600 hover:bg-primary-100' },
  { id: 'users', label: 'Thêm người dùng', icon: UserPlus, color: 'bg-primary-50 text-primary-600 hover:bg-primary-100' },
]

const tabBreadcrumb = {
  overview: { label: 'Tổng quan', parent: '' },
  flights: { label: 'Chuyến bay', parent: 'Quản lý' },
  trains: { label: 'Tàu hỏa', parent: 'Quản lý' },
  buses: { label: 'Xe khách', parent: 'Quản lý' },
  bookings: { label: 'Đặt chỗ', parent: 'Quản lý' },
  users: { label: 'Người dùng', parent: 'Quản lý' },
  subscriptions: { label: 'Gói VIP', parent: 'Quản lý' },
  promos: { label: 'Mã giảm giá', parent: 'Khuyến mãi' },
  notifications: { label: 'Thông báo', parent: 'Truyền thông' },
  stats: { label: 'Thống kê', parent: 'Báo cáo' },
}

function AdminShell() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [collapsed, setCollapsed] = useState(false)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    getAdminDashboard()
      .then(res => setDashboard(res.data))
      .catch(err => setError(err.response?.data?.message || 'Không thể tải dữ liệu'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const storedUser = (() => {
    try { return JSON.parse(sessionStorage.getItem('user')) } catch { return null }
  })()

  const handleLogout = () => {
    sessionStorage.removeItem('user')
    sessionStorage.removeItem('loginMethod')
    sessionStorage.removeItem('ve247-auth')
    navigate('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center mx-auto mb-4 shadow-sm"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </motion.div>
          <p className="text-sm text-[var(--color-text-secondary)] font-medium">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-[var(--color-danger)]" />
          </div>
          <p className="text-[var(--color-text-primary)] font-semibold mb-1">Không thể tải dữ liệu</p>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 transition-all shadow-sm">
            Thử lại
          </button>
        </motion.div>
      </div>
    )
  }

  const breadcrumb = tabBreadcrumb[activeTab] || tabBreadcrumb.overview

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex">
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-[72px] shrink-0 border-b border-[var(--color-border)] bg-[var(--color-header)] flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <nav className="hidden md:flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
              <Home className="w-3.5 h-3.5" />
              <ChevronRight className="w-3 h-3" />
              {breadcrumb.parent && (
                <>
                  <span>{breadcrumb.parent}</span>
                  <ChevronRight className="w-3 h-3" />
                </>
              )}
              <span className="text-[var(--color-text-primary)] font-medium">{breadcrumb.label}</span>
            </nav>
            <h2 className="text-base font-bold text-[var(--color-text-primary)] md:hidden">
              {breadcrumb.label}
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Global Search — ⌘K */}
            <GlobalSearch onNavigate={setActiveTab} />

            {/* Notification — chuông thật từ backend */}
            <div className="w-9 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-center">
              <NotificationBell />
            </div>

            {/* Clock */}
            <div className="hidden md:flex items-center gap-1.5 px-3 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
              <Clock className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
              <span className="text-xs text-[var(--color-text-secondary)] font-medium">
                {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Avatar + Name */}
            <div className="flex items-center gap-2 px-3 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
              <div className="w-6 h-6 rounded-lg bg-primary-50 flex items-center justify-center">
                <span className="text-[9px] font-bold text-primary-600">
                  {(storedUser?.fullName || storedUser?.email || 'A')[0].toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-[var(--color-text-secondary)] font-medium hidden sm:inline max-w-[100px] truncate">
                {storedUser?.fullName || storedUser?.email || 'Admin'}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-center hover:bg-[var(--color-danger)]/10 hover:border-[var(--color-danger)]/20 transition-colors group"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-danger)] transition-colors" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {/* Quick Actions (only on overview) */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-6 pb-5 border-b border-[var(--color-border)]"
            >
              {quickActions.map(a => {
                const Icon = a.icon
                return (
                  <button
                    key={a.id}
                    onClick={() => setActiveTab(a.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${a.color}`}
                  >
                    <Icon className="w-4 h-4" />
                    {a.label}
                  </button>
                )
              })}
              <span className="text-[11px] text-[var(--color-text-tertiary)] ml-auto">Hoạt động gần đây</span>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {activeTab === 'overview' && <Overview onNavigate={setActiveTab} />}
              {activeTab === 'flights' && <FlightsPage />}
              {activeTab === 'trains' && <TrainsPage />}
              {activeTab === 'buses' && <BusesPage />}
              {activeTab === 'bookings' && <BookingsPage />}
              {activeTab === 'users' && <UsersPage />}
              {activeTab === 'subscriptions' && <SubscriptionsPage />}
              {activeTab === 'promos' && <PromoCodesPage />}
              {activeTab === 'notifications' && <NotificationsPage />}
              {activeTab === 'stats' && <StatsPage />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <AdminProvider>
      <AdminShell />
      <ToastContainer />
      <ConfirmDialog />
    </AdminProvider>
  )
}
