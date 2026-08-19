import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, Wallet, Building2, CheckCircle, XCircle, Plane, Train, Bus, ArrowRight, Ticket, Home, RefreshCw, Shield, Loader, Clock } from 'lucide-react'
import { getBooking, processPayment } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'

function getStoredUser() {
  try { return JSON.parse(sessionStorage.getItem('user')) } catch { return null }
}

const paymentMethods = [
  { id: 'credit_card', label: 'Thẻ tín dụng', icon: CreditCard },
  { id: 'e_wallet', label: 'Ví điện tử', icon: Wallet },
  { id: 'bank_transfer', label: 'Chuyển khoản', icon: Building2 },
]

const statusConfig = {
  Pending: { label: 'Chờ xác nhận', class: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  Confirmed: { label: 'Đã xác nhận', class: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20' },
  Cancelled: { label: 'Đã hủy', class: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20' },
}

export default function PaymentPage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isSignedIn, isLoaded } = useUser()
  const localUser = getStoredUser()
  const tabAuth = sessionStorage.getItem('ve247-auth')
  const isAuth = (isSignedIn && tabAuth) || (!!localUser && localUser?.loginMethod !== 'clerk')
  const authReady = isLoaded || !!localUser

  const [booking, setBooking] = useState(location.state?.booking || null)
  const [item, setItem] = useState(location.state?.item || null)
  const [type, setType] = useState(location.state?.type || null)
  const [segments, setSegments] = useState(null)
  const isMultiLeg = type === 'multi' || (booking?.segments?.length || 0) > 0
  const multiSegs = segments || booking?.segments || []
  const [status, setStatus] = useState('processing')
  const [error, setError] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState(location.state?.booking?.paymentMethod || 'credit_card')

  useEffect(() => {
    if (authReady && !isAuth) {
      const dest = `/auth?redirect=${encodeURIComponent(`/payment/${bookingId}`)}`
      navigate(dest, { replace: true })
    }
  }, [authReady, isAuth, bookingId, navigate])

  if (!authReady) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Loader className="w-10 h-10 animate-spin text-primary-500 mx-auto mb-4" />
        <p className="text-[var(--color-text-secondary)]">Đang tải...</p>
      </div>
    )
  }

  if (!isAuth) return null

  useEffect(() => {
    if (!booking) {
      getBooking(bookingId)
        .then(res => {
          setBooking(res.data)
          if (res.data.segments?.length) {
            // Lộ trình kết hợp: nhiều chặng trong 1 booking
            setSegments(res.data.segments)
            setItem(res.data.segments[0])
            setType('multi')
          } else {
            const i = res.data.flight || res.data.train || res.data.bus
            setItem(i)
            setType(res.data.flight ? 'flight' : res.data.train ? 'train' : 'bus')
          }
        })
        .catch(() => setError('Không tìm thấy thông tin đặt chỗ'))
    }
  }, [bookingId])

  const doPayment = async () => {
    setStatus('processing')
    setError('')
    try {
      const res = await processPayment(bookingId, {
        paymentMethod: booking?.paymentMethod || selectedMethod,
        provider: booking?.paymentProvider || location.state?.walletProvider || null,
      })
      const data = res.data

      if (data.redirect && data.paymentUrl) {
        window.location.href = data.paymentUrl
        return
      }

      setTransactionId(data.transactionId || '')
      setBooking(data.booking)
      setAwaitingConfirmation(!!data.pending)
      setStatus('success')
    } catch (err) {
      const msg = err.response?.data?.message || 'Giao dịch không thể hoàn tất. Vui lòng thử lại.'
      setError(msg)
      setStatus('failed')
    }
  }

  useEffect(() => {
    if (booking && status === 'processing' && !error) {
      doPayment()
    }
  }, [booking, error])

  const isFlight = type === 'flight'
  const isBus = type === 'bus'
  const method = paymentMethods.find(m => m.id === (booking?.paymentMethod || selectedMethod))
  const provider = booking?.paymentProvider || location.state?.walletProvider || null

  if (error && !booking) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-7 h-7 text-[var(--color-danger)]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Không tìm thấy đặt chỗ</h2>
        <p className="text-[var(--color-text-secondary)] mb-6">{error}</p>
        <button onClick={() => navigate('/')} className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md">
          Về trang chủ
        </button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-lg mx-auto px-4 py-6 md:py-10"
    >
      <AnimatePresence mode="wait">
        {status === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-20 h-20 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-6"
            />
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Đang xử lý thanh toán...</h1>
            <p className="text-[var(--color-text-secondary)] mb-6">Vui lòng không đóng trang này</p>

            <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">Mã đặt chỗ</span>
                <span className="font-bold text-[var(--color-text-primary)]">#{bookingId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">Phương thức</span>
                <span className="font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  {method && <method.icon className="w-4 h-4 text-[var(--color-text-tertiary)]" />}
                  {method?.label || booking?.paymentMethod || 'Chưa chọn'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                <span className="font-semibold text-[var(--color-text-primary)]">Số tiền</span>
                <span className="text-xl font-black text-primary-500">{formatCurrencyVnd(booking?.totalPrice || 0)}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {paymentMethods.map(pm => {
                const active = pm.id === (booking?.paymentMethod || selectedMethod)
                return (
                  <button
                    key={pm.id}
                    disabled
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all ${
                      active
                        ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                        : 'border-[var(--color-border)] text-[var(--color-text-tertiary)] opacity-50'
                    }`}
                  >
                    <pm.icon className="w-4 h-4" />
                    {pm.label}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className={`w-20 h-20 rounded-full ${awaitingConfirmation ? 'bg-yellow-500/10' : 'bg-[var(--color-success)]/10'} flex items-center justify-center mx-auto mb-5`}
            >
              {awaitingConfirmation
                ? <Clock className="w-10 h-10 text-yellow-500" />
                : <CheckCircle className="w-10 h-10 text-[var(--color-success)]" />}
            </motion.div>

            <h1 className="text-2xl font-bold text-center text-[var(--color-text-primary)] mb-1">
              {awaitingConfirmation ? 'Đặt chỗ đang chờ xác nhận thanh toán' : 'Thanh toán thành công!'}
            </h1>
            <p className="text-center text-[var(--color-text-secondary)] mb-6">
              {awaitingConfirmation
                ? 'Vé đã được giữ. Chúng tôi sẽ xác nhận sau khi nhận được tiền (chuyển khoản/thẻ) — theo dõi trong "Vé của tôi".'
                : 'Vé đã được xác nhận và gửi đến email của bạn'}
            </p>

            {transactionId && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-tertiary)] mb-4">
                <Shield className="w-3 h-3" />
                Mã giao dịch: <span className="font-mono font-semibold text-[var(--color-text-secondary)]">{transactionId}</span>
              </div>
            )}

            {item && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-5 md:p-6 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Mã đặt chỗ</span>
                  <span className="text-lg font-bold text-[var(--color-text-primary)]">#{bookingId}</span>
                </div>

                <div className="h-px bg-[var(--color-border)]" />

                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    isMultiLeg
                      ? 'bg-primary-500/10 text-primary-500'
                      : isFlight
                        ? 'bg-primary-500/10 text-primary-500'
                        : 'bg-primary-500/10 text-primary-500'
                  }`}>
                    {isMultiLeg ? <Ticket className="w-5 h-5" /> : isFlight ? <Plane className="w-5 h-5" /> : isBus ? <Bus className="w-5 h-5" /> : <Train className="w-5 h-5" />}
                  </div>
                  <div>
                    {isMultiLeg ? (
                      <>
                        <p className="font-semibold text-[var(--color-text-primary)]">Lộ trình kết hợp ({multiSegs.length} chặng)</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                          {multiSegs.map((s, i) => (
                            <span key={i}>
                              {i > 0 && <ArrowRight className="w-3 h-3 inline mx-1" />}
                              {s.departureLocation}
                            </span>
                          ))}
                          <ArrowRight className="w-3 h-3 inline mx-1" />
                          {multiSegs[multiSegs.length - 1]?.arrivalLocation}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-[var(--color-text-primary)]">
                          {isFlight ? `${item.airlineCode}${(item.id % 900) + 100}` : isBus ? item.busCode : item.trainCode}
                        </p>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                          {item.departureLocation} <ArrowRight className="w-3 h-3 inline" /> {item.arrivalLocation}
                        </p>
                      </>
                    )}
                  </div>
                  <div className={`ml-auto px-3 py-1 rounded-lg border text-xs font-semibold ${awaitingConfirmation ? statusConfig.Pending.class : statusConfig.Confirmed.class}`}>
                    {awaitingConfirmation ? statusConfig.Pending.label : statusConfig.Confirmed.label}
                  </div>
                </div>

                <div className="h-px bg-[var(--color-border)]" />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">Hành khách</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{booking.fullName || booking.user?.fullName || '--'}</span>
                  </div>
                  {(booking.dateOfBirth || booking.gender || booking.nationality) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-tertiary)] pt-1">
                      {booking.dateOfBirth && <span>Sinh: {new Date(booking.dateOfBirth).toLocaleDateString('vi-VN')}</span>}
                      {booking.gender && <span>{booking.gender}</span>}
                      {booking.nationality && <span>{booking.nationality}</span>}
                      {booking.idNumber && <span>CMND: {booking.idNumber}</span>}
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">Phương thức</span>
                    <span className="font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                      {method && <method.icon className="w-4 h-4" />}
                      {method?.label || booking?.paymentMethod}
                    </span>
                  </div>
                  {booking.insurances?.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">Bảo hiểm chuyến đi</span>
                      <span className="font-semibold text-[var(--color-text-primary)]">{formatCurrencyVnd(booking.insurances[0].price)}</span>
                    </div>
                  )}
                </div>

                <div className="h-px bg-[var(--color-border)]" />

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--color-text-primary)]">Tổng tiền</span>
                  <span className="text-2xl font-black text-primary-500">{formatCurrencyVnd(booking.totalPrice)}</span>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3 mt-6"
            >
              <button
                onClick={() => navigate('/bookings')}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md"
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
        )}

        {status === 'failed' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="w-20 h-20 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center mx-auto mb-5"
            >
              <XCircle className="w-10 h-10 text-[var(--color-danger)]" />
            </motion.div>

            <h1 className="text-2xl font-bold text-center text-[var(--color-text-primary)] mb-1">Thanh toán thất bại</h1>
            <p className="text-center text-[var(--color-text-secondary)] mb-2">{error}</p>
            <p className="text-center text-xs text-[var(--color-text-tertiary)] mb-6">
              Mã đặt chỗ <strong>#{bookingId}</strong> đã được lưu lại
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={doPayment}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                Thử lại
              </button>
              <button
                onClick={() => navigate('/bookings')}
                className="flex items-center justify-center gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-6 py-3.5 rounded-xl font-medium transition-all"
              >
                <Ticket className="w-4 h-4" />
                Xem đặt chỗ
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
