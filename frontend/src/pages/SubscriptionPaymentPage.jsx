import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, Wallet, Building2, CheckCircle, XCircle, Crown, ArrowRight, Home, RefreshCw, Shield, Ban, Loader } from 'lucide-react'
import { subscribeToPlan } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
}

const paymentMethods = [
  { id: 'credit_card', label: 'Thẻ tín dụng', icon: CreditCard },
  { id: 'e_wallet', label: 'Ví điện tử', icon: Wallet },
  { id: 'bank_transfer', label: 'Chuyển khoản', icon: Building2 },
]

export default function SubscriptionPaymentPage() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const localUser = getStoredUser()

  const plan = location.state?.plan || null
  const billing = location.state?.billing || 'monthly'
  const price = location.state?.price || 0

  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('credit_card')

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
    setStatus('processing')
    setError('')
    try {
      await subscribeToPlan({ userId: localUser.id, planId: Number(planId), billingCycle: billing })
      setTransactionId(`SUB_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`)
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
      className="max-w-lg mx-auto px-4 py-6 md:py-10"
    >
      <div className="flex items-center justify-center gap-1.5 mb-4 text-xs font-semibold text-primary-400 bg-primary-500/10 px-3 py-1.5 rounded-full border border-primary-500/20 w-fit mx-auto">
        <Ban className="w-3.5 h-3.5" />
        Cổng thanh toán Sandbox — giao dịch luôn thành công
      </div>

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
                      onClick={() => setSelectedMethod(pm.id)}
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

            <div className="flex flex-col sm:flex-row gap-3">
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
