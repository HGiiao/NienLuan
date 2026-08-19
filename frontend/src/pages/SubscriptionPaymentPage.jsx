import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, Wallet, Building2, CheckCircle, XCircle, Crown, ArrowRight, Home, RefreshCw, Shield, Loader, Check } from 'lucide-react'
import { subscribeToPlan } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'
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

export default function SubscriptionPaymentPage() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const localUser = getStoredUser()

  const plan = location.state?.plan || null
  const billing = location.state?.billing || 'monthly'
  const price = location.state?.price ?? (plan ? (billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice) : 0)

  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('credit_card')
  const [walletProvider, setWalletProvider] = useState('')
  const [transferRef, setTransferRef] = useState('')
  const [cardInfo, setCardInfo] = useState(null)

  const selectMethod = (id) => {
    setSelectedMethod(id)
    if (id !== 'e_wallet') setWalletProvider('')
    if (id === 'bank_transfer' && !transferRef) {
      const d = new Date()
      const p = (n) => String(n).padStart(2, '0')
      setTransferRef(`VE247VIP${planId}${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`)
    }
  }

  useEffect(() => {
    if (!localUser) {
      navigate(`/auth?redirect=${encodeURIComponent(`/payment/subscription/${planId}`)}`, { replace: true })
    }
  }, [])

  if (!localUser) return null

  if (!plan) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-7 h-7 text-[var(--color-danger)]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Không tìm thấy thông tin gói</h2>
        <p className="text-[var(--color-text-secondary)] mb-6">Vui lòng quay lại trang VIP và thử lại</p>
        <button onClick={() => navigate('/vip')} className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md">
          Quay lại trang VIP
        </button>
      </div>
    )
  }

  const doPayment = async () => {
    if (selectedMethod === 'e_wallet' && !walletProvider) {
      setError('Vui lòng chọn ví thanh toán (VNPay hoặc PayOS)')
      return
    }
    setStatus('processing')
    setError('')
    try {
      const res = await subscribeToPlan({
        userId: localUser.id,
        planId: Number(planId),
        billingCycle: billing,
        paymentMethod: selectedMethod,
        paymentProvider: selectedMethod === 'e_wallet' ? walletProvider : null,
      })
      if (res.data?.success === false) {
        setError(res.data.message || 'Giao dịch không thể hoàn tất. Vui lòng thử lại.')
        setStatus('failed')
        return
      }
      const subId = res.data?.subscription?.id
      setTransactionId(subId ? `SUB_${subId}` : '')
      setStatus('success')
    } catch (err) {
      setError(err.response?.data?.message || 'Giao dịch không thể hoàn tất. Vui lòng thử lại.')
      setStatus('failed')
    }
  }

  const method = paymentMethods.find(m => m.id === selectedMethod)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto px-4 py-6 md:py-10"
    >
      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-primary-500" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Thanh toán gói {plan.name}</h1>
              <p className="text-sm text-[var(--color-text-secondary)]">Xác nhận và thanh toán để kích hoạt tài khoản</p>
            </div>

            <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-5 shadow-sm space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">Gói đăng ký</span>
                <span className="font-bold text-[var(--color-text-primary)]">{plan.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">Chu kỳ</span>
                <span className="font-semibold text-[var(--color-text-primary)]">{billing === 'yearly' ? 'Hàng năm' : 'Hàng tháng'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">Tài khoản</span>
                <span className="font-semibold text-[var(--color-text-primary)]">{localUser.email}</span>
              </div>
              <div className="h-px bg-[var(--color-border)]" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--color-text-primary)]">Số tiền thanh toán</span>
                <span className="text-2xl font-black text-primary-500">{formatCurrencyVnd(price)}</span>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Phương thức thanh toán</p>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map(pm => {
                  const active = pm.id === selectedMethod
                  return (
                    <button
                      key={pm.id}
                      onClick={() => selectMethod(pm.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        active
                          ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                          : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-primary-500/30 hover:text-[var(--color-text-primary)]'
                      }`}
                    >
                      <pm.icon className="w-4 h-4" />
                      {pm.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {selectedMethod === 'bank_transfer' && (
              <div className="mt-2">
                <BankTransferPanel amount={price} content={transferRef} />
              </div>
            )}

            {selectedMethod === 'e_wallet' && (
              <div className="mt-2">
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

                  <div className="grid sm:grid-cols-2 md:grid-cols-2 gap-3">
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
                </div>
              </div>
            )}

            {selectedMethod === 'credit_card' && (
              <div className="mt-2">
                <CardPaymentPanel onChange={setCardInfo} />
              </div>
            )}

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/vip')}
                className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] py-3.5 rounded-xl font-medium transition-all"
              >
                Quay lại
              </button>
              <button
                onClick={doPayment}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md"
              >
                Thanh toán {formatCurrencyVnd(price)}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {status === 'processing' && (
          <motion.div key="processing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-20 h-20 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-6"
            />
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Đang xử lý thanh toán...</h1>
            <p className="text-[var(--color-text-secondary)] mb-6">Vui lòng không đóng trang này</p>

            <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">Gói đăng ký</span>
                <span className="font-bold text-[var(--color-text-primary)]">{plan.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">Phương thức</span>
                <span className="font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  {method && <method.icon className="w-4 h-4 text-[var(--color-text-tertiary)]" />}
                  {method?.label}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                <span className="font-semibold text-[var(--color-text-primary)]">Số tiền</span>
                <span className="text-xl font-black text-primary-500">{formatCurrencyVnd(price)}</span>
              </div>
            </div>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="w-20 h-20 rounded-full bg-[var(--color-success)]/10 flex items-center justify-center mx-auto mb-5"
            >
              <CheckCircle className="w-10 h-10 text-[var(--color-success)]" />
            </motion.div>

            <h1 className="text-2xl font-bold text-center text-[var(--color-text-primary)] mb-1">Thanh toán thành công!</h1>
            <p className="text-center text-[var(--color-text-secondary)] mb-6">Tài khoản {plan.name} đã được kích hoạt</p>

            {transactionId && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-tertiary)] mb-4">
                <Shield className="w-3 h-3" />
                Mã giao dịch: <span className="font-mono font-semibold text-[var(--color-text-secondary)]">{transactionId}</span>
              </div>
            )}

            <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-5 shadow-sm space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">Gói</span>
                <span className="font-bold text-[var(--color-text-primary)]">{plan.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">Chu kỳ</span>
                <span className="font-semibold text-[var(--color-text-primary)]">{billing === 'yearly' ? 'Hàng năm' : 'Hàng tháng'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">Trạng thái</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] text-xs font-semibold border border-[var(--color-success)]/20">Đã kích hoạt</span>
              </div>
              <div className="h-px bg-[var(--color-border)]" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--color-text-primary)]">Đã thanh toán</span>
                <span className="text-xl font-black text-primary-500">{formatCurrencyVnd(price)}</span>
              </div>
            </div>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/vip')}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md"
              >
                <Crown className="w-4 h-4" />
                Xem quyền lợi VIP
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
          <motion.div key="failed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="w-20 h-20 rounded-full bg-[var(--color-danger)]/10 flex items-center justify-center mx-auto mb-5"
            >
              <XCircle className="w-10 h-10 text-[var(--color-danger)]" />
            </motion.div>

            <h1 className="text-2xl font-bold text-center text-[var(--color-text-primary)] mb-1">Thanh toán thất bại</h1>
            <p className="text-center text-[var(--color-text-secondary)] mb-6">{error}</p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={doPayment}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                Thử lại
              </button>
              <button
                onClick={() => navigate('/vip')}
                className="flex items-center justify-center gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-6 py-3.5 rounded-xl font-medium transition-all"
              >
                Quay lại trang VIP
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
