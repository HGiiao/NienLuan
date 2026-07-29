import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Mail, Phone, CalendarDays, ShieldCheck, Ticket,
  LogOut, Plane, Star, Bell, Clock,
  Search, TrendingUp, Pencil, X, Check, Loader, Shield,
} from 'lucide-react'
import { getProfile, updateProfile, getPriceAlerts, deletePriceAlert } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'
import { useUser } from '@clerk/clerk-react'
import { Card, StatCard, SkeletonCard, ErrorState, Badge, Button } from '../ui'

const container = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const item = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U'
}

function Route(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" />
      <path d="M9 9l9 9" /><path d="M9 15l3-3" />
    </svg>
  )
}

function Train(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="16" rx="2" /><path d="M4 11h16" /><path d="M8 19l-2 3" /><path d="M16 19l2 3" /><circle cx="9" cy="15" r="1" /><circle cx="15" cy="15" r="1" />
    </svg>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const { isSignedIn, user: clerkUser } = useUser()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [editForm, setEditForm] = useState({ fullName: '', phone: '' })
  const [alerts, setAlerts] = useState([])
  const [alertsLoading, setAlertsLoading] = useState(false)

  const stored = (() => { try { return JSON.parse(localStorage.getItem('user')) } catch { return null } })()

  useEffect(() => {
    if (!stored && !isSignedIn) { navigate('/auth'); return }

    const load = async () => {
      try {
        let email = ''
        if (isSignedIn && clerkUser) email = clerkUser.primaryEmailAddress?.emailAddress || ''
        else if (stored) { const u = JSON.parse(localStorage.getItem('user')); email = u.email || '' }
        if (!email) { setLoading(false); return }
        const res = await getProfile(email)
        setProfile(res.data)
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể tải thông tin')
      } finally { setLoading(false) }
    }
    load()

    const loadAlerts = async () => {
      const u = (() => { try { return JSON.parse(localStorage.getItem('user')) } catch { return null } })()
      const email = u?.email || clerkUser?.primaryEmailAddress?.emailAddress
      if (!email) return
      setAlertsLoading(true)
      try {
        const res = await getPriceAlerts(email)
        setAlerts(res.data)
      } catch {} finally { setAlertsLoading(false) }
    }
    loadAlerts()
  }, [navigate, isSignedIn, clerkUser])

  const data = {
    name: profile?.fullName || stored?.fullName || clerkUser?.fullName || 'Người dùng',
    email: profile?.email || stored?.email || clerkUser?.primaryEmailAddress?.emailAddress || '',
    phone: profile?.phone || stored?.phone || clerkUser?.primaryPhoneNumber?.phoneNumber || '',
    verified: profile?.isEmailVerified ?? true,
    joined: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi-VN') : '—',
  }

  const initials = getInitials(data.name)

  const startEditing = () => {
    setEditForm({ fullName: data.name, phone: data.phone })
    setEditing(true)
    setSuccessMsg('')
    setError('')
  }

  const cancelEditing = () => {
    setEditing(false)
    setSuccessMsg('')
    setError('')
  }

  const handleSave = async () => {
    if (!editForm.fullName.trim()) return
    setSaving(true)
    setSuccessMsg('')
    setError('')
    try {
      const res = await updateProfile({
        email: data.email,
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim(),
      })
      setProfile(res.data)
      if (stored) {
        const updated = { ...stored, fullName: editForm.fullName.trim(), phone: editForm.phone.trim() }
        localStorage.setItem('user', JSON.stringify(updated))
      }
      setEditing(false)
      setSuccessMsg('Cập nhật thông tin thành công')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Cập nhật thất bại')
    } finally { setSaving(false) }
  }

  const stats = [
    { icon: Ticket, label: 'Đặt chỗ', value: '—', color: 'text-primary-500', bg: 'bg-primary-500/10' },
    { icon: Plane, label: 'Chuyến bay', value: '—', color: 'text-primary-400', bg: 'bg-primary-500/10' },
    { icon: Train, label: 'Tàu hỏa', value: '—', color: 'text-primary-400', bg: 'bg-primary-500/10' },
    { icon: Star, label: 'Đánh giá', value: '—', color: 'text-primary-400', bg: 'bg-primary-500/10' },
  ]

  const infoCards = [
    { icon: Mail, label: 'Địa chỉ email', value: data.email, bg: 'bg-primary-500/10', color: 'text-primary-400', edit: false },
    { icon: Phone, label: 'Số điện thoại', value: data.phone || 'Chưa cập nhật', bg: 'bg-primary-500/10', color: 'text-primary-500', edit: true },
    { icon: CalendarDays, label: 'Ngày tham gia', value: data.joined, bg: 'bg-primary-500/10', color: 'text-primary-400', edit: false },
    { icon: ShieldCheck, label: 'Trạng thái bảo mật', value: data.verified ? 'Đã xác thực' : 'Chưa xác thực', bg: 'bg-primary-500/10', color: 'text-primary-400', valueColor: data.verified ? 'text-[var(--color-success)]' : 'text-primary-400', edit: false },
  ]

  const actions = [
    { icon: Search, label: 'Tìm vé', to: '/flights', desc: 'So sánh giá vé mới nhất', gradient: 'from-primary-500 to-primary-600' },
    { icon: Ticket, label: 'Đặt chỗ', to: '/bookings', desc: 'Tra cứu vé đã đặt', gradient: 'from-primary-500 to-primary-600' },
    { icon: TrendingUp, label: 'Xu hướng & So sánh', to: '/compare', desc: 'Theo dõi biến động & so sánh giá', gradient: 'from-primary-500 to-primary-600' },
    { icon: Route, label: 'Lộ trình', to: '/optimal-route', desc: 'Tối ưu hành trình', gradient: 'from-primary-500 to-primary-600' },
    ...(stored?.role === 'Admin' ? [{ icon: Shield, label: 'Quản trị', to: '/admin', desc: 'Dashboard quản lý hệ thống', gradient: 'from-primary-500 to-primary-600' }] : []),
  ]

  const handleLogout = () => { localStorage.removeItem('user'); navigate('/auth') }

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-[var(--color-border)] rounded-3xl" />
          <div className="flex items-center gap-5 px-6 -mt-14 relative z-10">
            <div className="w-24 h-24 rounded-2xl bg-[var(--color-border)] ring-4 ring-white" />
            <div className="space-y-2 flex-1"><div className="h-6 bg-[var(--color-border)] rounded-lg w-48" /><div className="h-4 bg-[var(--color-border)] rounded-lg w-32" /></div>
          </div>
          <SkeletonCard lines={2} />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} lines={1} />)}
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <ErrorState
          title="Không thể tải thông tin"
          desc={error}
          action="Về trang chủ"
          onAction={() => navigate('/')}
        />
      </section>
    )
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      <motion.div variants={container} initial="initial" animate="animate">
        <motion.div variants={item} className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')]" />
          <div className="absolute top-0 right-0 w-72 h-72 bg-primary-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-[80px]" />

          <div className="relative p-6 md:p-10 pb-28 md:pb-32">
            <div className="max-w-6xl mx-auto">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="primary" size="sm" icon={ShieldCheck} className="mb-4">
                  {data.verified ? 'Đã xác thực' : 'Chưa xác thực'}
                </Badge>
                {editing ? (
                  <input
                    value={editForm.fullName}
                    onChange={e => setEditForm(p => ({ ...p, fullName: e.target.value }))}
                    className="text-3xl md:text-4xl font-bold text-white bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 w-full max-w-md outline-none focus:ring-2 focus:ring-primary-500 mb-1"
                    placeholder="Họ và tên"
                  />
                ) : (
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 tracking-tight flex items-center gap-3">
                    {data.name}
                    {stored?.role === 'Admin' && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary-500/20 text-primary-200 px-2.5 py-1 rounded-full border border-primary-500/30">
                        <Shield className="w-3 h-3" />
                        Admin
                      </span>
                    )}
                  </h1>
                )}
                <p className="text-white/60 text-sm flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {data.email}
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-white/60 bg-white/10 px-3 py-2 rounded-xl backdrop-blur-sm">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {data.joined}
                </span>
                {editing ? (
                  <div className="flex items-center gap-1.5">
                    <button onClick={handleSave} disabled={saving}
                      className="flex items-center gap-1 bg-[var(--color-success)] text-white px-3 py-2 rounded-xl text-xs font-semibold hover:brightness-110 transition-all disabled:opacity-60">
                      {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Lưu
                    </button>
                    <button onClick={cancelEditing} disabled={saving}
                      className="flex items-center gap-1 bg-white/10 text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-white/20 transition-all">
                      <X className="w-3.5 h-3.5" />
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button onClick={startEditing}
                    className="flex items-center gap-1.5 text-xs text-white/60 bg-white/10 px-3 py-2 rounded-xl backdrop-blur-sm hover:bg-white/20 hover:text-white transition-all">
                    <Pencil className="w-3.5 h-3.5" />
                    Chỉnh sửa
                  </button>
                )}
              </div>
            </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 pb-6 md:pb-8">
            <div className="max-w-6xl mx-auto px-6 md:px-0">
            <div className="flex items-end gap-6">
              <div className="-mt-20 w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center ring-4 ring-white shadow-2xl">
                <span className="text-3xl font-bold text-white drop-shadow">{initials}</span>
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-0.5">Thành viên</p>
                <p className="text-white font-semibold">{data.email}</p>
              </div>
            </div>
            </div>
          </div>
        </motion.div>

        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 text-sm text-[var(--color-success)] bg-[var(--color-success)]/10 px-4 py-3 rounded-xl border border-[var(--color-success)]/20">
            <Check className="w-4 h-4" />
            {successMsg}
          </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/10 px-4 py-3 rounded-xl">
            <X className="w-4 h-4" />
            {error}
          </motion.div>
        )}

        <motion.div variants={item} className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 -mt-6 relative z-10">
          {stats.map((s, i) => (
            <StatCard key={i} icon={s.icon} label={s.label} value={s.value} color={s.color} bg={s.bg} delay={i * 0.06} />
          ))}
        </motion.div>

        <motion.div variants={item} className="max-w-6xl mx-auto mt-6 md:mt-8">
          <div className="flex items-center justify-between mb-3 md:mb-4 px-1">
            <h2 className="text-sm font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
              Thông tin cá nhân
            </h2>
            {!editing && (
              <button onClick={startEditing}
                className="flex items-center gap-1 text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors md:hidden">
                <Pencil className="w-3.5 h-3.5" />
                Chỉnh sửa
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {infoCards.map((c, i) => (
              <Card key={i} variant="hover" padding="md">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center ${c.color} shrink-0`}>
                    <c.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--color-text-tertiary)] font-medium mb-0.5">{c.label}</p>
                    {editing && c.edit ? (
                      <input
                        value={editForm.phone}
                        onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                        className="w-full text-sm font-semibold text-[var(--color-text-primary)] bg-[var(--color-surface-50)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Nhập số điện thoại"
                      />
                    ) : (
                      <p className={`text-sm font-semibold ${c.valueColor || 'text-[var(--color-text-primary)]'} truncate`}>{c.value}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {editing && (
            <div className="flex items-center gap-2 mt-4 md:hidden">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-primary-500 text-white py-3 rounded-xl text-sm font-semibold hover:bg-primary-600 transition-all disabled:opacity-60">
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Lưu thay đổi
              </button>
              <button onClick={cancelEditing} disabled={saving}
                className="flex items-center justify-center gap-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] px-5 py-3 rounded-xl text-sm font-semibold hover:bg-[var(--color-border)]/30 transition-all">
                <X className="w-4 h-4" />
                Hủy
              </button>
            </div>
          )}
        </motion.div>

        <motion.div variants={item} className="max-w-6xl mx-auto mt-6 md:mt-8">
          <h2 className="text-sm font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3 md:mb-4 px-1">
            Tiện ích nhanh
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {actions.map((a, i) => {
              const Icon = a.icon
              return (
                <Link key={i} to={a.to}>
                  <Card variant="interactive" padding="md">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.gradient} flex items-center justify-center text-white shadow-sm mb-3 group-hover:scale-110 transition-transform duration-200`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{a.label}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{a.desc}</p>
                  </Card>
                </Link>
              )
            })}
          </div>
        </motion.div>

        {alerts.length > 0 && (
          <motion.div variants={item} className="max-w-6xl mx-auto mt-6 md:mt-8">
            <h2 className="text-sm font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3 md:mb-4 px-1">
              <Bell className="w-4 h-4 inline mr-1.5 text-accent-500" />
              Đang theo dõi ({alerts.length})
            </h2>
            <div className="space-y-3">
              {alerts.map(a => (
                <Card key={a.id} variant="hover" padding="md">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-500">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {a.routeFrom} → {a.routeTo}
                        </p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          Mục tiêu: <span className="font-bold text-accent-500">{formatCurrencyVnd(a.targetPrice)}</span>
                          {a.currentPrice != null && <> · Hiện tại: {formatCurrencyVnd(a.currentPrice)}</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => deletePriceAlert(a.id).then(() => setAlerts(as => as.filter(x => x.id !== a.id)))}
                        className="text-xs text-[var(--color-danger)] hover:underline">
                        Hủy
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {!isSignedIn && (
          <motion.div variants={item} className="max-w-6xl mx-auto mt-6">
            <Button variant="danger" className="w-full justify-center" onClick={handleLogout} icon={LogOut}>
              Đăng xuất
            </Button>
          </motion.div>
        )}
      </motion.div>
    </section>
  )
}