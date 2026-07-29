import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { motion } from 'framer-motion'
import { CheckCircle, Plane, Train, User, Mail, Phone, Users, CalendarDays, CreditCard, ArrowRight, Ticket, Home } from 'lucide-react'
import { getBooking } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
}

const statusConfig = {
  Pending: { label: 'Chờ xác nhận', class: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  Confirmed: { label: 'Đã xác nhận', class: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20' },
  Cancelled: { label: 'Đã hủy', class: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20' },
}

export default function BookingConfirmation() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isSignedIn } = useUser()
  const localUser = getStoredUser()
  const isAuth = isSignedIn || !!localUser
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuth) navigate('/auth', { replace: true })
  }, [])

  useEffect(() => {
    if (!isAuth) return
    getBooking(id)
      .then(res => setBooking(res.data))
      .catch(() => setBooking(null))
      .finally(() => setLoading(false))
  }, [id])

  if (!isAuth) return null

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"
        />
        <p className="text-[var(--color-text-secondary)]">Đang tải thông tin đặt chỗ...</p>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center mx-auto mb-4">
          <Ticket className="w-7 h-7 text-[var(--color-danger)]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Không tìm thấy đặt chỗ</h2>
        <p className="text-[var(--color-text-secondary)] mb-6">Mã đặt chỗ không tồn tại hoặc đã bị xoá</p>
        <button onClick={() => navigate('/')} className="bg-primary-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-600 transition-all">
          Về trang chủ
        </button>
      </div>
    )
  }

  const item = booking.flight || booking.train
  const type = booking.flight ? 'flight' : 'train'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-lg mx-auto px-4 py-6 md:py-10"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        className="w-20 h-20 rounded-full bg-[var(--color-success)]/10 flex items-center justify-center mx-auto mb-5"
      >
        <CheckCircle className="w-10 h-10 text-[var(--color-success)]" />
      </motion.div>

      <h1 className="text-2xl md:text-3xl font-bold text-center text-[var(--color-text-primary)] mb-1">Đặt vé thành công!</h1>
      <p className="text-center text-[var(--color-text-secondary)] mb-6">Thông tin đặt chỗ đã được ghi nhận</p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-5 md:p-6 shadow-sm space-y-5"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Mã đặt chỗ</span>
          <span className="text-lg font-bold text-[var(--color-text-primary)]">#{booking.id}</span>
        </div>

        <div className="h-px bg-[var(--color-border)]" />

        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            type === 'flight'
              ? 'bg-primary-50 text-primary-500'
              : 'bg-primary-50 text-primary-500'
          }`}>
            {type === 'flight' ? <Plane className="w-5 h-5" /> : <Train className="w-5 h-5" />}
          </div>
          <div>
            <p className="font-semibold text-[var(--color-text-primary)]">
              {type === 'flight' ? `${item.airlineCode}${item.id}` : item.trainCode}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {item.departureLocation} <ArrowRight className="w-3 h-3 inline" /> {item.arrivalLocation}
            </p>
          </div>
          <div className={`ml-auto px-3 py-1 rounded-lg border text-xs font-semibold ${statusConfig[booking.status]?.class || ''}`}>
            {statusConfig[booking.status]?.label || booking.status}
          </div>
        </div>

        <div className="h-px bg-[var(--color-border)]" />

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0" />
            <span className="text-sm text-[var(--color-text-secondary)]">
              Ngày đi: <strong className="text-[var(--color-text-primary)]">{new Date(item.departureTime).toLocaleDateString('vi-VN')}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0" />
            <span className="text-sm text-[var(--color-text-secondary)]">
              Hành khách: <strong className="text-[var(--color-text-primary)]">{booking.user?.fullName || '--'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0" />
            <span className="text-sm text-[var(--color-text-secondary)]">
              Email: <strong className="text-[var(--color-text-primary)]">{booking.user?.email || '--'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0" />
            <span className="text-sm text-[var(--color-text-secondary)]">
              Điện thoại: <strong className="text-[var(--color-text-primary)]">{booking.user?.phone || '--'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0" />
            <span className="text-sm text-[var(--color-text-secondary)]">
              Số khách: <strong className="text-[var(--color-text-primary)]">{booking.passengers}</strong>
            </span>
          </div>
        </div>

        <div className="h-px bg-[var(--color-border)]" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <CreditCard className="w-4 h-4" />
            Tổng tiền:
          </div>
          <span className="text-2xl font-bold text-primary-500">{formatCurrencyVnd(booking.totalPrice)}</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-3 mt-6"
      >
        <button
          onClick={() => navigate('/bookings')}
          className="flex-1 flex items-center justify-center gap-2 bg-primary-500 text-white py-3.5 rounded-xl font-semibold hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20"
        >
          <Ticket className="w-4 h-4" />
          Xem đặt chỗ của tôi
        </button>
        <button
          onClick={() => navigate('/')}
          className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] py-3.5 rounded-xl font-medium transition-all"
        >
          <Home className="w-4 h-4" />
          Về trang chủ
        </button>
      </motion.div>
    </motion.div>
  )
}