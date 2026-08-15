import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Plane, Train, Bus, TrendingDown, AlertCircle, Check } from 'lucide-react'
import { formatCurrencyVnd } from '../utils/formatters'

const QUICK_DISCOUNTS = [10, 20, 30]

export default function PriceWatchModal({ item, type, onClose, onConfirm }) {
  const [target, setTarget] = useState(() => Math.round((item.price * 0.9) / 1000) * 1000)
  const [error, setError] = useState('')

  const isFlight = type === 'flight'
  const isBus = type === 'bus'
  const typeIcon = isFlight ? <Plane className="w-5 h-5" /> : isBus ? <Bus className="w-5 h-5" /> : <Train className="w-5 h-5" />
  const code = isFlight
    ? `${item.airlineCode}${(item.id % 900) + 100}`
    : isBus ? item.busCode : item.trainCode
  const typeLabel = isFlight ? 'Máy bay' : isBus ? 'Xe khách' : 'Tàu hỏa'

  const handleConfirm = () => {
    const value = Number(target)
    if (!value || value <= 0) { setError('Vui lòng nhập giá mục tiêu lớn hơn 0'); return }
    setError('')
    onConfirm?.(Math.round(value))
  }

  const willTriggerNow = Number(target) >= item.price

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={e => e.stopPropagation()}
          className="bg-[var(--color-bg-card)] rounded-3xl border border-[var(--color-border)] shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="flex items-center justify-between p-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-500/10 text-primary-500">
                {typeIcon}
              </div>
              <div>
                <h3 className="font-bold text-[var(--color-text-primary)]">Theo dõi giá vé</h3>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  {code} • {typeLabel} • {item.departureLocation} → {item.arrivalLocation}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/40 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mx-5 p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-tertiary)]">Giá hiện tại</span>
              <span className="font-bold text-primary-500">{formatCurrencyVnd(item.price)}</span>
            </div>
            <div className="flex items-start gap-1.5 text-[11px] text-[var(--color-text-tertiary)] leading-snug">
              <TrendingDown className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary-400" />
              <span>Chúng tôi sẽ thông báo qua email khi giá vé tuyến này đạt hoặc thấp hơn mức bạn chọn.</span>
            </div>
          </div>

          <div className="p-5 pt-4">
            <label className="block text-xs font-semibold text-[var(--color-text-tertiary)] mb-1.5 uppercase tracking-wider">
              Giá mục tiêu của bạn (VND)
            </label>
            <div className="relative">
              <Bell className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
              <input
                type="number"
                min="1"
                step="1000"
                value={target}
                onChange={e => setTarget(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
                className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 py-3 text-sm font-semibold text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)]"
                placeholder="Nhập giá bạn muốn"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className="text-[11px] text-[var(--color-text-tertiary)]">Nhanh:</span>
              {QUICK_DISCOUNTS.map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setTarget(Math.round((item.price * (100 - pct)) / 100 / 1000) * 1000)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-primary-500/40 hover:text-primary-400 hover:bg-primary-500/5 transition-all"
                >
                  -{pct}%
                </button>
              ))}
            </div>

            {willTriggerNow && (
              <div className="flex items-start gap-1.5 mt-3 text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl leading-snug">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Mức này bằng hoặc cao hơn giá hiện tại — cảnh báo sẽ kích hoạt ngay khi hệ thống kiểm tra.</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-1.5 mt-3 text-xs text-[var(--color-danger)] bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 px-3 py-2 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}
          </div>

          <div className="px-5 pb-5 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-[42px] rounded-xl border border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/30 transition-all"
            >
              Hủy
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white h-[42px] rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md shadow-primary-500/20"
            >
              <Check className="w-4 h-4" />
              Theo dõi
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
