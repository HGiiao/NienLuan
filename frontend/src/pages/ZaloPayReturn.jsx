import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Home, Ticket, Shield } from 'lucide-react'
import { getBooking } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'
import api from '../services/api'

function parseBookingId(appUser) {
  const digits = (appUser || '').match(/^\d+/)
  return digits ? digits[0] : null
}

export default function ZaloPayReturn() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('verifying')
  const [error, setError] = useState('')
  const [bookingId, setBookingId] = useState(null)
  const [booking, setBooking] = useState(null)
  const [transactionId, setTransactionId] = useState('')

  useEffect(() => {
    const verify = async () => {
      try {
        const data = searchParams.get('data') || ''
        const mac = searchParams.get('mac') || ''

        let appTransId = ''
        let appUser = ''
        try {
          const parsed = JSON.parse(data)
          appTransId = parsed.appTransId || ''
          appUser = parsed.appUser || ''
        } catch {}

        const parsedId = parseBookingId(appUser)
        if (!parsedId) {
          setError('Không tìm thấy thông tin giao dịch')
          setStatus('failed')
          return
        }

        setBookingId(parsedId)

        const res = await api.post('/api/payments/zalopay-return', { data, mac })
        const verifyData = res.data

        if (verifyData.success) {
          setTransactionId(verifyData.transactionId || `ZALOPAY_${appTransId}`)
          try {
            const bookingRes = await getBooking(parsedId)
            setBooking(bookingRes.data)
          } catch {}
          setStatus('success')
        } else {
          setError(verifyData.message || 'Xác thực thanh toán thất bại')
          setStatus('failed')
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể xác thực giao dịch')
        setStatus('failed')
      }
    }

    verify()
  }, [])

  if (status === 'verifying') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-6"
        />
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Đang xác thực giao dịch...</h2>
        <p className="text-[var(--color-text-secondary)]">Vui lòng đợi trong giây lát</p>
      </div>
    )
  }

  if (status === 'success') {
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

        <h1 className="text-2xl font-bold text-center text-[var(--color-text-primary)] mb-1">Thanh toán thành công!</h1>
        <p className="text-center text-[var(--color-text-secondary)] mb-6">Vé đã được xác nhận và gửi đến email của bạn</p>

        {transactionId && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-tertiary)] mb-4">
            <Shield className="w-3 h-3 text-[var(--color-success)]" />
            Mã giao dịch ZaloPay: <span className="font-mono font-semibold text-[var(--color-text-secondary)]">{transactionId}</span>
          </div>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-5 md:p-6 shadow-sm space-y-4"
        >
          <div className="flex justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">Mã đặt chỗ</span>
            <span className="text-lg font-bold text-[var(--color-text-primary)]">#{bookingId}</span>
          </div>

          {booking && (
            <>
              <div className="h-px bg-[var(--color-border)]" />
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-[var(--color-text-primary)]">
                    {booking.flight
                      ? `${booking.flight.departureLocation || ''} - ${booking.flight.arrivalLocation || ''}`
                      : booking.train
                        ? `${booking.train.departureLocation || ''} - ${booking.train.arrivalLocation || ''}`
                        : 'Chi tiết chuyến đi'}
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {booking.flight?.airlineName || booking.train?.trainName || ''}
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="h-px bg-[var(--color-border)]" />
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[var(--color-text-primary)]">Tổng tiền</span>
            <span className="text-2xl font-black text-primary-500">{formatCurrencyVnd(booking?.totalPrice || 0)}</span>
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-lg mx-auto px-4 py-6 md:py-10 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        className="w-20 h-20 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center mx-auto mb-5"
      >
        <XCircle className="w-10 h-10 text-[var(--color-danger)]" />
      </motion.div>

      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Thanh toán thất bại</h1>
      <p className="text-[var(--color-text-secondary)] mb-2">{error}</p>
      {bookingId && (
        <p className="text-xs text-[var(--color-text-tertiary)] mb-6">
          Mã đặt chỗ <strong>#{bookingId}</strong> đã được lưu lại
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => navigate(`/bookings`)}
          className="flex items-center justify-center gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-6 py-3.5 rounded-xl font-medium transition-all"
        >
          <Ticket className="w-4 h-4" />
          Xem đặt chỗ
        </button>
        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center gap-2 bg-primary-500 text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20"
        >
          <Home className="w-4 h-4" />
          Về trang chủ
        </button>
      </div>
    </motion.div>
  )
}
