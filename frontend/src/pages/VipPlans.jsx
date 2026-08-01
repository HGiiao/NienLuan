import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Crown, Check, Star, Zap, HeadphonesIcon, RefreshCw, AlertCircle, Sparkles, Clock, BarChart4 } from 'lucide-react'
import { getSubscriptionPlans, getUserSubscription } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'
import { PageHeader } from '../ui'

const benefits = {
  Free: { icon: Star, features: ['3 cảnh báo giá/ngày', 'So sánh 1 hãng', 'Hỗ trợ thường', 'Hoàn tiền 7 ngày'] },
  VIP: { icon: Zap, features: ['20 cảnh báo giá/ngày', 'Cảnh báo sớm 2h', 'So sánh nhiều hãng', 'Hỗ trợ ưu tiên', 'Hoàn tiền 48h', 'Chọn ghế miễn phí'], popular: true },
  Premium: { icon: Crown, features: ['50 cảnh báo giá/ngày', 'Cảnh báo sớm 4h', 'So sánh tất cả hãng', 'Hỗ trợ VIP 24/7', 'Hoàn tiền 24h', 'Chọn ghế miễn phí', 'Ưu đãi độc quyền'] },
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
            const Icon = benefits[plan.name]?.icon || Star
            const planBenefits = benefits[plan.name]?.features || []
            const isPopular = benefits[plan.name]?.popular
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
                  {planBenefits.map((f, i) => (
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
