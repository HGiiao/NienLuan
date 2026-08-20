import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plane, Train, Bus, Ticket, ArrowRight, User, Mail, Phone, MapPin, CreditCard, Wallet, Building2, Clock, Shield, LogIn, Loader, Check, Tag, Percent, CalendarDays, VenetianMask, Globe, FileText, Heart, AlertCircle, Receipt, X, Smartphone, Gift, Minus, Plus } from 'lucide-react'
import { createBooking, getFlight, getTrain, getBus, validatePromoCode, getLuckyWheelHistory } from '../services/api'
import { formatCurrencyVnd, formatDurationMs } from '../utils/formatters'
import InsuranceCard from '../components/InsuranceCard'
import BankTransferPanel from '../components/BankTransferPanel'
import CardPaymentPanel from '../components/CardPaymentPanel'

function getStoredUser() {
  try { return JSON.parse(sessionStorage.getItem('user')) } catch { return null }
}

const paymentMethods = [
  { id: 'credit_card', label: 'Thẻ tín dụng', icon: CreditCard, desc: 'Visa, MasterCard, JCB' },
  { id: 'e_wallet', label: 'Ví điện tử', icon: Wallet, desc: 'VNPay, PayOS' },
  { id: 'bank_transfer', label: 'Chuyển khoản', icon: Building2, desc: 'Quét mã VietQR' },
]

const walletProviders = [
  {
    id: 'vnpay',
    label: 'VNPay',
    desc: 'VNPay QR, ngân hàng nội địa',
    colors: 'from-orange-500 to-amber-600',
    short: 'VN',
  },
  {
    id: 'payos',
    label: 'PayOS',
    desc: 'VietQR qua ngân hàng',
    colors: 'from-emerald-500 to-teal-600',
    short: 'P',
  },
]

export default function BookingPage() {
  const { type, id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isSignedIn, user: clerkUser, isLoaded } = useUser()
  const localUser = getStoredUser()
  const tabAuth = sessionStorage.getItem('ve247-auth')
  const isAuth = (isSignedIn && tabAuth) || (!!localUser && localUser?.loginMethod !== 'clerk')
  const authReady = isLoaded || !!localUser

  const [item, setItem] = useState(location.state?.item || null)
  // Lộ trình kết hợp: mảng các chặng { type, id, code, name, departureLocation, arrivalLocation, departureTime, arrivalTime, price }
  const [segments, setSegments] = useState(location.state?.route?.segments || null)
  const isMultiLeg = type === 'multi' && Array.isArray(segments) && segments.length > 1
  const [fetching, setFetching] = useState(false)
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', address: '',
    dateOfBirth: '', gender: '', nationality: 'Việt Nam', idNumber: '',
    emergencyContactName: '', emergencyContactPhone: '',
    specialRequests: '',
    paymentMethod: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState(null)
  const [promoChecking, setPromoChecking] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [wonPromos, setWonPromos] = useState([])
  const [transferRef, setTransferRef] = useState('')
  const [cardInfo, setCardInfo] = useState(null)
  const [walletProvider, setWalletProvider] = useState('')
  const [walletModal, setWalletModal] = useState(false)
  const [passengerCount, setPassengerCount] = useState(1)
  const [extraPassengers, setExtraPassengers] = useState([])

  useEffect(() => {
    if (authReady && !isAuth) {
      const dest = `/auth?redirect=${encodeURIComponent(`/booking/${type}/${id}`)}`
      navigate(dest, { replace: true })
    }
  }, [authReady, isAuth, type, id, navigate])

  useEffect(() => {
    if (isAuth && !item && !isMultiLeg) {
      setFetching(true)
      const fn = type === 'flight' ? getFlight : type === 'bus' ? getBus : getTrain
      fn(id)
        .then(r => setItem(r.data))
        .catch(() => setError('Không thể tải thông tin vé'))
        .finally(() => setFetching(false))
    }

    if (isAuth) {
      const stored = JSON.parse(sessionStorage.getItem('user') || '{}')
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

  const userEmail = localUser?.email || clerkUser?.primaryEmailAddress?.emailAddress || ''

  // Chỉ hiển thị mã giảm giá tài khoản này đã trúng từ vòng quay may mắn
  useEffect(() => {
    if (!isAuth || !userEmail) return
    getLuckyWheelHistory(userEmail)
      .then(res => setWonPromos(res.data || []))
      .catch(() => setWonPromos([]))
  }, [isAuth, userEmail])

  if (!authReady) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Loader className="w-10 h-10 animate-spin text-primary-500 mx-auto mb-4" />
        <p className="text-[var(--color-text-secondary)]">Đang tải...</p>
      </div>
    )
  }

  if (!isAuth) return null

  // Lộ trình kết hợp bị mất dữ liệu (vd: refresh trang — location.state bị xóa) → hướng dẫn quay lại
  if (type === 'multi' && !isMultiLeg) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center mx-auto mb-4">
          <Ticket className="w-7 h-7 text-[var(--color-danger)]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Phiên đặt vé đã hết hạn</h2>
        <p className="text-[var(--color-text-secondary)] mb-6">Thông tin lộ trình chỉ có hiệu lực khi đến từ trang Lộ trình & Cảnh báo. Vui lòng quay lại chọn lại lộ trình.</p>
        <button onClick={() => navigate('/optimal-route')} className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md">
          Quay lại trang lộ trình
        </button>
      </div>
    )
  }

  if (!item && !isMultiLeg) {
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
  const isBus = type === 'bus'
  const itemCode = item
    ? (isFlight
        ? `${item.airlineCode || item.code}${(item.id % 900) + 100}`
        : isBus
          ? (item.busCode || item.code)
          : (item.trainCode || item.code))
    : ''
  const itemName = item
    ? (isFlight
        ? (item.airlineName || item.name)
        : isBus
          ? (item.busCompany || item.name)
          : (item.coachClass ? `Hạng ${item.coachClass}` : item.name))
    : ''
  const baseTicketPrice = isMultiLeg
    ? segments.reduce((s, seg) => s + Number(seg.price || 0), 0)
    : item.price
  // Bảo hiểm tính theo từng hành khách (mỗi vé 1 gói bảo hiểm)
  const totalPrice = (baseTicketPrice + (form?.insurance || 0)) * passengerCount
  const promoDiscount = promoApplied
    ? Math.min(totalPrice * (Number(promoApplied.discountPercent) || 0) / 100, Number(promoApplied.maxDiscount) || 0)
    : 0
  const finalPrice = Math.max(0, totalPrice - promoDiscount)
  const duration = isFlight
    ? formatDurationMs(new Date(item.arrivalTime) - new Date(item.departureTime))
    : null

  const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })

  const handleSelectPayment = (id) => {
    setForm(prev => ({ ...prev, paymentMethod: id }))
    if (id !== 'e_wallet') setWalletProvider('')
    if (id === 'bank_transfer' && !transferRef) {
      const d = new Date()
      const p = (n) => String(n).padStart(2, '0')
      setTransferRef(`VE247${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`)
    }
  }

  const applyPromo = async (code) => {
    setPromoChecking(true); setPromoError('')
    try {
      const res = await validatePromoCode({ code: code.trim(), orderValue: totalPrice })
      if (res.data.valid) {
        setPromoApplied(res.data)
        setPromoError('')
      } else {
        setPromoError(res.data.error || 'Mã không hợp lệ')
      }
    } catch { setPromoError('Lỗi kiểm tra mã. Vui lòng thử lại.') }
    finally { setPromoChecking(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const errors = {}

    const nameRegex = /^[A-Za-zÀ-ỹà-ỹ\s]{2,}$/
    if (!nameRegex.test(form.fullName.trim())) {
      errors.fullName = 'Họ tên chỉ gồm chữ cái, tối thiểu 2 ký tự'
    }

    if (!form.paymentMethod) {
      errors.paymentMethod = 'Vui lòng chọn phương thức thanh toán'
    }

    if (form.paymentMethod === 'e_wallet' && !walletProvider) {
      errors.walletProvider = 'Vui lòng chọn ví thanh toán (VNPay hoặc PayOS)'
    }

    const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/
    if (!phoneRegex.test(form.phone.replace(/\s/g, ''))) {
      errors.phone = 'SĐT không hợp lệ (VD: 0901234567)'
    }

    if (form.dateOfBirth) {
      const dob = new Date(form.dateOfBirth)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (isNaN(dob.getTime())) {
        errors.dateOfBirth = 'Ngày sinh không hợp lệ'
      } else if (dob >= today) {
        errors.dateOfBirth = 'Ngày sinh không thể ở tương lai'
      } else {
        const age = today.getFullYear() - dob.getFullYear()
        const monthDiff = today.getMonth() - dob.getMonth()
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate()) ? age - 1 : age
        if (actualAge < 1) errors.dateOfBirth = 'Hành khách phải từ 1 tuổi trở lên'
        else if (actualAge > 120) errors.dateOfBirth = 'Tuổi không hợp lệ'
      }
    }

    if (form.idNumber) {
      const cleanId = form.idNumber.replace(/\s/g, '').toUpperCase()
      const cmnd = /^\d{9}$/
      const cccd = /^\d{12}$/
      const passport = /^[A-Z]{1,2}\d{6,8}$/
      if (!cmnd.test(cleanId) && !cccd.test(cleanId) && !passport.test(cleanId)) {
        errors.idNumber = 'CMND (9 số), CCCD (12 số) hoặc Hộ chiếu (VD: AB1234567)'
      }
    }

    if (extraPassengers.some(p => !p.fullName || !nameRegex.test(p.fullName.trim()))) {
      errors.extraPassengers = 'Vui lòng nhập họ tên hợp lệ cho tất cả hành khách'
    }

    if (form.emergencyContactName && !form.emergencyContactPhone) {
      errors.emergencyContactPhone = 'Nhập SĐT liên hệ khẩn cấp'
    }
    if (form.emergencyContactPhone) {
      if (!phoneRegex.test(form.emergencyContactPhone.replace(/\s/g, ''))) {
        errors.emergencyContactPhone = 'SĐT liên hệ khẩn cấp không hợp lệ'
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      const firstKey = Object.keys(errors)[0]
      setError(errors[firstKey])
      const el = document.getElementById(`field-${firstKey}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setFieldErrors({})

    if (form.paymentMethod === 'e_wallet' && !walletProvider) {
      setWalletModal(true)
      return
    }

    await createBookingAndGo()
  }

  const createBookingAndGo = async () => {
    setLoading(true)
    try {
      const discountAmount = promoDiscount || null
      const res = await createBooking({
        email: form.email,
        fullName: form.fullName,
        phone: form.phone,
        address: form.address,
        paymentMethod: form.paymentMethod,
        flightId: isMultiLeg ? null : (isFlight ? item.id : null),
        trainId: isMultiLeg ? null : (!isFlight && !isBus ? item.id : null),
        busId: isMultiLeg ? null : (isBus ? item.id : null),
        segments: isMultiLeg ? segments.map(s => ({ mode: s.type, itemId: s.id })) : null,
        passengers: passengerCount,
        insurancePackageId: form.insurancePackageId || null,
        passengerDetails: [
          {
            fullName: form.fullName,
            dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : null,
            gender: form.gender || null,
            nationality: form.nationality || null,
            idNumber: form.idNumber || null,
          },
          ...extraPassengers.map(p => ({
            fullName: p.fullName,
            dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString() : null,
            gender: p.gender || null,
            nationality: p.nationality || null,
            idNumber: p.idNumber || null,
          })),
        ],
        promoCode: promoApplied?.code || null,
        discountAmount: discountAmount || null,
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : null,
        gender: form.gender || null,
        nationality: form.nationality || null,
        idNumber: form.idNumber || null,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactPhone: form.emergencyContactPhone || null,
        specialRequests: form.specialRequests || null,
      })
      navigate(`/payment/${res.data.id}`, { state: { booking: res.data, item, type, walletProvider } })
    } catch (err) {
      setError(err.response?.data?.message || 'Đặt vé thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const handleChooseWallet = (pid) => {
    setWalletProvider(pid)
    setWalletModal(false)
    createBookingAndGo()
  }

  const changePassengerCount = (n) => {
    const count = Math.min(9, Math.max(1, n))
    setPassengerCount(count)
    setExtraPassengers(prev => {
      const next = [...prev]
      while (next.length < count - 1) next.push({ fullName: '', dateOfBirth: '', gender: '', nationality: '', idNumber: '' })
      return next.slice(0, count - 1)
    })
  }

  const updateExtraPassenger = (idx, field, value) => {
    setExtraPassengers(prev => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto px-4 py-6 md:py-10"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white mb-4 shadow-lg shadow-primary-500/20">
          {isMultiLeg ? <Ticket className="w-6 h-6" /> : isFlight ? <Plane className="w-6 h-6" /> : isBus ? <Bus className="w-6 h-6" /> : <Train className="w-6 h-6" />}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)]">{isMultiLeg ? 'Đặt lộ trình kết hợp' : 'Đặt vé'}</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">
          {isMultiLeg
            ? `Mua ${segments.length} vé cùng lúc — nhập thông tin 1 lần cho cả lộ trình`
            : 'Vui lòng nhập thông tin để hoàn tất đặt vé'}
        </p>
      </div>

      {/* Step indicator */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center justify-center gap-4">
          {[
            { label: 'Thông tin', active: true },
            { label: 'Thanh toán', active: false }
          ].map((step, idx, arr) => (
            <div key={step.label} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border ${
                  step.active
                    ? 'bg-primary-500 text-white border-primary-500 shadow-md shadow-primary-500/20'
                    : 'bg-[var(--color-bg)] text-[var(--color-text-tertiary)] border-[var(--color-border)]'
                }`}>
                  {idx + 1}
                </div>
                <span className={`text-xs md:text-sm font-semibold ${
                  step.active ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'
                }`}>
                  {step.label}
                </span>
              </div>
              {idx < arr.length - 1 && (
                <div className="w-8 h-px bg-[var(--color-border)] mx-1" />
              )}
            </div>
          ))}
        </div>
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
          {/* Passenger Info Section */}
          <div className="flex items-center justify-between gap-3 border-l-4 border-primary-500 pl-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)] leading-tight">Thông tin hành khách</h2>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">Người đặt vé là hành khách số 1</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => changePassengerCount(passengerCount - 1)}
                disabled={passengerCount <= 1}
                className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:border-primary-500/50 hover:text-primary-500 disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="text-center min-w-[44px]">
                <div className="text-sm font-black text-[var(--color-text-primary)] leading-none">{passengerCount}</div>
                <div className="text-[9px] text-[var(--color-text-tertiary)] mt-0.5">hành khách</div>
              </div>
              <button
                type="button"
                onClick={() => changePassengerCount(passengerCount + 1)}
                disabled={passengerCount >= 9}
                className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:border-primary-500/50 hover:text-primary-500 disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          {fieldErrors.extraPassengers && <p className="text-xs text-[var(--color-danger)] mt-2">{fieldErrors.extraPassengers}</p>}

          <div className="grid sm:grid-cols-2 gap-4">
            <div id="field-fullName">
              <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">Họ và tên</label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] group-focus-within:text-primary-500 transition-colors" />
                <input
                  className={`w-full border rounded-xl pl-10 pr-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-all ${fieldErrors.fullName ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                  placeholder="Nguyễn Văn A"
                  value={form.fullName}
                  onChange={e => { setForm({ ...form, fullName: e.target.value }); setFieldErrors(prev => ({ ...prev, fullName: undefined })) }}
                  required
                />
              </div>
              {fieldErrors.fullName && <p className="text-xs text-[var(--color-danger)] mt-1">{fieldErrors.fullName}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] group-focus-within:text-primary-500 transition-colors" />
                <input
                  className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-all"
                  type="email" placeholder="email@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <div id="field-phone">
              <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">Số điện thoại</label>
              <div className="relative group">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] group-focus-within:text-primary-500 transition-colors" />
                <input
                  className={`w-full border rounded-xl pl-10 pr-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-all ${fieldErrors.phone ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                  placeholder="090 123 4567"
                  value={form.phone}
                  onChange={e => { setForm({ ...form, phone: e.target.value }); setFieldErrors(prev => ({ ...prev, phone: undefined })) }}
                  required
                />
              </div>
              {fieldErrors.phone && <p className="text-xs text-[var(--color-danger)] mt-1">{fieldErrors.phone}</p>}
            </div>
            <div id="field-dateOfBirth">
              <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">Ngày sinh</label>
              <div className="relative group">
                <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] group-focus-within:text-primary-500 transition-colors" />
                <input
                  className={`w-full border rounded-xl pl-10 pr-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-all ${fieldErrors.dateOfBirth ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                  type="date"
                  value={form.dateOfBirth}
                  onChange={e => { setForm({ ...form, dateOfBirth: e.target.value }); setFieldErrors(prev => ({ ...prev, dateOfBirth: undefined })) }}
                />
              </div>
              {fieldErrors.dateOfBirth && <p className="text-xs text-[var(--color-danger)] mt-1">{fieldErrors.dateOfBirth}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">Giới tính</label>
              <div className="relative group">
                <VenetianMask className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] group-focus-within:text-primary-500 transition-colors pointer-events-none" />
                <select
                  className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-all appearance-none"
                  value={form.gender}
                  onChange={e => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="">Chọn giới tính</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-[var(--color-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">Quốc tịch</label>
              <div className="relative group">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] group-focus-within:text-primary-500 transition-colors" />
                <input
                  className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-all"
                  placeholder="Việt Nam"
                  value={form.nationality}
                  onChange={e => setForm({ ...form, nationality: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div id="field-idNumber">
            <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">Số CMND / CCCD / Hộ chiếu</label>
            <div className="relative group">
              <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] group-focus-within:text-primary-500 transition-colors" />
              <input
                className={`w-full border rounded-xl pl-10 pr-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-all ${fieldErrors.idNumber ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                placeholder="0123456789 hoặc AB1234567"
                value={form.idNumber}
                onChange={e => { setForm({ ...form, idNumber: e.target.value }); setFieldErrors(prev => ({ ...prev, idNumber: undefined })) }}
              />
            </div>
            {fieldErrors.idNumber && <p className="text-xs text-[var(--color-danger)] mt-1">{fieldErrors.idNumber}</p>}
          </div>

          {extraPassengers.length > 0 && (
            <div className="space-y-4">
              <div className="h-px bg-[var(--color-border)]" />
              {extraPassengers.map((p, idx) => (
                <div key={idx} className="rounded-xl border border-[var(--color-border)] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary-500" />
                    <span className="text-sm font-bold text-[var(--color-text-primary)]">Hành khách {idx + 2}</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">Họ và tên</label>
                      <input
                        className="w-full border border-[var(--color-border)] rounded-xl px-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-all"
                        placeholder="Nguyễn Văn B"
                        value={p.fullName}
                        onChange={e => updateExtraPassenger(idx, 'fullName', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">Ngày sinh</label>
                      <input
                        type="date"
                        className="w-full border border-[var(--color-border)] rounded-xl px-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-all"
                        value={p.dateOfBirth}
                        onChange={e => updateExtraPassenger(idx, 'dateOfBirth', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">Giới tính</label>
                      <select
                        className="w-full border border-[var(--color-border)] rounded-xl px-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-all appearance-none"
                        value={p.gender}
                        onChange={e => updateExtraPassenger(idx, 'gender', e.target.value)}
                      >
                        <option value="">Chọn giới tính</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">Quốc tịch</label>
                      <input
                        className="w-full border border-[var(--color-border)] rounded-xl px-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-all"
                        placeholder="Việt Nam"
                        value={p.nationality}
                        onChange={e => updateExtraPassenger(idx, 'nationality', e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">Số CMND / CCCD / Hộ chiếu</label>
                      <input
                        className="w-full border border-[var(--color-border)] rounded-xl px-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-all"
                        placeholder="0123456789 hoặc AB1234567"
                        value={p.idNumber}
                        onChange={e => updateExtraPassenger(idx, 'idNumber', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">Địa chỉ</label>
            <div className="relative group">
              <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-[var(--color-text-tertiary)] group-focus-within:text-primary-500 transition-colors" />
              <textarea
                className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-all resize-none"
                rows={2} placeholder="Số nhà, đường, phường/xã, quận/huyện, thành phố"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>

          <div className="h-px bg-[var(--color-border)]" />

          {/* Emergency Contact */}
          <details className="group">
            <summary className="flex items-center gap-3 cursor-pointer list-none">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <Heart className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-bold text-[var(--color-text-primary)]">Liên hệ khẩn cấp</span>
                <span className="text-[10px] text-[var(--color-text-tertiary)] ml-2 group-open:hidden">— Mở để thêm</span>
              </div>
              <svg className="w-4 h-4 text-[var(--color-text-tertiary)] transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">Người liên hệ</label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                  <input
                    className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-all"
                    placeholder="Nguyễn Thị B"
                    value={form.emergencyContactName}
                    onChange={e => { setForm({ ...form, emergencyContactName: e.target.value }); setFieldErrors(prev => ({ ...prev, emergencyContactPhone: undefined })) }}
                  />
                </div>
              </div>
              <div id="field-emergencyContactPhone">
                <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">Số điện thoại</label>
                <div className="relative group">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                  <input
                    className={`w-full border rounded-xl pl-10 pr-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-all ${fieldErrors.emergencyContactPhone ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                    placeholder="098 765 4321"
                    value={form.emergencyContactPhone}
                    onChange={e => { setForm({ ...form, emergencyContactPhone: e.target.value }); setFieldErrors(prev => ({ ...prev, emergencyContactPhone: undefined })) }}
                  />
                </div>
                {fieldErrors.emergencyContactPhone && <p className="text-xs text-[var(--color-danger)] mt-1">{fieldErrors.emergencyContactPhone}</p>}
              </div>
            </div>
          </details>

          <div className="h-px bg-[var(--color-border)]" />

          {/* Special Requests */}
          <details className="group">
            <summary className="flex items-center gap-3 cursor-pointer list-none">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500 shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-bold text-[var(--color-text-primary)]">Yêu cầu đặc biệt</span>
                <span className="text-[10px] text-[var(--color-text-tertiary)] ml-2 group-open:hidden">— Mở để thêm</span>
              </div>
              <svg className="w-4 h-4 text-[var(--color-text-tertiary)] transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <div className="mt-4">
              <div className="relative group">
                <AlertCircle className="absolute left-3.5 top-3.5 w-4 h-4 text-[var(--color-text-tertiary)]" />
                <textarea
                  className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-all resize-none"
                  rows={3} placeholder="Ăn chay, hỗ trợ xe lăn, suất ăn đặc biệt, ..."
                  value={form.specialRequests}
                  onChange={e => setForm({ ...form, specialRequests: e.target.value })}
                />
              </div>
            </div>
          </details>

          {(isFlight || isMultiLeg) && (
            <>
              <div className="h-px bg-[var(--color-border)]" />

              {/* Insurance Section — chỉ áp dụng cho máy bay và lộ trình kết hợp */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-accent-500" />
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">Bảo hiểm chuyến đi</span>
                  <span className="text-[10px] bg-accent-500/10 text-accent-500 px-2 py-0.5 rounded-full font-semibold">Đề xuất</span>
                </div>
                <InsuranceCard bookingId={null} onInsuranceChange={(pkg) => setForm(prev => ({ ...prev, insurance: pkg?.price || 0, insurancePackageId: pkg?.id || null }))} />
              </div>
            </>
          )}

          <div className="h-px bg-[var(--color-border)]" />

          {/* Payment Section */}
          <div id="field-paymentMethod">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)] leading-tight">Phương thức thanh toán</h3>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">Chọn 1 phương thức để tiếp tục</p>
              </div>
            </div>
            {fieldErrors.paymentMethod && <p className="text-xs text-[var(--color-danger)] mb-2">{fieldErrors.paymentMethod}</p>}
            <div className="grid sm:grid-cols-3 gap-3">
              {paymentMethods.map(pm => {
                const selected = form.paymentMethod === pm.id
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => handleSelectPayment(pm.id)}
                    className={`relative flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all text-center ${
                      selected
                        ? 'border-primary-500 bg-primary-500/5 shadow-sm'
                        : 'border-[var(--color-border)] hover:border-primary-500/40 bg-[var(--color-bg)]'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      selected ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : 'bg-[var(--color-bg)] text-[var(--color-text-tertiary)]'
                    }`}>
                      <pm.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className={`text-sm font-bold ${selected ? 'text-primary-500' : 'text-[var(--color-text-primary)]'}`}>
                        {pm.label}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">{pm.desc}</div>
                    </div>
                    {selected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-sm">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {form.paymentMethod === 'bank_transfer' && (
              <div className="mt-4">
                <BankTransferPanel amount={finalPrice} content={transferRef} />
              </div>
            )}

            {form.paymentMethod === 'e_wallet' && (
              <div className="mt-4">
                <div className="rounded-2xl border border-primary-500/20 bg-primary-500/5 p-4 md:p-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 shrink-0">
                      <Wallet className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--color-text-primary)]">Chọn ví thanh toán</h4>
                      <p className="text-[11px] text-[var(--color-text-tertiary)]">Bạn sẽ được chuyển sang cổng thanh toán của ví để hoàn tất</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    {walletProviders.map(w => {
                      const selected = walletProvider === w.id
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setWalletProvider(w.id)}
                          className={`relative flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all text-center ${
                            selected
                              ? 'border-primary-500 bg-white dark:bg-[var(--color-bg-card)] shadow-sm'
                              : 'border-[var(--color-border)] bg-white dark:bg-[var(--color-bg-card)] hover:border-primary-500/40'
                          }`}
                        >
                          <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${w.colors} text-white flex items-center justify-center font-black text-sm shadow-md`}>
                            {w.short}
                          </div>
                          <div>
                            <div className={`text-sm font-bold ${selected ? 'text-primary-500' : 'text-[var(--color-text-primary)]'}`}>
                              {w.label}
                            </div>
                            <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">{w.desc}</div>
                          </div>
                          {selected && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-sm">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {fieldErrors.walletProvider && <p className="text-xs text-[var(--color-danger)] mt-2">{fieldErrors.walletProvider}</p>}
                </div>
              </div>
            )}

            {form.paymentMethod === 'credit_card' && (
              <div className="mt-4">
                <CardPaymentPanel onChange={setCardInfo} />
              </div>
            )}
          </div>

          {/* Promo Code */}
          <div className="h-px bg-[var(--color-border)]" />
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-bold text-[var(--color-text-primary)]">Mã giảm giá</span>
            </div>
            {!promoApplied ? (
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                    <input
                      className="w-full border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-all"
                      placeholder="Nhập mã khuyến mãi"
                      value={promoCode}
                      onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError('') }}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!promoCode.trim() || promoChecking}
                    onClick={() => applyPromo(promoCode)}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 transition-all shrink-0"
                  >
                    {promoChecking ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Áp dụng'}
                  </button>
                </div>
                {wonPromos.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-[11px] text-[var(--color-text-tertiary)] mb-2">Mã giảm giá bạn đã nhận từ vòng quay may mắn:</p>
                    <div className="flex flex-wrap gap-2">
                      {wonPromos.map(p => {
                        const applicable = Number(p.minOrderValue || 0) <= totalPrice
                        return (
                          <button
                            key={p.code}
                            type="button"
                            disabled={!applicable || promoChecking}
                            onClick={() => { setPromoCode(p.code); setPromoError(''); applyPromo(p.code) }}
                            title={!applicable ? `Áp dụng cho đơn từ ${formatCurrencyVnd(p.minOrderValue)}` : p.description}
                            className="group flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-primary-500/40 bg-primary-500/5 hover:bg-primary-500/10 hover:border-primary-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Percent className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                            <span className="text-xs font-bold text-primary-500">{p.code}</span>
                            <span className="text-[11px] text-[var(--color-text-secondary)]">{p.description}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex items-start gap-2 text-xs text-[var(--color-text-tertiary)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 leading-snug">
                    <Gift className="w-4 h-4 text-accent-500 shrink-0 mt-0.5" />
                    <span>
                      Bạn chưa có mã giảm giá nào.{' '}
                      <Link to="/" className="text-primary-500 font-semibold hover:underline">Quay vòng quay may mắn</Link> để nhận mã!
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary-500/5 border border-primary-500/20">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-primary-500" />
                  <span className="text-sm font-bold text-primary-500">{promoApplied.code}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">— Giảm {promoApplied.discountPercent}% (tối đa {formatCurrencyVnd(promoApplied.maxDiscount)})</span>
                </div>
                <button type="button" onClick={() => { setPromoApplied(null); setPromoCode('') }} className="text-xs text-[var(--color-danger)] hover:underline">
                  Hủy
                </button>
              </div>
            )}
            {promoError && <p className="text-xs text-[var(--color-danger)] mt-1.5">{promoError}</p>}
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/10 px-4 py-3 rounded-xl border border-[var(--color-danger)]/20 flex items-center gap-2"
            >
              <div className="w-5 h-5 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-[var(--color-danger)]" />
              </div>
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3.5 rounded-xl font-bold text-base hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang xử lý...</>
            ) : (
              <><CreditCard className="w-4 h-4" /> Thanh toán — {formatCurrencyVnd(finalPrice)}</>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--color-text-tertiary)]">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
              <Shield className="w-3.5 h-3.5" />
              Thông tin của bạn được bảo mật và mã hóa
            </div>
          </div>
        </motion.form>

        {/* Right: Trip Summary */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-2 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-5 md:p-6 shadow-sm md:sticky md:top-24 space-y-4"
        >
          <div className="flex items-center gap-2 border-l-4 border-primary-500 pl-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[var(--color-text-primary)] leading-tight">{isMultiLeg ? 'Chi tiết lộ trình' : 'Chi tiết vé'}</h2>
          </div>

          {isMultiLeg ? (
            <div className="space-y-3">
              {segments.map((seg, i) => (
                <div key={i} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500 shrink-0">
                      {seg.type === 'flight' ? <Plane className="w-3.5 h-3.5" /> : seg.type === 'bus' ? <Bus className="w-3.5 h-3.5" /> : <Train className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-xs font-bold text-primary-500 px-1.5 py-0.5 rounded bg-primary-500/10">{seg.code}</span>
                    <span className="text-xs text-[var(--color-text-secondary)] truncate">{seg.name}</span>
                    <span className="ml-auto text-xs font-bold text-primary-500 shrink-0">{formatCurrencyVnd(seg.price)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-[var(--color-text-primary)]">{seg.departureLocation}</span>
                    <span className="text-[var(--color-text-tertiary)]">{fmtTime(seg.departureTime)}</span>
                    <ArrowRight className="w-3 h-3 text-primary-500" />
                    <span className="font-semibold text-[var(--color-text-primary)]">{seg.arrivalLocation}</span>
                    <span className="text-[var(--color-text-tertiary)]">{fmtTime(seg.arrivalTime)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--color-text-secondary)]">Tổng {segments.length} vé</span>
                <span className="font-bold text-[var(--color-text-primary)]">{formatCurrencyVnd(segments.reduce((s, seg) => s + Number(seg.price || 0), 0))}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--color-border)]">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                isFlight
                  ? 'bg-primary-500/10 text-primary-500'
                  : 'bg-primary-500/10 text-primary-500'
              }`}>
                {isFlight ? <Plane className="w-5 h-5" /> : isBus ? <Bus className="w-5 h-5" /> : <Train className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {itemCode}
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  {itemName}
                </p>
              </div>
            </div>
          )}

          {!isMultiLeg && (
            <>
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 text-right">
                  <div className="text-xl font-bold text-[var(--color-text-primary)]">{fmtTime(item.departureTime)}</div>
                  <div className="text-sm font-medium text-[var(--color-text-secondary)]">{item.departureLocation}</div>
                </div>
                <div className="flex flex-col items-center px-2">
                  <div className="text-[10px] text-[var(--color-text-tertiary)] mb-1">{duration || `${Math.floor((new Date(item.arrivalTime) - new Date(item.departureTime)) / 3600000)}h ${Math.floor(((new Date(item.arrivalTime) - new Date(item.departureTime)) % 3600000) / 60000)}m`}</div>
                  <div className="relative">
                    <ArrowRight className="w-4 h-4 text-primary-500" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-xl font-bold text-[var(--color-text-primary)]">{fmtTime(item.arrivalTime)}</div>
                  <div className="text-sm font-medium text-[var(--color-text-secondary)]">{item.arrivalLocation}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)] pb-3 border-b border-[var(--color-border)]">
                <Clock className="w-3.5 h-3.5" />
                {fmtDate(item.departureTime)}
              </div>
            </>
          )}

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">{isMultiLeg ? 'Tổng giá vé' : passengerCount > 1 ? `Đơn giá × ${passengerCount}` : 'Đơn giá'}</span>
              <span className="font-semibold text-[var(--color-text-primary)]">
                {isMultiLeg ? formatCurrencyVnd(segments.reduce((s, seg) => s + Number(seg.price || 0), 0)) : formatCurrencyVnd(item.price)}
              </span>
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

          {promoApplied && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-600 font-medium">Giảm giá ({promoApplied.code})</span>
              <span className="text-green-600 font-semibold">-{formatCurrencyVnd(Math.min(totalPrice * (promoApplied.discountPercent / 100), promoApplied.maxDiscount))}</span>
            </div>
          )}

          <div className="h-px bg-[var(--color-border)]" />

          <div className="flex items-center justify-between">
            <span className="font-semibold text-[var(--color-text-primary)]">Tổng tiền</span>
            <span className="text-2xl font-black text-primary-500">{formatCurrencyVnd(finalPrice)}</span>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {walletModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setWalletModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] bg-primary-500/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
                    <Wallet className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-text-primary)]">Chọn ví thanh toán</h3>
                    <p className="text-[11px] text-[var(--color-text-tertiary)]">Bạn muốn thanh toán bằng ví nào?</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWalletModal(false)}
                  className="w-8 h-8 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                {walletProviders.map(w => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleChooseWallet(w.id)}
                    className="w-full flex items-center gap-3.5 p-4 rounded-xl border-2 border-[var(--color-border)] bg-white dark:bg-[var(--color-bg-card)] hover:border-primary-500 hover:shadow-md transition-all text-left group"
                  >
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${w.colors} text-white flex items-center justify-center font-black text-sm shadow-md group-hover:scale-105 transition-transform`}>
                      {w.short}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-[var(--color-text-primary)]">{w.label}</div>
                      <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{w.desc}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)] group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>

              <div className="px-5 py-3.5 bg-[var(--color-bg)] border-t border-[var(--color-border)] flex items-center gap-2 text-[11px] text-[var(--color-text-tertiary)]">
                <Shield className="w-3.5 h-3.5 shrink-0" />
                Bạn sẽ được chuyển sang cổng thanh toán của ví để hoàn tất giao dịch
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  )
}