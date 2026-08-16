import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Crown, Check, Star, Zap, HeadphonesIcon, RefreshCw, AlertCircle, Sparkles, Clock, BarChart4 } from 'lucide-react'
import { getSubscriptionPlans, getUserSubscription } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'
import { PageHeader } from '../ui'

const planIcons = {
  Free: Star,
  VIP: Zap,
  Premium: Crown,
}

const POPULAR_PLAN = 'VIP'

// Quyền lợi được sinh từ chính dữ liệu gói trong DB (camelCase từ API) —
// đảm bảo những gì hiển thị khớp với quyền lợi backend đang thực thi.
// Không hiển thị SeatSelection vì tính năng chọn ghế đã bị gỡ khỏi app.
const planBenefits = (plan) => {
  const list = []
  if (plan?.maxAlertsPerDay != null) list.push(`${plan.maxAlertsPerDay} cảnh báo giá/ngày`)
  if (plan?.earlyPriceAlerts) list.push('Cảnh báo giá sớm')
  if (plan?.multiAirlineCompare) list.push('So sánh nhiều hãng')
  if (plan?.prioritySupport) list.push('Hỗ trợ ưu tiên')
  if (plan?.fastRefund) list.push('Hoàn tiền nhanh')
  if (list.length === 0) list.push('Quyền lợi cơ bản')
  return list
}

// Những quyền lợi gói hiện tại KHÔNG có — dùng để nói rõ giới hạn của gói Free
const missingBenefits = (plan) => {
  const miss = []
  if (!plan?.earlyPriceAlerts) miss.push('không cảnh báo sớm')
  if (!plan?.multiAirlineCompare) miss.push('không so sánh nhiều hãng')
  if (!plan?.prioritySupport) miss.push('không hỗ trợ ưu tiên')
  if (!plan?.fastRefund) miss.push('không hoàn tiền nhanh')
  return miss
}

const formatDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

export default function VipPlans() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [currentSub, setCurrentSub] = useState(null)
  const [billing, setBilling] = useState('monthly')
  const [loading, setLoading] = useState(true)

  const user = JSON.parse(sessionStorage.getItem('user') || 'null')

  useEffect(() => {
    Promise.all([
      getSubscriptionPlans().then(r => setPlans(r.data)),
      user?.id ? getUserSubscription(user.id).then(r => setCurrentSub(r.data)) : Promise.resolve(),
    ]).finally(() => setLoading(false))
  }, [user?.id])

  const handleSubscribe = (planId, planName, price) => {
    if (!user?.id) { navigate('/auth?redirect=/vip'); return }
    const plan = plans.find(p => p.id === planId)
    navigate(`/payment/subscription/${planId}`, { state: { plan, billing, price } })
  }

  const isCurrentPlan = (planName) => currentSub?.plan?.name === planName && currentSub?.isActive

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <Crown className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <h1 className="text-3xl font-black text-[var(--color-text-primary)] mb-2">Nâng cấp tài khoản VIP</h1>
        <p className="text-[var(--color-text-secondary)] max-w-lg mx-auto">Nhận cảnh báo giá sớm hơn, so sánh nhiều hãng hơn, và ưu đãi độc quyền dành cho hội viên</p>
      </div>

      {user?.id && currentSub && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`max-w-xl mx-auto mb-8 rounded-2xl border p-4 flex items-center gap-3 ${
            currentSub.isActive && currentSub.plan?.name !== 'Free'
              ? 'bg-primary-500/5 border-primary-500/25'
              : 'bg-[var(--color-bg-card)] border-[var(--color-border)]'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            currentSub.isActive && currentSub.plan?.name !== 'Free' ? 'bg-primary-500' : 'bg-primary-500/10'
          }`}>
            {(() => {
              const Icon = planIcons[currentSub.plan?.name] || Star
              return <Icon className={`w-5 h-5 ${currentSub.isActive && currentSub.plan?.name !== 'Free' ? 'text-white' : 'text-primary-500'}`} />
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[var(--color-text-primary)]">
              Gói hiện tại:{' '}
              <span className={currentSub.isActive && currentSub.plan?.name !== 'Free' ? 'text-primary-500' : 'text-[var(--color-text-secondary)]'}>
                {currentSub.plan?.name || 'Free'}
              </span>
            </p>
            <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">
              {currentSub.isActive && currentSub.endDate && currentSub.plan?.name !== 'Free'
                ? `Hiệu lực đến ${formatDate(currentSub.endDate)}`
                : currentSub.plan?.name === 'Free'
                  ? <>
                      <span className="text-[var(--color-text-secondary)] font-semibold">
                        Giới hạn gói Free: chỉ {currentSub.plan?.maxAlertsPerDay ?? 3} cảnh báo giá/ngày
                      </span>
                      {missingBenefits(currentSub.plan).length > 0 && (
                        <span> • {missingBenefits(currentSub.plan).join(' • ')}</span>
                      )}
                      <span className="block mt-0.5 text-primary-500 font-semibold">Nâng cấp VIP để mở tất cả quyền lợi</span>
                    </>
                  : 'Gói đã hết hạn — gia hạn để tiếp tục dùng quyền lợi'}
            </p>
          </div>
        </motion.div>
      )}

      <div className="flex items-center justify-center gap-2 mb-8">
        <button onClick={() => setBilling('monthly')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${billing === 'monthly' ? 'bg-primary-500/10 text-primary-500 border border-primary-500/30' : 'bg-[var(--color-border)]/30 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>Hàng tháng</button>
        <button onClick={() => setBilling('yearly')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${billing === 'yearly' ? 'bg-primary-500/10 text-primary-500 border border-primary-500/30' : 'bg-[var(--color-border)]/30 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>
          Hàng năm <span className="text-[10px] bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded ml-1">Tiết kiệm 17%</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-80 bg-[var(--color-border)]/20 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.filter(p => p.name !== 'Free').map((plan, idx) => {
            const Icon = planIcons[plan.name] || Star
            const benefitsList = planBenefits(plan)
            const isPopular = plan.name === POPULAR_PLAN
            const current = isCurrentPlan(plan.name)
            const price = billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice

            return (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                className={`relative bg-[var(--color-bg-card)] border-2 rounded-2xl p-6 flex flex-col transition-all hover:shadow-xl ${isPopular ? 'border-primary-500 shadow-lg shadow-primary-500/10' : 'border-[var(--color-border)]'}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-[10px] font-bold px-3 py-1 rounded-full">Phổ biến nhất</div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isPopular ? 'bg-primary-500' : 'bg-primary-500/10'}`}>
                    <Icon className={`w-5 h-5 ${isPopular ? 'text-white' : 'text-primary-500'}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[var(--color-text-primary)]">{plan.name}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-5">
                  <span className="text-3xl font-black text-[var(--color-text-primary)]">{price === 0 ? 'Miễn phí' : formatCurrencyVnd(price)}</span>
                  {price > 0 && <span className="text-sm text-[var(--color-text-tertiary)]">/{billing === 'yearly' ? 'năm' : 'tháng'}</span>}
                </div>

                <div className="flex-1 space-y-2.5 mb-6">
                  {benefitsList.map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-[var(--color-text-secondary)]">{f}</span>
                    </div>
                  ))}
                </div>

                <button onClick={() => handleSubscribe(plan.id, plan.name, price)} disabled={current}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-all mt-auto ${current ? 'bg-emerald-500/10 text-emerald-500 border-2 border-emerald-500/20 cursor-default' : isPopular ? 'bg-primary-500 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0' : 'border-2 border-primary-500/30 text-primary-500 hover:bg-primary-500/10'}`}
                >{current ? 'Đã đăng ký' : price === 0 ? 'Miễn phí' : 'Đăng ký ngay'}</button>
              </motion.div>
            )
          })}
        </div>
      )}

      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Clock, title: 'Cảnh báo sớm', desc: 'Nhận thông báo giá giảm trước người dùng thường 2-4 giờ' },
          { icon: BarChart4, title: 'So sánh đa hãng', desc: 'So sánh giá giữa tất cả các hãng bay và tàu hỏa' },
          { icon: HeadphonesIcon, title: 'Hỗ trợ ưu tiên', desc: 'Đường dây nóng riêng, ưu tiên xử lý yêu cầu' },
          { icon: RefreshCw, title: 'Hoàn tiền nhanh', desc: 'Hoàn tiền trong 24-48h thay vì 7 ngày' },
        ].map((item, i) => {
          const Icon = item.icon
          return (
            <div key={i} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 text-center">
              <Icon className="w-6 h-6 text-accent-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-[var(--color-text-primary)]">{item.title}</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{item.desc}</p>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
