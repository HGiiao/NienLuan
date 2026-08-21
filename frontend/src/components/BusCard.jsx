import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Bus, Clock, Activity, AlertTriangle, Sparkles, Bell, BellOff, Star } from 'lucide-react'
import { formatCurrencyVnd } from '../utils/formatters'
import CarbonBadge from './CarbonBadge'

const coachClassConfig = {
  'Giường nằm': { label: 'Giường nằm', icon: null, badge: 'bg-primary-500/15 text-primary-500 border-primary-500/30' },
  'Ghế ngồi': { label: 'Ghế ngồi', icon: null, badge: 'bg-primary-500/10 text-primary-500 border-primary-500/20' },
  'Limousine': { label: 'Limousine', icon: null, badge: 'bg-primary-500/15 text-primary-500 border-primary-500/30' },
  'VIP': { label: 'VIP', icon: null, badge: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
}
const defaultSeatCfg = { label: 'Ghế ngồi', icon: null, badge: 'bg-primary-500/10 text-primary-500 border-primary-500/20' }

export default function BusCard({ bus, onBook, onWatch, onDetail, badge, index = 0, prediction, rating, watched = false }) {
  const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  const dur = new Date(bus.arrivalTime) - new Date(bus.departureTime)
  const h = Math.floor(dur / 3600000)
  const m = Math.floor((dur % 3600000) / 60000)
  const seatsLeft = bus.seats
  const isLowStock = seatsLeft <= 5
  const hasDeparted = new Date(bus.departureTime) <= new Date()
  const { avgPrice, vsAverage, trend } = useMemo(() => {
    const seed = (bus.id * 9301 + 49297) % 233280
    const r = seed / 233280
    const avg = bus.price * (1 + (r * 0.25 - 0.125))
    const vs = ((bus.price - avg) / avg * 100)
    return { avgPrice: avg, vsAverage: vs, trend: vs < -5 ? 'down' : vs > 5 ? 'up' : 'stable' }
  }, [bus.id, bus.price])
  const pred = prediction
  const seatCfg = coachClassConfig[bus.coachClass] || defaultSeatCfg

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.35, delay: index * 0.04 } }} whileHover={{ y: -2 }}
      className="group bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] shadow-sm hover:shadow-lg hover:border-[var(--color-border-hover)] transition-all duration-300"
    >
      <div className="relative p-5 flex flex-col gap-4">
        {/* Desktop — Clean Compact Card */}
        <div className="hidden md:flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-sm">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--color-text-primary)]">{bus.busCode}</div>
                <div className="text-[11px] text-[var(--color-text-tertiary)]">{bus.busCompany}</div>
              </div>
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${seatCfg.badge}`}>
                {seatCfg.label}
              </span>
            </div>
            <div className="text-right">
              <div className="text-[26px] font-black text-primary-500 leading-none tracking-tight">{formatCurrencyVnd(bus.price)}</div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] font-medium">Đã bao gồm phí</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right min-w-[72px]">
              <div className="text-[22px] font-bold text-[var(--color-text-primary)] leading-none tracking-tight">{fmt(bus.departureTime)}</div>
              <div className="text-[13px] font-semibold text-[var(--color-text-secondary)] mt-0.5">{bus.departureLocation}</div>
              <div className="text-[11px] text-[var(--color-text-tertiary)]">Bến đi</div>
            </div>
            <div className="flex-1 flex flex-col items-center px-2">
              <div className="text-[11px] font-medium text-[var(--color-text-tertiary)] mb-2">{h} giờ {m} phút</div>
              <div className="w-full flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-primary-500 shrink-0 ring-2 ring-[var(--color-bg-card)]" />
                <div className="flex-1 h-[2px] bg-[var(--color-border)] relative">
                  <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                    className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full origin-left" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center bg-primary-500/15 border border-primary-500/20 shadow-sm">
                      <Bus className="w-2.5 h-2.5 text-primary-500" />
                    </div>
                  </div>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-primary-500 shrink-0 ring-2 ring-[var(--color-bg-card)]" />
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-full border border-primary-500/20">
                  <Bus className="w-3 h-3" />{bus.busCompany}
                </span>
              </div>
            </div>
            <div className="text-left min-w-[72px]">
              <div className="text-[22px] font-bold text-[var(--color-text-primary)] leading-none tracking-tight">{fmt(bus.arrivalTime)}</div>
              <div className="text-[13px] font-semibold text-[var(--color-text-secondary)] mt-0.5">{bus.arrivalLocation}</div>
              <div className="text-[11px] text-[var(--color-text-tertiary)]">Bến đến</div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border)]">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                trend === 'down' ? 'text-[var(--color-success)] bg-[var(--color-success)]/10' :
                trend === 'up' ? 'text-[var(--color-danger)] bg-[var(--color-danger)]/10' :
                'text-[var(--color-text-tertiary)] bg-[var(--color-border)]/30'
              }`}>
                {trend === 'down' ? '↓' : trend === 'up' ? '↑' : '→'}{Math.abs(vsAverage).toFixed(0)}% TB
              </span>
              {badge && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  <Sparkles className="w-3 h-3" />{badge}
                </span>
              )}
              {pred?.recommendation === 'buy_now' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  <Sparkles className="w-3 h-3" />Nên mua ngay
                </span>
              )}
              {pred?.recommendation === 'wait' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/20">
                  <Clock className="w-3 h-3" />Chờ thêm
                </span>
              )}
              {isLowStock ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-danger)] bg-[var(--color-danger)]/10 px-2.5 py-0.5 rounded-full border border-[var(--color-danger)]/20">
                  <AlertTriangle className="w-3 h-3" />Sắp hết chỗ
                </span>
              ) : (
                <span className="text-[11px] text-[var(--color-text-tertiary)] flex items-center gap-1">
                  <Activity className="w-3 h-3" />Còn <span className="font-semibold text-[var(--color-text-primary)]">{seatsLeft}</span> chỗ
                </span>
              )}
              <CarbonBadge item={bus} type="bus" />
              {rating && (
                <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-tertiary)]">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="font-semibold text-[var(--color-text-primary)]">{rating.averageRating}</span>
                  <span>({rating.totalReviews})</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {onWatch && (
                <motion.button whileHover={hasDeparted ? undefined : { scale: 1.03 }} whileTap={hasDeparted ? undefined : { scale: 0.97 }}
                  disabled={hasDeparted}
                  title={hasDeparted ? 'Chuyến đã khởi hành — không thể theo dõi giá' : undefined}
                  onClick={() => { if (hasDeparted) return; onWatch?.(bus) }}
                  className={hasDeparted
                    ? 'shrink-0 whitespace-nowrap py-2.5 px-3 rounded-xl text-xs font-bold bg-[var(--color-border)]/30 text-[var(--color-text-tertiary)] cursor-not-allowed'
                    : `shrink-0 whitespace-nowrap py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${watched ? 'bg-accent-500/10 text-accent-500 border border-accent-500/30' : 'border border-primary-500/30 text-primary-500 hover:bg-primary-500/5'}`}
                >
                  {watched ? <BellOff className="w-3.5 h-3.5 inline mr-1" /> : <Bell className="w-3.5 h-3.5 inline mr-1" />}
                  {watched ? 'Đang theo dõi' : 'Theo dõi giá'}
                </motion.button>
              )}
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => onDetail?.(bus)}
                className="shrink-0 whitespace-nowrap py-2.5 px-3 rounded-xl text-xs font-bold transition-all border border-primary-500/30 text-primary-500 hover:bg-primary-500/5"
              >Xem chi tiết</motion.button>
              <motion.button whileHover={hasDeparted ? undefined : { scale: 1.03 }} whileTap={hasDeparted ? undefined : { scale: 0.97 }}
                disabled={hasDeparted}
                onClick={() => { if (hasDeparted) return; onBook?.(bus) }}
                className={hasDeparted
                  ? 'shrink-0 whitespace-nowrap py-2.5 px-5 rounded-xl text-sm font-bold bg-[var(--color-border)]/30 text-[var(--color-text-tertiary)] cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white py-2.5 px-5 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md active:shadow-sm'}
              >{hasDeparted ? 'Đã khởi hành' : 'Đặt vé'}</motion.button>
            </div>
          </div>
        </div>

        <div className="md:hidden p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-sm"><Bus className="w-5 h-5" /></div>
              <div><div className="text-sm font-bold text-[var(--color-text-primary)]">{bus.busCode}</div><div className="text-[11px] text-[var(--color-text-tertiary)]">{bus.busCompany}</div></div>
            </div>
            <div className="text-right"><div className="text-xl font-black text-primary-500">{formatCurrencyVnd(bus.price)}</div><div className="text-[10px] text-[var(--color-text-tertiary)]">Đã bao gồm phí</div></div>
          </div>
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1"><div className="text-lg font-bold text-[var(--color-text-primary)]">{fmt(bus.departureTime)}</div><div className="text-xs font-semibold text-[var(--color-text-secondary)]">{bus.departureLocation}</div></div>
            <div className="flex flex-col items-center px-1">
              <div className="text-[10px] text-[var(--color-text-tertiary)] font-medium whitespace-nowrap">{h} giờ {m} phút</div>
              <div className="flex items-center gap-1 w-full"><div className="w-2 h-2 rounded-full border-2 border-primary-500" /><div className="flex-1 h-[2px] bg-[var(--color-border)]"><div className="h-full w-1/2 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full" /></div><div className="w-2 h-2 rounded-full bg-primary-500" /></div>
            </div>
            <div className="flex-1 text-right"><div className="text-lg font-bold text-[var(--color-text-primary)]">{fmt(bus.arrivalTime)}</div><div className="text-xs font-semibold text-[var(--color-text-secondary)]">{bus.arrivalLocation}</div></div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {pred?.recommendation === 'buy_now' && (
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20"><Sparkles className="w-3 h-3 inline mr-0.5" />Nên mua ngay</span>
              )}
              {pred?.recommendation === 'wait' && (
                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20"><Clock className="w-3 h-3 inline mr-0.5" />Chờ thêm</span>
              )}
              {badge && <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">🏷️ {badge}</span>}
              <CarbonBadge item={bus} type="bus" />
              {isLowStock ? <span className="text-[10px] font-semibold text-[var(--color-danger)] bg-[var(--color-danger)]/10 px-2 py-0.5 rounded-full">Sắp hết chỗ</span> : <span className="text-[11px] text-[var(--color-text-tertiary)]">{seatsLeft} chỗ</span>}
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              {onWatch && (
                <button disabled={hasDeparted} title={hasDeparted ? 'Chuyến đã khởi hành — không thể theo dõi giá' : undefined}
                  onClick={() => { if (hasDeparted) return; onWatch?.(bus) }}
                  className={hasDeparted
                    ? 'px-3 py-2 rounded-xl text-xs font-bold bg-[var(--color-border)]/30 text-[var(--color-text-tertiary)] cursor-not-allowed'
                    : `px-3 py-2 rounded-xl text-xs font-bold transition-all ${watched ? 'bg-accent-500/10 text-accent-500 border border-accent-500/30' : 'border border-primary-500/30 text-primary-500 hover:bg-primary-500/5'}`}
                >{watched ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}</button>
              )}
              <button onClick={() => onDetail?.(bus)} className="px-3 py-2 rounded-xl text-xs font-bold transition-all border border-primary-500/30 text-primary-500 hover:bg-primary-500/5">Chi tiết</button>
              <button disabled={hasDeparted} onClick={() => { if (hasDeparted) return; onBook?.(bus) }} className={hasDeparted ? 'px-5 py-2 rounded-xl text-sm font-bold bg-[var(--color-border)]/30 text-[var(--color-text-tertiary)] cursor-not-allowed' : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md active:scale-[0.97]'}>{hasDeparted ? 'Đã khởi hành' : 'Đặt vé'}</button>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)] pt-1 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" /><span>{seatCfg.label} · {bus.busCompany}</span>
              {pred && pred.confidence > 0.3 && (
                <span className={`flex items-center gap-0.5 ${pred.recommendation === 'buy_now' ? 'text-emerald-500' : 'text-amber-500'}`}>
                  <Sparkles className="w-3 h-3" />
                  {pred.recommendation === 'buy_now' ? 'Nên mua' : 'Chờ'}
                </span>
              )}
            </div>
            <span className={trend === 'down' ? 'text-[var(--color-success)]' : trend === 'up' ? 'text-[var(--color-danger)]' : ''}>
              {trend === 'down' ? '↓' : trend === 'up' ? '↑' : '→'} {Math.abs(vsAverage).toFixed(0)}% so với TB
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
