import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Lock, ShieldCheck, User, CalendarDays, BadgeCheck, AlertCircle } from 'lucide-react'

const cardBrands = [
  { name: 'Visa', match: n => /^4/.test(n), badge: 'bg-blue-600', text: 'VISA' },
  { name: 'Mastercard', match: n => /^(5[1-5]|2[2-7])/.test(n), badge: 'bg-orange-500', text: 'MASTERCARD' },
  { name: 'JCB', match: n => /^35(?:2[89]|[3-8][0-9])/.test(n), badge: 'bg-green-600', text: 'JCB' },
]

function formatCardNumber(v) {
  const digits = v.replace(/\D/g, '').slice(0, 19)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(v) {
  const d = v.replace(/\D/g, '').slice(0, 4)
  if (d.length <= 2) return d
  return d.slice(0, 2) + '/' + d.slice(2)
}

function luhnValid(number) {
  const digits = number.replace(/\s/g, '')
  if (!/^\d{13,19}$/.test(digits)) return false
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i])
    if (double) { d *= 2; if (d > 9) d -= 9 }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

function expiryValid(v) {
  const m = v.match(/^(\d{2})\/(\d{2})$/)
  if (!m) return false
  const mm = Number(m[1])
  const yy = 2000 + Number(m[2])
  if (mm < 1 || mm > 12) return false
  return new Date(yy, mm, 1) > new Date()
}

export default function CardPaymentPanel({ onChange, onValidChange }) {
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [touched, setTouched] = useState({})
  const [focused, setFocused] = useState('')

  const brand = useMemo(
    () => cardBrands.find(b => b.match(cardNumber.replace(/\s/g, ''))) || null,
    [cardNumber]
  )

  const cardData = useMemo(() => ({
    cardNumber,
    last4: cardNumber.replace(/\s/g, '').slice(-4),
    cardName,
    expiry,
    cvv,
    brand: brand?.name || 'Thẻ',
  }), [cardNumber, cardName, expiry, cvv, brand])

  const errors = useMemo(() => {
    const e = {}
    if (touched.cardNumber && !luhnValid(cardNumber)) e.cardNumber = 'Số thẻ không hợp lệ (16-19 chữ số)'
    if (touched.cardName && cardName.trim().length < 3) e.cardName = 'Nhập đúng tên in trên thẻ'
    if (touched.expiry && !expiryValid(expiry)) e.expiry = 'Ngày hết hạn không hợp lệ (MM/YY)'
    if (touched.cvv && !/^\d{3,4}$/.test(cvv)) e.cvv = 'Mã CVV gồm 3-4 chữ số'
    return e
  }, [cardNumber, cardName, expiry, cvv, touched])

  const isValid = luhnValid(cardNumber) && cardName.trim().length >= 3 && expiryValid(expiry) && /^\d{3,4}$/.test(cvv)

  useEffect(() => { onChange?.(cardData) }, [cardData])
  useEffect(() => { onValidChange?.(isValid) }, [isValid])

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    setFocused('')
  }

  const inputCls = (hasError) =>
    `w-full border rounded-xl px-3.5 py-2.5 text-sm bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none transition-all ${
      hasError
        ? 'border-[var(--color-danger)] focus:ring-2 focus:ring-[var(--color-danger)]/20'
        : 'border-[var(--color-border)] focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500'
    }`

  const maskedNumber = cardNumber
    ? cardNumber.replace(/\d{4}(?= \d)/g, '••••').replace(/[ ]/g, ' ')
    : '•••• •••• •••• ••••'

  return (
    <div className="rounded-2xl border border-primary-500/20 bg-primary-500/5 p-4 md:p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 shrink-0">
          <CreditCard className="w-4.5 h-4.5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-[var(--color-text-primary)]">Thông tin thẻ tín dụng / ghi nợ</h4>
          <p className="text-[11px] text-[var(--color-text-tertiary)]">Thanh toán an toàn, hỗ trợ Visa, Mastercard, JCB</p>
        </div>
      </div>

      {/* Card preview */}
      <div className="relative rounded-2xl p-5 overflow-hidden text-white bg-gradient-to-br from-primary-600 via-primary-500 to-accent-500 shadow-lg shadow-primary-500/20">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-6 w-40 h-40 rounded-full bg-white/5" />
        <div className="relative flex items-start justify-between">
          <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-white/40" />
          </div>
          <span className="text-[11px] font-bold tracking-widest bg-white/20 px-2 py-1 rounded-lg">{brand?.text || 'CARD'}</span>
        </div>
        <p className={`relative mt-5 font-mono tracking-widest text-lg ${cardNumber ? '' : 'opacity-80'}`}>{maskedNumber}</p>
        <div className="relative mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wider opacity-70">Chủ thẻ</p>
            <p className="text-sm font-semibold truncate uppercase">{cardName || 'HỌ TÊN CHỦ THẺ'}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] uppercase tracking-wider opacity-70">Hết hạn</p>
            <p className="text-sm font-semibold">{expiry || 'MM/YY'}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Số thẻ</label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input
              className={`${inputCls(errors.cardNumber)} pl-9 pr-14`}
              placeholder="4111 1111 1111 1111"
              inputMode="numeric"
              value={cardNumber}
              onChange={e => setCardNumber(formatCardNumber(e.target.value))}
              onFocus={() => setFocused('cardNumber')}
              onBlur={() => handleBlur('cardNumber')}
            />
            {brand && (
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-white px-2 py-1 rounded-md ${brand.badge}`}>
                {brand.text}
              </span>
            )}
          </div>
          {errors.cardNumber && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.cardNumber}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Tên chủ thẻ</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input
              className={`${inputCls(errors.cardName)} pl-9 uppercase`}
              placeholder="NGUYEN VAN A"
              value={cardName}
              onChange={e => setCardName(e.target.value.toUpperCase())}
              onFocus={() => setFocused('cardName')}
              onBlur={() => handleBlur('cardName')}
            />
          </div>
          {errors.cardName && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.cardName}</p>}
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Ngày hết hạn</label>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input
              className={`${inputCls(errors.expiry)} pl-9`}
              placeholder="MM/YY"
              inputMode="numeric"
              value={expiry}
              onChange={e => setExpiry(formatExpiry(e.target.value))}
              onFocus={() => setFocused('expiry')}
              onBlur={() => handleBlur('expiry')}
            />
          </div>
          {errors.expiry && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.expiry}</p>}
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 block">Mã CVV</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input
              className={`${inputCls(errors.cvv)} pl-9`}
              placeholder="•••"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={cvv}
              onChange={e => setCvv(e.target.value.replace(/\D/g, ''))}
              onFocus={() => setFocused('cvv')}
              onBlur={() => handleBlur('cvv')}
            />
          </div>
          {errors.cvv && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.cvv}</p>}
        </div>
      </div>

      {/* Status + secure note */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {isValid ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-success)]">
            <BadgeCheck className="w-4 h-4" />
            Thông tin thẻ hợp lệ
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
            <AlertCircle className="w-4 h-4" />
            Điền đầy đủ thông tin thẻ để hoàn tất
          </span>
        )}
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <p className="text-xs text-[var(--color-text-secondary)]">
          Giao dịch được mã hóa SSL 256-bit. Thông tin thẻ không được lưu trên hệ thống. Vui lòng nhập thông tin
          giống như trên thẻ thực tế để hoàn tất thanh toán.
        </p>
      </div>
    </div>
  )
}
