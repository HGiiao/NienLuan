import { motion, AnimatePresence } from 'framer-motion'
import { X, Plane, Train, Bus, Shield, Clock } from 'lucide-react'
import { formatCurrencyVnd } from '../utils/formatters'

const cityNames = {
  HAN: 'Hà Nội', SGN: 'TP. Hồ Chí Minh', DAD: 'Đà Nẵng',
  CXR: 'Nha Trang', PQC: 'Phú Quốc', HUI: 'Huế',
  HPH: 'Hải Phòng', VII: 'Vinh', VCA: 'Cần Thơ',
  UIH: 'Quy Nhơn', QNG: 'Quảng Ngãi',
}

const cityName = (code) => cityNames[code] || code

const ModeIcon = ({ mode, className }) =>
  mode === 'flight' ? <Plane className={className} />
    : mode === 'bus' ? <Bus className={className} />
      : <Train className={className} />

const modeLabel = (mode) => (mode === 'flight' ? 'Chuyến bay' : mode === 'bus' ? 'Xe khách' : 'Tàu hỏa')

// Mirror FarePolicy.GetCancelPolicy (backend) — hiển thị khớp số tiền hoàn thật khi hủy từng chặng
function getFareRule(price, seatClass) {
  const premium = seatClass === 'PremiumEconomy' || seatClass === 'Premium Economy'
  if (seatClass === 'Business' || price >= 2500000) return { label: 'Hoàn 100% trước 48h', free: true }
  if (premium || price >= 1200000) return { label: 'Hoàn 50% trước 24h', free: false }
  return { label: 'Không được hoàn', free: false }
}

const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })
const durationText = (from, to) => {
  const ms = new Date(to) - new Date(from)
  return `${Math.floor(ms / 3600000)}h${Math.floor((ms % 3600000) / 60000)}m`
}

export default function MultiLegTicketDetailModal({ booking, onClose }) {
  const segments = booking.segments || []
  const first = segments[0]
  const last = segments[segments.length - 1]

  if (!first) return null

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-[var(--color-bg-card)] rounded-2xl shadow-2xl border border-[var(--color-border)] w-full max-w-lg max-h-[85vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-gradient-to-r from-primary-500 to-primary-600">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">Lộ trình kết hợp</h3>
                <p className="text-white/70 text-xs">{segments.length} chặng · Đặt chỗ #{booking.id}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Tổng quan lộ trình */}
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-2">{fmtDate(first.departureTime)}</p>
              <div className="flex items-center gap-3">
                <div className="text-right min-w-[80px]">
                  <div className="text-xl font-bold text-[var(--color-text-primary)]">{fmt(first.departureTime)}</div>
                  <div className="text-xs text-[var(--color-text-secondary)] font-semibold">{first.departureLocation}</div>
                  <div className="text-[10px] text-[var(--color-text-tertiary)]">{cityName(first.departureLocation)}</div>
                </div>
                <div className="flex-1 flex flex-col items-center px-2">
                  <div className="text-[11px] text-[var(--color-text-tertiary)] font-medium">{durationText(first.departureTime, last.arrivalTime)}</div>
                  <div className="w-full flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary-500 shrink-0" />
                    <div className="flex-1 h-[2px] bg-gradient-to-r from-primary-500 via-primary-400 to-primary-500 rounded-full" />
                    <div className="w-2.5 h-2.5 rounded-full bg-primary-500 shrink-0" />
                  </div>
                  <div className="text-[10px] font-semibold text-primary-500">Lộ trình kết hợp</div>
                </div>
                <div className="text-left min-w-[80px]">
                  <div className="text-xl font-bold text-[var(--color-text-primary)]">{fmt(last.arrivalTime)}</div>
                  <div className="text-xs text-[var(--color-text-secondary)] font-semibold">{last.arrivalLocation}</div>
                  <div className="text-[10px] text-[var(--color-text-tertiary)]">{cityName(last.arrivalLocation)}</div>
                </div>
              </div>
            </div>

            <div className="h-px bg-[var(--color-border)]" />

            {/* Danh sách chặng */}
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">Chi tiết từng chặng</h4>
              <div className="space-y-3">
                {segments.map((seg, i) => {
                  const rule = getFareRule(seg.price, seg.seatClass)
                  const prev = segments[i - 1]
                  const layoverMs = prev ? new Date(seg.departureTime) - new Date(prev.arrivalTime) : 0
                  return (
                    <div key={seg.id ?? i}>
                      {prev && layoverMs > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-[var(--color-bg)] border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-tertiary)]">
                          <Clock className="w-3.5 h-3.5" />
                          Chờ chuyển tuyến {durationText(prev.arrivalTime, seg.departureTime)} tại {prev.arrivalLocation}
                        </div>
                      )}
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500 shrink-0">
                              <ModeIcon mode={seg.mode} className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-[var(--color-text-primary)] truncate">Chặng {i + 1} · {modeLabel(seg.mode)}</div>
                              <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">{seg.code} · {seg.name}</div>
                            </div>
                          </div>
                          {seg.seatClass && (
                            <span className="shrink-0 inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border border-primary-500/20 text-primary-500 bg-primary-500/10">
                              {seg.seatClass}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right min-w-[64px]">
                            <div className="text-base font-bold text-[var(--color-text-primary)]">{fmt(seg.departureTime)}</div>
                            <div className="text-[11px] text-[var(--color-text-secondary)] font-semibold">{seg.departureLocation}</div>
                          </div>
                          <div className="flex-1 flex flex-col items-center px-1">
                            <div className="text-[10px] text-[var(--color-text-tertiary)] font-medium">{durationText(seg.departureTime, seg.arrivalTime)}</div>
                            <div className="w-full flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                              <div className="flex-1 h-[2px] bg-[var(--color-border)] rounded-full" />
                              <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                            </div>
                          </div>
                          <div className="text-left min-w-[64px]">
                            <div className="text-base font-bold text-[var(--color-text-primary)]">{fmt(seg.arrivalTime)}</div>
                            <div className="text-[11px] text-[var(--color-text-secondary)] font-semibold">{seg.arrivalLocation}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border)]">
                          <span className="text-xs text-[var(--color-text-tertiary)]">Giá 1 vé</span>
                          <span className="text-sm font-black text-primary-500">{formatCurrencyVnd(seg.price)}</span>
                        </div>

                        <div className={`flex items-center justify-between p-2.5 rounded-xl border ${rule.free ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-[var(--color-border)] bg-[var(--color-bg-card)]'}`}>
                          <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-primary)]"><Shield className="w-3.5 h-3.5" /> Hủy chuyến</span>
                          <span className={`text-[11px] font-semibold ${rule.free ? 'text-emerald-500' : 'text-[var(--color-text-secondary)]'}`}>{rule.label}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-card)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[var(--color-text-tertiary)]">
                  Tổng tiền{booking.passengers > 1 ? ` · ${booking.passengers} hành khách` : ''}
                </div>
                <div className="text-xl font-black text-primary-500">{formatCurrencyVnd(booking.totalPrice)}</div>
              </div>
              <button onClick={onClose}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-sm hover:shadow-lg hover:shadow-primary-500/20 transition-all"
              >Tiếp tục</button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
