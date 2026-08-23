import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CalendarRange, Loader } from 'lucide-react'
import { getFlexibleCompare } from '../../services/api'
import { formatCurrencyVnd } from '../../utils/formatters'

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

export default function FlexibleDates({ from, to, date, onPick }) {
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!from || !to) return
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await getFlexibleCompare({ from, to, date: date || undefined, days: 3 })
        if (!cancelled) setDays(res.data?.results || [])
      } catch {
        if (!cancelled) setDays([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 350)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [from, to, date])

  if (!from || !to || (!loading && days.length === 0)) return null

  const dayKey = (d) => (d.date ? String(d.date).substring(0, 10) : '')
  const minOf = (d) => {
    const prices = [d.flights?.minPrice, d.trains?.minPrice, d.buses?.minPrice].filter(p => p != null)
    return prices.length ? Math.min(...prices) : null
  }
  // Ngày tham chiếu = ngày đang chọn; nếu trống thì backend mặc định hôm nay
  const baseKey = date || new Date().toISOString().substring(0, 10)
  const basePrice = (() => {
    const sel = days.find(d => dayKey(d) === baseKey)
    return sel ? minOf(sel) : null
  })()

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 mb-6 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <CalendarRange className="w-4 h-4 text-primary-500" />
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Giá ngày lân cận</h3>
        <span className="text-[11px] text-[var(--color-text-tertiary)] hidden sm:inline">— bấm vào ngày để so sánh theo ngày đó</span>
        {loading && <Loader className="w-3.5 h-3.5 text-primary-400 animate-spin ml-auto" />}
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {days.map((d, i) => {
          const key = dayKey(d)
          const min = minOf(d)
          const dt = new Date(key)
          const isSelected = key === baseKey
          const delta = min != null && basePrice ? ((min - basePrice) / basePrice) * 100 : null
          const cheaper = delta != null && delta <= -1
          const pricier = delta != null && delta >= 1
          return (
            <motion.button
              key={key || i}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={!min}
              onClick={() => onPick(key)}
              className={`relative rounded-xl border px-2 py-2.5 text-center transition-all ${
                isSelected
                  ? 'border-primary-500 bg-primary-500/10 shadow-md shadow-primary-500/10'
                  : min
                    ? 'border-[var(--color-border)] bg-[var(--color-bg)] hover:border-primary-500/40 cursor-pointer'
                    : 'border-dashed border-[var(--color-border)] bg-transparent opacity-60 cursor-default'
              }`}
            >
              <p className={`text-[10px] font-semibold ${isSelected ? 'text-primary-500' : 'text-[var(--color-text-tertiary)]'}`}>
                {DAY_LABELS[dt.getDay()]} · {dt.getDate().toString().padStart(2, '0')}/{(dt.getMonth() + 1).toString().padStart(2, '0')}
              </p>
              <p className={`text-xs font-bold mt-1 ${!min ? 'text-[var(--color-text-tertiary)]' : isSelected ? 'text-primary-500' : cheaper ? 'text-[var(--color-success)]' : pricier ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-primary)]'}`}>
                {min ? formatCurrencyVnd(min) : '—'}
              </p>
              {!isSelected && delta != null && Math.abs(delta) >= 1 && (
                <span className={`absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  cheaper ? 'bg-emerald-500 text-white' : 'bg-red-400 text-white'
                }`}>
                  {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
                </span>
              )}
              {isSelected && (
                <span className="absolute inset-x-3 -bottom-[1px] h-[2px] rounded-full bg-primary-500" />
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
