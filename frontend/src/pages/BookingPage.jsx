import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { motion } from 'framer-motion'
import { Plane, Train, ArrowRight, User, Mail, Phone, MapPin, CreditCard, Wallet, Building2, Users, Clock, Shield, LogIn, Loader } from 'lucide-react'
import { createBooking, getFlight, getTrain } from '../services/api'
import { formatCurrencyVnd, formatDurationMs } from '../utils/formatters'
import SeatMap from '../components/SeatMap'
import InsuranceCard from '../components/InsuranceCard'

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
}

const paymentMethods = [
  { id: 'credit_card', label: 'Thẻ tín dụng', icon: CreditCard, desc: 'Visa, MasterCard, JCB' },
  { id: 'e_wallet', label: 'Ví điện tử', icon: Wallet, desc: 'Momo, ZaloPay, VNPay' },
  { id: 'bank_transfer', label: 'Chuyển khoản', icon: Building2, desc: 'Internet Banking' },
]

export default function BookingPage() {
  const { type, id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isSignedIn, user: clerkUser, isLoaded } = useUser()
  const localUser = getStoredUser()
  const isAuth = isSignedIn || !!localUser
  const authReady = isLoaded || !!localUser

  const [item, setItem] = useState(location.state?.item || null)
  const [fetching, setFetching] = useState(false)
  const [showSeatMap, setShowSeatMap] = useState(false)
  const [selectedSeats, setSelectedSeats] = useState([])
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', address: '',
    passengers: 1, paymentMethod: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authReady && !isAuth) {
      const dest = `/auth?redirect=${encodeURIComponent(`/booking/${type}/${id}`)}`
      navigate(dest, { replace: true })
    }
  }, [authReady, isAuth, type, id, navigate])

  useEffect(() => {
    if (isAuth && !item) {
      setFetching(true)
      const fn = type === 'flight' ? getFlight : getTrain
      fn(id)
        .then(r => setItem(r.data))
        .catch(() => setError('Không thể tải thông tin vé'))
        .finally(() => setFetching(false))
    }

    if (isAuth) {
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      const email = stored.email || clerkUser?.primaryEmailAddress?.emailAddress || ''
      const name = stored.fullName || clerkUser?.fullName || ''
      const phone = stored.phone || clerkUser?.primaryPhoneNumber?.phoneNumber || ''

      setForm(prev => ({
        ...prev,
        email: prev.email || email,
        fullName: prev.fullName || name,
        phone: prev.phone || phone,
      }))
    }
  }, [isAuth])

  if (!authReady) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Loader className="w-10 h-10 animate-spin text-primary-500 mx-auto mb-4" />
        <p className="text-[var(--color-text-secondary)]">Đang tải...</p>
      </div>
    )
  }

  if (!isAuth) return null

  if (!item) {
    if (fetching) {
      return (
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <Loader className="w-10 h-10 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-[var(--color-text-secondary)]">Đang tải thông tin vé...</p>
        </div>
      )
    }
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center mx-auto mb-4">
          <Plane className="w-7 h-7 text-[var(--color-danger)]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Không tìm thấy thông tin vé</h2>
        <p className="text-[var(--color-text-secondary)] mb-6">Vui lòng quay lại và chọn vé để đặt</p>
        <button onClick={() => navigate(-1)} className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md">
          Quay lại
        </button>
      </div>
    )
  }

  const isFlight = type === 'flight'
  const totalPrice = item.price * form.passengers
  const duration = isFlight
    ? formatDurationMs(new Date(item.arrivalTime) - new Date(item.departureTime))
    : null

  const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.paymentMethod) {
      setError('Vui lòng chọn phương thức thanh toán')
      return
    }

    setLoading(true)
    try {
      const res = await createBooking({
        email: form.email,
        fullName: form.fullName,
        phone: form.phone,
        address: form.address,
        paymentMethod: form.paymentMethod,
        flightId: isFlight ? item.id : null,
        trainId: !isFlight ? item.id : null,
        passengers: form.passengers,
      })
      navigate(`/payment/${res.data.id}`, { state: { booking: res.data, item, type } })
    } catch {
      setError('Đặt vé thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto px-4 py-6 md:py-10"
    >
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)]">Đặt vé</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Vui lòng nhập thông tin để hoàn tất đặt vé</p>
      </div>

      <div className="grid md:grid-cols-5 gap-6 items-start">
        {/* Left: Form */}
        <motion.form
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="md:col-span-3 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-5 md:p-6 space-y-5 shadow-sm"
        >
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <User className="w-5 h-5 text-primary-500" />
            Thông tin hành khách
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Họ và tên</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                <input
                  className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-colors"
                  placeholder="Nguyễn Văn A"
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                <input
                  className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-colors"
                  type="email" placeholder="email@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Số điện thoại</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                <input
                  className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-colors"
                  placeholder="090 123 4567"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Số khách</label>
              <div className="relative">
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                <input
                  className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-colors"
                  type="number" min="1" max="10"
                  value={form.passengers}
                  onChange={e => setForm({ ...form, passengers: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Chọn ghế</label>
              <button type="button" onClick={() => setShowSeatMap(true)}
                className={`w-full flex items-center gap-2 border ${selectedSeats.length > 0 ? 'border-accent-500 bg-accent-500/5' : 'border-[var(--color-border)]'} rounded-xl px-3.5 py-3 text-sm transition-all hover:border-accent-500/30`}
              >
                <ArmchairIcon className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                <span className="text-[var(--color-text-primary)] flex-1 text-left">
                  {selectedSeats.length > 0 ? `Đã chọn ${selectedSeats.length} ghế: ${selectedSeats.map(s => s.seatNumber).join(', ')}` : 'Chọn ghế ngồi'}
                </span>
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {selectedSeats.length > 0 ? formatCurrencyVnd(selectedSeats.reduce((sum, s) => sum + s.price, 0)) : 'Tùy chọn'}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Địa chỉ</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-[var(--color-text-tertiary)]" />
              <textarea
                className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-colors resize-none"
                rows={2} placeholder="Số nhà, đường, phường/xã, quận/huyện, thành phố"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>

          <div className="h-px bg-[var(--color-border)]" />

          <InsuranceCard bookingId={null} onInsuranceChange={(pkg) => setForm(prev => ({ ...prev, insurance: pkg?.price || 0 }))} />

          <div className="h-px bg-[var(--color-border)]" />

          <div>
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-primary-500" />
              Phương thức thanh toán
            </h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {paymentMethods.map(pm => {
                const selected = form.paymentMethod === pm.id
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setForm({ ...form, paymentMethod: pm.id })}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                selected
                  ? 'border-primary-500 bg-primary-500/10 shadow-sm'
                  : 'border-[var(--color-border)] hover:border-[var(--color-text-tertiary)] bg-[var(--color-bg)]'
              }`}
                  >
                    <pm.icon className={`w-6 h-6 ${selected ? 'text-primary-500' : 'text-[var(--color-text-tertiary)]'}`} />
                    <div>
                      <div className={`text-sm font-semibold ${selected ? 'text-primary-500' : 'text-[var(--color-text-primary)]'}`}>
                        {pm.label}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">{pm.desc}</div>
                    </div>
                    {selected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/10 px-4 py-2.5 rounded-xl border border-[var(--color-danger)]/20"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3.5 rounded-xl font-bold text-base hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang xử lý...</>
            ) : (
              <><CreditCard className="w-4 h-4" /> Thanh toán — {formatCurrencyVnd(totalPrice)}</>
            )}
          </button>

          <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-tertiary)] justify-center">
            <Shield className="w-3.5 h-3.5" />
            Thông tin của bạn được bảo mật và mã hóa
          </div>
        </motion.form>

        {/* Right: Trip Summary */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-2 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-5 md:p-6 shadow-sm md:sticky md:top-24 space-y-4"
        >
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Chi tiết vé</h2>

          <div className="flex items-center gap-3 pb-3 border-b border-[var(--color-border)]">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              isFlight
                ? 'bg-primary-500/10 text-primary-500'
                : 'bg-primary-500/10 text-primary-500'
            }`}>
              {isFlight ? <Plane className="w-5 h-5" /> : <Train className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)]">
                {isFlight ? `${item.airlineCode}${(item.id % 900) + 100}` : item.trainCode}
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                {isFlight ? item.airlineName : `Hạng ${item.coachClass}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 text-right">
              <div className="text-lg font-bold text-[var(--color-text-primary)]">{fmtTime(item.departureTime)}</div>
              <div className="text-xs font-medium text-[var(--color-text-secondary)]">{item.departureLocation}</div>
            </div>
            <div className="flex flex-col items-center px-2">
              <div className="text-[10px] text-[var(--color-text-tertiary)] mb-1">{duration || `${Math.floor((new Date(item.arrivalTime) - new Date(item.departureTime)) / 3600000)}h ${Math.floor(((new Date(item.arrivalTime) - new Date(item.departureTime)) % 3600000) / 60000)}m`}</div>
              <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold text-[var(--color-text-primary)]">{fmtTime(item.arrivalTime)}</div>
              <div className="text-xs font-medium text-[var(--color-text-secondary)]">{item.arrivalLocation}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)] pb-3 border-b border-[var(--color-border)]">
            <Clock className="w-3.5 h-3.5" />
            {fmtDate(item.departureTime)}
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Đơn giá</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{formatCurrencyVnd(item.price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Số khách</span>
              <span className="font-semibold text-[var(--color-text-primary)]">x {form.passengers}</span>
            </div>
            {form.paymentMethod && (
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">Thanh toán</span>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {paymentMethods.find(p => p.id === form.paymentMethod)?.label || form.paymentMethod}
                </span>
              </div>
            )}
          </div>

          <div className="h-px bg-[var(--color-border)]" />

          <div className="flex items-center justify-between">
            <span className="font-semibold text-[var(--color-text-primary)]">Tổng tiền</span>
            <span className="text-2xl font-black text-primary-500">{formatCurrencyVnd(totalPrice)}</span>
          </div>
        </motion.div>
      </div>

      {showSeatMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowSeatMap(false)}>
          <div className="w-full max-w-[500px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <SeatMap type={type} referenceId={item.id} userId={localUser?.id || 0}
              onSeatsSelected={(seats) => setSelectedSeats(seats)}
              onClose={() => setShowSeatMap(false)}
            />
          </div>
        </div>
      )}
    </motion.div>
  )
}
