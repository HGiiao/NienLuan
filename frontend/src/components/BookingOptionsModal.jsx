import { motion, AnimatePresence } from 'framer-motion'
import { Plane, Train, Bus, ExternalLink, ArrowRight, X, Building2, Globe, Calendar, Clock as ClockIcon } from 'lucide-react'
import { formatCurrencyVnd } from '../utils/formatters'

const airlineBookUrl = {
  VN: { name: 'Vietnam Airlines', url: 'https://www.vietnamairlines.com/vn/vi/booking' },
  VJ: { name: 'VietJet Air', url: 'https://www.vietjetair.com/vi/booking' },
  QH: { name: 'Bamboo Airways', url: 'https://www.bambooairways.com/booking' },
  BL: { name: 'Pacific Airlines', url: 'https://www.pacificairlines.com/vi/booking' },
  VU: { name: 'Vietravel Airlines', url: 'https://www.vietravelairlines.com/booking' },
}

const trainBookUrl = { name: 'Đường sắt Việt Nam', url: 'https://dsvn.vn/tra-cuu-ve' }

const busBookUrls = {
  'Mai Linh': { name: 'Mai Linh Express', url: 'https://mailinh.vn' },
  'Kumho Samco': { name: 'Kumho Samco', url: 'https://kumhovietnam.com' },
  'Hải Âu': { name: 'Hải Âu Bus', url: 'https://haiaubus.vn' },
  'Sao Việt': { name: 'Sao Việt', url: 'https://saovietbus.com' },
  'Phương Trang': { name: 'Phương Trang', url: 'https://futabus.vn' },
}

function formatDate(d) {
  const date = new Date(d)
  return date.toISOString().split('T')[0]
}

function buildDeepUrl(type, item) {
  const isFlight = type === 'flight'
  const from = item.departureLocation || ''
  const to = item.arrivalLocation || ''
  const date = item.flightDate || item.trainDate || item.busDate || formatDate(item.departureTime)
  const code = isFlight ? item.airlineCode : ''

  if (isFlight) {
    const base = airlineBookUrl[code]?.url
    if (!base) return '#'
    const params = new URLSearchParams({
      from: from,
      to: to,
      date: date,
      code: `${code}${(item.id % 900) + 100}`,
    })
    return `${base}?${params.toString()}`
  }

  if (type === 'bus') {
    const base = busBookUrls[item.busCompany]?.url
    if (!base) return '#'
    const params = new URLSearchParams({
      from: from,
      to: to,
      date: date,
      bus: item.busCode || '',
    })
    return `${base}?${params.toString()}`
  }

  const params = new URLSearchParams({
    from: from,
    to: to,
    date: date,
    train: item.trainCode || '',
  })
  return `${trainBookUrl.url}?${params.toString()}`
}

export default function BookingOptionsModal({ item, type, onClose, onBookAtVe247 }) {
  const isFlight = type === 'flight'
  const isBus = type === 'bus'
  const external = isFlight
    ? airlineBookUrl[item.airlineCode] || { name: item.airlineName, url: '#' }
    : isBus
      ? busBookUrls[item.busCompany] || { name: item.busCompany, url: '#' }
      : trainBookUrl

  const deepUrl = buildDeepUrl(type, item)
  const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' })
  const typeIcon = isFlight ? <Plane className="w-5 h-5" /> : isBus ? <Bus className="w-5 h-5" /> : <Train className="w-5 h-5" />
  const typeLabel = isFlight ? `${item.airlineCode}${(item.id % 900) + 100}` : isBus ? item.busCode : item.trainCode

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
                <h3 className="font-bold text-[var(--color-text-primary)]">Chọn nơi đặt vé</h3>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  {typeLabel} • {item.departureLocation} → {item.arrivalLocation}
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

          <div className="mx-5 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-[var(--color-text-tertiary)]">
              <Calendar className="w-3.5 h-3.5" />
              <span>{fmtDate(item.flightDate || item.trainDate || item.busDate || item.departureTime)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                <span className="text-[var(--color-text-secondary)]">{fmt(item.departureTime)}</span>
                <ArrowRight className="w-3 h-3 text-[var(--color-text-tertiary)]" />
                <span className="text-[var(--color-text-secondary)]">{fmt(item.arrivalTime)}</span>
              </div>
              <span className="font-bold text-primary-500">{formatCurrencyVnd(item.price)}</span>
            </div>
          </div>

          <div className="p-5 pt-4 space-y-3">
            <a
              href={deepUrl}
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
                <div className="text-xs text-[var(--color-text-tertiary)] truncate mt-0.5">Website chính thức • Deep link tới chuyến</div>
              </div>
              <ExternalLink className="w-5 h-5 text-[var(--color-text-tertiary)] group-hover:text-primary-500 shrink-0 transition-colors" />
            </a>

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
