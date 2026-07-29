import { motion, AnimatePresence } from 'framer-motion'
import { Plane, Train, ExternalLink, ArrowRight, X, Building2, Globe } from 'lucide-react'
import { formatCurrencyVnd } from '../utils/formatters'

const airlineBookUrl = {
  VN: { name: 'Vietnam Airlines', url: 'https://www.vietnamairlines.com/' },
  VJ: { name: 'VietJet Air', url: 'https://www.vietjetair.com/' },
  QH: { name: 'Bamboo Airways', url: 'https://www.bambooairways.com/' },
  BL: { name: 'Pacific Airlines', url: 'https://www.pacificairlines.com/' },
  VU: { name: 'Vietravel Airlines', url: 'https://www.vietravelairlines.com/' },
}

const trainBookUrl = { name: 'Đường sắt Việt Nam', url: 'https://dsvn.vn/' }

export default function BookingOptionsModal({ item, type, onClose, onBookAtVe247 }) {
  const isFlight = type === 'flight'
  const external = isFlight
    ? airlineBookUrl[item.airlineCode] || { name: item.airlineName, url: '#' }
    : trainBookUrl

  const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

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
          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isFlight
                  ? 'bg-primary-500/10 text-primary-500'
                  : 'bg-primary-500/10 text-primary-500'
              }`}>
                {isFlight ? <Plane className="w-5 h-5" /> : <Train className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-[var(--color-text-primary)]">Chọn nơi đặt vé</h3>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  {isFlight
                    ? `${item.airlineCode}${(item.id % 900) + 100} • ${item.departureLocation} → ${item.arrivalLocation}`
                    : `${item.trainCode} • ${item.departureLocation} → ${item.arrivalLocation}`}
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

          {/* Info bar */}
          <div className="mx-5 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-text-secondary)]">{fmt(item.departureTime)}</span>
              <ArrowRight className="w-3 h-3 text-[var(--color-text-tertiary)]" />
              <span className="text-[var(--color-text-secondary)]">{fmt(item.arrivalTime)}</span>
            </div>
            <span className="font-bold text-primary-500">{formatCurrencyVnd(item.price)}</span>
          </div>

          {/* Options */}
          <div className="p-5 pt-4 space-y-3">
            {/* Option 1: Book at carrier */}
            <a
              href={external.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--color-border)] hover:border-primary-500/40 hover:bg-primary-500/5 transition-all group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400 shrink-0 group-hover:scale-105 transition-transform">
                <Globe className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                  <div className="font-bold text-[var(--color-text-primary)] group-hover:text-primary-400 transition-colors">
                  Đặt tại {external.name}
                </div>
                <div className="text-xs text-[var(--color-text-tertiary)] truncate mt-0.5">Website chính thức • Giá niêm yết</div>
              </div>
              <ExternalLink className="w-5 h-5 text-[var(--color-text-tertiary)] group-hover:text-primary-500 shrink-0 transition-colors" />
            </a>

            {/* Option 2: Book at Ve247 */}
            <button
              onClick={() => onBookAtVe247?.(item)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--color-border)] hover:border-primary-500/40 hover:bg-primary-500/5 transition-all group text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[var(--color-text-primary)] group-hover:text-primary-500 transition-colors">
                  Đặt tại Vé247
                </div>
                <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">Đại lý ủy quyền • Hỗ trợ 24/7</div>
              </div>
              <ArrowRight className="w-5 h-5 text-[var(--color-text-tertiary)] group-hover:text-primary-500 shrink-0 transition-colors" />
            </button>
          </div>

          <div className="px-5 pb-5">
            <p className="text-[11px] text-[var(--color-text-tertiary)] text-center">
              Vé247 là đại lý ủy quyền, không phải hãng vận chuyển.
              Giá có thể chênh lệch so với website chính thức.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
