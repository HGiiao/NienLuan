import { useEffect, useState } from 'react'
import { Copy, Check, Percent, Gift } from 'lucide-react'
import { getPublicPromoCodes } from '../services/api'

export default function PromoBanner() {
  const [promos, setPromos] = useState([])
  const [copied, setCopied] = useState('')

  useEffect(() => {
    getPublicPromoCodes()
      .then(res => setPromos(res.data || []))
      .catch(() => {})
  }, [])

  if (!promos.length) return null

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(''), 2000)
    } catch {}
  }

  return (
    <section className="py-16 md:py-24 bg-[var(--color-surface-50)] border-t border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-10 md:mb-12">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-500 uppercase tracking-wider bg-primary-500/10 border border-primary-500/20 px-3 py-1.5 rounded-full mb-3">
            <Gift className="w-3.5 h-3.5" />
            Ưu đãi hôm nay
          </span>
          <h2 className="text-2xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-3">
            Mã giảm giá <span className="text-primary-500">đang chờ bạn</span>
          </h2>
          <p className="text-sm md:text-base text-[var(--color-text-secondary)] max-w-xl mx-auto">
            Chọn mã để sao chép, rồi dán vào ô mã giảm giá khi thanh toán để được giảm ngay
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {promos.map(p => (
            <button
              key={p.code}
              type="button"
              onClick={() => copy(p.code)}
              className="group relative text-left bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-accent-500/10 to-transparent rounded-bl-full" />
              <div className="relative flex items-start justify-between gap-3 mb-3">
                <span className="text-base md:text-lg font-black tracking-wide text-primary-500">{p.code}</span>
                <span className="flex items-center gap-1 text-xs font-bold bg-accent-500/10 text-accent-500 px-2.5 py-1 rounded-full shrink-0">
                  <Percent className="w-3 h-3" />
                  {p.discountPercent}%
                </span>
              </div>
              <p className="relative text-xs md:text-sm text-[var(--color-text-secondary)] leading-relaxed min-h-[40px] mb-4">
                {p.description}
              </p>
              <div className={`relative flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                copied === p.code ? 'text-[var(--color-success)]' : 'text-primary-500 group-hover:text-primary-600'
              }`}>
                {copied === p.code ? (
                  <><Check className="w-4 h-4" /> Đã sao chép — dán vào bước thanh toán</>
                ) : (
                  <><Copy className="w-4 h-4" /> Sao chép mã</>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
