import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clock, TrendingDown, Zap, AlertTriangle, BarChart4, Activity, Sparkles, Bell, BellOff, Star, Crown, Gem } from 'lucide-react'
import { formatCurrencyVnd, formatDurationMs } from '../utils/formatters'

const airlineConfig = {
  VN: { name: 'Vietnam Airlines' },
  VJ: { name: 'VietJet Air' },
  QH: { name: 'Bamboo Airways' },
  BL: { name: 'Pacific Airlines' },
  VU: { name: 'Vietravel Airlines' },
}

const seatClassConfig = {
  Business: { label: 'Business', icon: Crown, barH: 'h-1.5',
    bar: 'bg-accent-500', text: 'text-accent-500', badge: 'bg-accent-500/15 text-accent-500 border-accent-500/30',
    gradient: 'from-accent-500 to-accent-600', dot: 'bg-accent-500', line: 'bg-accent-500/30' },
  'Premium Economy': { label: 'Premium Eco', icon: Gem, barH: 'h-1',
    bar: 'bg-accent-500', text: 'text-accent-500', badge: 'bg-accent-500/10 text-accent-500 border-accent-500/20',
    gradient: 'from-accent-500 to-accent-600', dot: 'bg-accent-500', line: 'bg-accent-500/30' },
  Economy: { label: 'Economy', icon: null, barH: 'h-0.5',
    bar: 'bg-accent-500', text: 'text-accent-500', badge: 'bg-transparent text-accent-500 border-accent-500/20',
    gradient: 'from-accent-500 to-accent-600', dot: 'bg-accent-500', line: 'bg-accent-500/30' },
  PremiumEconomy: { label: 'Premium Eco', icon: Gem, barH: 'h-1',
    bar: 'bg-accent-500', text: 'text-accent-500', badge: 'bg-accent-500/10 text-accent-500 border-accent-500/20',
    gradient: 'from-accent-500 to-accent-600', dot: 'bg-accent-500', line: 'bg-accent-500/30' },
}

const cityNames = {
  HAN: 'Hà Nội', SGN: 'TP. Hồ Chí Minh', DAD: 'Đà Nẵng',
  CXR: 'Nha Trang', PQC: 'Phú Quốc', HUI: 'Huế',
  HPH: 'Hải Phòng', VII: 'Vinh', VCA: 'Cần Thơ',
  UIH: 'Quy Nhơn', QNG: 'Quảng Ngãi',
}

function AirlineLogo({ code, gradient }) {
  return (
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm shrink-0`}>
      <span className="text-white text-sm font-black tracking-tight">{code}</span>
    </div>
  )
}

function formatDuration(dep, arr) { return formatDurationMs(new Date(arr) - new Date(dep)) }
function fmtTime(d) { return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) }

export default function FlightCard({ flight, onBook, onWatch, onDetail, badge, index = 0, prediction, rating, watched = false, id, highlight = false }) {
  const cfg = airlineConfig[flight.airlineCode] || airlineConfig.VN
  const seatCfg = seatClassConfig[flight.seatClass] || seatClassConfig.Economy
  const showBadge = badge || (index === 0 ? 'Rẻ nhất' : null)
  const flightNumber = `${flight.airlineCode}${(flight.id % 900) + 100}`
  const cityFrom = cityNames[flight.departureLocation] || flight.departureLocation
  const cityTo = cityNames[flight.arrivalLocation] || flight.arrivalLocation
  const seatsLeft = flight.seats
  const isLowStock = seatsLeft <= 5
  const hasDeparted = new Date(flight.departureTime) <= new Date()
  const { avgPrice, vsAverage, trend } = useMemo(() => {
    const seed = (flight.id * 9301 + 49297) % 233280
    const r = seed / 233280
    const avg = flight.price * (1 + (r * 0.3 - 0.15))
    const vs = ((flight.price - avg) / avg * 100)
    return { avgPrice: avg, vsAverage: vs, trend: vs < -5 ? 'down' : vs > 5 ? 'up' : 'stable' }
  }, [flight.id, flight.price])
  const pred = prediction

  return (
    <motion.div id={id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.35, delay: index * 0.04 } }} whileHover={{ y: -2 }}
      className={`group bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] shadow-sm hover:shadow-lg hover:border-[var(--color-border-hover)] transition-all duration-300 overflow-hidden ${highlight ? 'ring-2 ring-primary-500' : ''}`}
    >
      <div className="relative p-5 flex flex-col gap-4">
        {/* Desktop */}
        <div className="hidden md:flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AirlineLogo code={flight.airlineCode} gradient={seatCfg.gradient} />
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold text-[var(--color-text-primary)] leading-tight">{cfg.name}</div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${seatCfg.badge}`}>
                    {seatCfg.icon && <seatCfg.icon className="w-3 h-3" />}{seatCfg.label}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--color-text-tertiary)] font-medium">{flightNumber}</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-[26px] font-black ${seatCfg.text} leading-none tracking-tight`}>{formatCurrencyVnd(flight.price)}</div>
              <div className="text-[11px] text-[var(--color-text-tertiary)] font-medium">Đã bao gồm thuế</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right min-w-[72px]">
              <div className="text-[22px] font-bold text-[var(--color-text-primary)] leading-none tracking-tight">{fmtTime(flight.departureTime)}</div>
              <div className="text-[13px] font-semibold text-[var(--color-text-secondary)] mt-0.5">{flight.departureLocation}</div>
              <div className="text-[11px] text-[var(--color-text-tertiary)]">{cityFrom}</div>
            </div>
            <div className="flex-1 flex flex-col items-center px-2">
              <div className="text-[11px] font-medium text-[var(--color-text-tertiary)] mb-2">{formatDuration(flight.departureTime, flight.arrivalTime)}</div>
              <div className="w-full flex items-center gap-1">
                <div className={`w-2.5 h-2.5 rounded-full ${seatCfg.dot} shrink-0 ring-2 ring-[var(--color-bg-card)]`} />
                <div className="flex-1 h-[2px] relative">
                  <div className={`absolute inset-0 ${seatCfg.line} rounded-full`} />
                  <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                    className={`absolute inset-y-0 left-0 w-1/2 ${seatCfg.bar} rounded-full origin-left`} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${seatCfg.badge} shadow-sm`}>
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                    </div>
                  </div>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${seatCfg.dot} shrink-0 ring-2 ring-[var(--color-bg-card)]`} />
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${seatCfg.badge}`}>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                  Bay thẳng
                </span>
              </div>
            </div>
            <div className="text-left min-w-[72px]">
              <div className="text-[22px] font-bold text-[var(--color-text-primary)] leading-none tracking-tight">{fmtTime(flight.arrivalTime)}</div>
              <div className="text-[13px] font-semibold text-[var(--color-text-secondary)] mt-0.5">{flight.arrivalLocation}</div>
              <div className="text-[11px] text-[var(--color-text-tertiary)]">{cityTo}</div>
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
              {showBadge && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${seatCfg.badge}`}>
                  {showBadge === 'Rẻ nhất' ? <TrendingDown className="w-3 h-3" /> : <Zap className="w-3 h-3" />}{showBadge}
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
                  <AlertTriangle className="w-3 h-3" />Sắp hết vé
                </span>
              ) : (
                <span className="text-[11px] text-[var(--color-text-tertiary)] flex items-center gap-1">
                  <Activity className="w-3 h-3" />Còn <span className="font-semibold text-[var(--color-text-primary)]">{seatsLeft}</span> chỗ
                </span>
              )}
              {rating && (
                <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-tertiary)]">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="font-semibold text-[var(--color-text-primary)]">{rating.averageRating}</span>
                  <span>({rating.totalReviews})</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <span className="text-[10px] text-[var(--color-text-tertiary)] flex items-center gap-1">
                <Clock className="w-3 h-3" />{new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
              {onWatch && (
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={e => { e.stopPropagation(); onWatch?.(flight) }}
                  className={`shrink-0 whitespace-nowrap py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${watched ? 'bg-accent-500/10 text-accent-500 border border-accent-500/30' : 'border border-accent-500/30 text-accent-500 hover:bg-accent-500/5'}`}
                >
                  {watched ? <BellOff className="w-3.5 h-3.5 inline mr-1" /> : <Bell className="w-3.5 h-3.5 inline mr-1" />}
                  {watched ? 'Đang theo dõi' : 'Theo dõi giá'}
                </motion.button>
              )}
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={e => { e.stopPropagation(); onDetail?.(flight) }}
                className="shrink-0 whitespace-nowrap py-2.5 px-3 rounded-xl text-xs font-bold transition-all border border-accent-500/30 text-accent-500 hover:bg-accent-500/5"
              >Xem chi tiết</motion.button>
              <motion.button whileHover={hasDeparted ? undefined : { scale: 1.03 }} whileTap={hasDeparted ? undefined : { scale: 0.97 }}
                disabled={hasDeparted}
                onClick={e => { if (hasDeparted) return; e.stopPropagation(); onBook?.(flight) }}
                className={hasDeparted
                  ? 'shrink-0 whitespace-nowrap py-2.5 px-5 rounded-xl text-sm font-bold bg-[var(--color-border)]/30 text-[var(--color-text-tertiary)] cursor-not-allowed'
                  : `bg-gradient-to-r ${seatCfg.gradient} text-white py-2.5 px-5 rounded-xl text-sm font-bold hover:shadow-lg transition-all shadow-md active:shadow-sm`}
              >{hasDeparted ? 'Đã khởi hành' : 'Đặt vé'}</motion.button>
            </div>
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AirlineLogo code={flight.airlineCode} gradient={seatCfg.gradient} />
              <div>
                <div className="flex items-center gap-1.5">
                  <div className="text-sm font-bold text-[var(--color-text-primary)]">{cfg.name}</div>
                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${seatCfg.badge}`}>
                    {seatCfg.icon && <seatCfg.icon className="w-2.5 h-2.5" />}{seatCfg.label}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--color-text-tertiary)]">{flightNumber}</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xl font-black ${seatCfg.text}`}>{formatCurrencyVnd(flight.price)}</div>
              <div className="text-[10px] text-[var(--color-text-tertiary)]">Đã bao gồm thuế</div>
            </div>
          </div>

          <div className="flex items-center gap-2 py-1">
            <div className="flex-1">
              <div className="text-lg font-bold text-[var(--color-text-primary)]">{fmtTime(flight.departureTime)}</div>
              <div className="text-xs font-semibold text-[var(--color-text-secondary)]">{flight.departureLocation}</div>
            </div>
            <div className="flex flex-col items-center px-1">
              <div className="text-[10px] text-[var(--color-text-tertiary)] font-medium whitespace-nowrap">{formatDuration(flight.departureTime, flight.arrivalTime)}</div>
              <div className="flex items-center gap-1 w-full">
                <div className={`w-2 h-2 rounded-full ${seatCfg.dot}`} />
                <div className={`flex-1 h-[2px] ${seatCfg.line}`}>
                  <div className={`h-full w-1/2 ${seatCfg.bar} rounded-full`} />
                </div>
                <div className={`w-2 h-2 rounded-full ${seatCfg.dot}`} />
              </div>
              <span className={`text-[10px] font-semibold ${seatCfg.text} mt-0.5`}>Bay thẳng</span>
            </div>
            <div className="flex-1 text-right">
              <div className="text-lg font-bold text-[var(--color-text-primary)]">{fmtTime(flight.arrivalTime)}</div>
              <div className="text-xs font-semibold text-[var(--color-text-secondary)]">{flight.arrivalLocation}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border)]">
            <div className="flex flex-wrap items-center gap-1.5">
              {pred?.recommendation === 'buy_now' && (
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Sparkles className="w-3 h-3 inline mr-0.5" />Nên mua ngay
                </span>
              )}
              {pred?.recommendation === 'wait' && (
                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <Clock className="w-3 h-3 inline mr-0.5" />Chờ thêm
                </span>
              )}
              {showBadge && (
                <span className={`text-[10px] font-bold ${seatCfg.badge} px-2 py-0.5 rounded-full`}>
                  {showBadge === 'Rẻ nhất' ? '↓' : '⚡'} {showBadge}
                </span>
              )}
              {isLowStock ? (
                <span className="text-[10px] font-semibold text-[var(--color-danger)] bg-[var(--color-danger)]/10 px-2 py-0.5 rounded-full">Sắp hết vé</span>
              ) : (
                <span className="text-[11px] text-[var(--color-text-tertiary)]">{seatsLeft} chỗ</span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              {onWatch && (
                <button onClick={e => { e.stopPropagation(); onWatch?.(flight) }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${watched ? 'bg-accent-500/10 text-accent-500 border border-accent-500/30' : 'border border-accent-500/30 text-accent-500 hover:bg-accent-500/5'}`}
                >{watched ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}</button>
              )}
              <button onClick={e => { e.stopPropagation(); onDetail?.(flight) }}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-accent-500/30 text-accent-500 hover:bg-accent-500/5 transition-all"
              >Chi tiết</button>
              <button disabled={hasDeparted} onClick={e => { if (hasDeparted) return; e.stopPropagation(); onBook?.(flight) }}
                className={hasDeparted ? 'px-5 py-2 rounded-xl text-sm font-bold bg-[var(--color-border)]/30 text-[var(--color-text-tertiary)] cursor-not-allowed' : `bg-gradient-to-r ${seatCfg.gradient} text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md active:scale-[0.97]`}
              >{hasDeparted ? 'Đã khởi hành' : 'Đặt vé'}</button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)] pt-1 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-2">
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
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />{new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
