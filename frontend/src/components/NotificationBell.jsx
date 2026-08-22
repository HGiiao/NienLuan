import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellRing, CheckCheck, CheckCircle, Trash2, X, AlertCircle, Clock, DollarSign, CloudSun, Plane } from 'lucide-react'
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../services/api'
import { formatDistanceToNow } from '../utils/formatters'

const typeIcons = {
  price_drop: [DollarSign, '#10B981'],
  low_seats: [AlertCircle, '#EF4444'],
  weather: [CloudSun, '#3B82F6'],
  visa: [Plane, '#F59E0B'],
  booking_success: [CheckCircle, '#059669'],
}

// Điều hướng mặc định theo loại thông báo khi bấm vào
const typeRoutes = {
  promo: '/flights',
  price_drop: '/compare',
  low_seats: '/flights',
  announcement: '/',
  maintenance: '/',
  weather: '/',
  visa: '/',
  booking_success: '/bookings',
}

const readUserEmail = () => {
  try { return JSON.parse(sessionStorage.getItem('user'))?.email || null } catch { return null }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState(readUserEmail)
  const ref = useRef(null)
  const navigate = useNavigate()

  // 'user' trong sessionStorage được ghi bất đồng bộ sau khi mount (vd: clerk-sync) —
  // nghe event + poll nhẹ để chuông hiện ngay mà không cần chuyển trang
  useEffect(() => {
    const sync = () => {
      const next = readUserEmail()
      setEmail(prev => (prev === next ? prev : next))
    }
    window.addEventListener('ve247-auth-changed', sync)
    const iv = setInterval(sync, 1000)
    return () => { window.removeEventListener('ve247-auth-changed', sync); clearInterval(iv) }
  }, [])

  const fetchUnread = useCallback(async () => {
    if (!email) return
    try {
      const res = await getUnreadCount({ email })
      setUnread(res.data.count)
    } catch {}
  }, [email])

  const fetchNotifications = useCallback(async () => {
    if (!email) return
    setLoading(true)
    try {
      const res = await getNotifications({ email, page: 1, pageSize: 20 })
      setNotifications(res.data.items)
      setUnread(res.data.items.filter(n => !n.isRead).length)
    } catch {}
    setLoading(false)
  }, [email])

  useEffect(() => { fetchUnread(); const iv = setInterval(fetchUnread, 30000); return () => clearInterval(iv) }, [fetchUnread])

  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (!email) return null

  const handleMarkRead = async (id) => {
    const wasUnread = !notifications.find(n => n.id === id)?.isRead
    try {
      await markNotificationRead(id)
      setNotifications(p => p.map(n => n.id === id ? { ...n, isRead: true } : n))
      if (wasUnread) setUnread(p => Math.max(0, p - 1))
    } catch {}
  }

  const handleMarkAllRead = async () => {
    try { await markAllNotificationsRead({ email }); setNotifications(p => p.map(n => ({ ...n, isRead: true }))); setUnread(0) } catch {}
  }

  const handleDelete = async (id) => {
    try { await deleteNotification(id); setNotifications(p => p.filter(n => n.id !== id)) } catch {}
  }

  const handleOpen = async (n) => {
    handleMarkRead(n.id)
    setOpen(false)
    if (n.link) { navigate(n.link); return }
    navigate(typeRoutes[n.type] || '/')
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-xl hover:bg-[var(--color-border)]/30 transition-colors">
        {unread > 0 ? <BellRing className="w-5 h-5 text-accent-500" /> : <Bell className="w-5 h-5 text-[var(--color-text-tertiary)]" />}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 flex items-center justify-center bg-accent-500 text-white text-[10px] font-bold rounded-full min-w-[18px] min-h-[18px]">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }} transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[380px] max-h-[520px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
              <span className="text-sm font-bold text-[var(--color-text-primary)]">Thông báo</span>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-[11px] text-accent-500 font-semibold hover:underline">
                    <CheckCheck className="w-3.5 h-3.5" />Đã đọc tất cả
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-sm text-[var(--color-text-tertiary)]">Đang tải...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-10 h-10 mx-auto text-[var(--color-text-tertiary)] mb-3" />
                  <p className="text-sm text-[var(--color-text-tertiary)]">Chưa có thông báo nào</p>
                </div>
              ) : (
                notifications.map((n, i) => {
                  const Icon = typeIcons[n.type]?.[0] || Bell
                  const color = typeIcons[n.type]?.[1] || '#64748B'
                  return (
                    <motion.div key={n.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                      onClick={() => handleOpen(n)}
                      className={`flex gap-3 px-4 py-3 border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-50)] transition-colors cursor-pointer ${!n.isRead ? 'bg-accent-500/5' : ''}`}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                        <Icon className="w-4.5 h-4.5" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!n.isRead ? 'font-bold' : 'font-medium'} text-[var(--color-text-primary)] truncate`}>{n.title}</p>
                          {!n.isRead && <span className="w-2 h-2 rounded-full bg-accent-500 shrink-0 mt-1.5" />}
                        </div>
                        <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5 line-clamp-2">{n.message}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-[var(--color-text-tertiary)]">
                            {formatDistanceToNow(n.createdAt)}
                          </span>
                          <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id) }} className={`p-1 ${n.isRead ? 'text-[var(--color-text-tertiary)]' : 'text-accent-500'} hover:text-accent-600`}>
                              <CheckCheck className="w-3 h-3" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(n.id) }} className="p-1 text-[var(--color-text-tertiary)] hover:text-red-500">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
