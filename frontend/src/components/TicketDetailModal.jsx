import { motion, AnimatePresence } from 'framer-motion'
import { X, Plane, Train, Bus, Clock, Luggage, Utensils, Sofa, Ban, Shield, Star, Users, Wifi, Wind, Tv, Coffee, BatteryCharging } from 'lucide-react'
import { formatCurrencyVnd } from '../utils/formatters'

const cityNames = {
  HAN: 'Hà Nội', SGN: 'TP. Hồ Chí Minh', DAD: 'Đà Nẵng',
  CXR: 'Nha Trang', PQC: 'Phú Quốc', HUI: 'Huế',
  HPH: 'Hải Phòng', VII: 'Vinh', VCA: 'Cần Thơ',
  UIH: 'Quy Nhơn', QNG: 'Quảng Ngãi',
}

const seatClassMap = {
  Economy: { label: 'Phổ thông', pitch: '76cm', recline: '100°', seats: '3-3', color: 'text-[var(--color-text-tertiary)] bg-[var(--color-border)]/30 border-[var(--color-border)]' },
  'Premium Economy': { label: 'Phổ thông đặc biệt', pitch: '96cm', recline: '120°', seats: '2-4-2', color: 'text-primary-500 bg-primary-500/10 border-primary-500/20' },
  Business: { label: 'Thương gia', pitch: '152cm', recline: '180° (nằm phẳng)', seats: '2-2-2', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
}

function isPremium(seatClass) {
  return seatClass === 'PremiumEconomy' || seatClass === 'Premium Economy'
}

function getFlightClass(price, seatClass) {
  if (seatClass && seatClassMap[seatClass]) return seatClassMap[seatClass]
  if (price >= 2500000) return seatClassMap.Business
  if (price >= 1200000) return seatClassMap['Premium Economy']
  return seatClassMap.Economy
}

function getBaggage(price, airlineCode, seatClass) {
  if (seatClass === 'Business') return { cabin: '2 kiện x 7kg', checked: '2 kiện x 32kg', priority: true }
  if (isPremium(seatClass)) return { cabin: '1 kiện x 7kg', checked: '2 kiện x 23kg', priority: true }
  if (price >= 2500000) return { cabin: '1 kiện x 7kg', checked: '2 kiện x 32kg', priority: true }
  if (price >= 1200000) return { cabin: '1 kiện x 7kg', checked: '2 kiện x 23kg', priority: true }
  if (airlineCode === 'VJ' || airlineCode === 'BL') return { cabin: '1 kiện x 7kg', checked: 'Không bao gồm', priority: false }
  return { cabin: '1 kiện x 7kg', checked: '1 kiện x 23kg', priority: false }
}

function getMeals(price, airlineCode, seatClass) {
  if (seatClass === 'Business') return 'Suất ăn đặc biệt + rượu vang + đồ uống không giới hạn'
  if (isPremium(seatClass)) return 'Suất ăn nóng cao cấp + đồ uống'
  if (airlineCode === 'VN' || airlineCode === 'QH') return price >= 1200000 ? 'Suất ăn nóng + đồ uống' : 'Nước uống + bánh nhẹ'
  if (price >= 2500000) return 'Suất ăn đặc biệt + rượu vang + đồ uống không giới hạn'
  if (price >= 1200000) return 'Suất ăn nhẹ + nước uống'
  return 'Nước uống (mua thêm suất ăn)'
}

function getFareRules(price, seatClass) {
  if (seatClass === 'Business' || price >= 2500000) return [
    { label: 'Hoàn vé', value: 'Miễn phí hoàn trước giờ khởi hành 24h', free: true },
    { label: 'Đổi ngày', value: 'Miễn phí đổi trước 12h', free: true },
    { label: 'Hủy chuyến', value: 'Hoàn 100% trước 48h', free: true },
  ]
  if (isPremium(seatClass) || price >= 1200000) return [
    { label: 'Hoàn vé', value: 'Phí 20% hoàn trước 24h', free: false },
    { label: 'Đổi ngày', value: 'Phí 10% đổi trước 12h', free: false },
    { label: 'Hủy chuyến', value: 'Hoàn 50% trước 24h', free: false },
  ]
  return [
    { label: 'Hoàn vé', value: 'Không được hoàn', free: false },
    { label: 'Đổi ngày', value: 'Phí 30% đổi trước 6h', free: false },
    { label: 'Hủy chuyến', value: 'Không được hoàn', free: false },
  ]
}

function getTrainClass(train) {
  const cls = (train.coachClass || '').toLowerCase()
  if (cls.includes('sleeper')) return {
    label: cls.includes('soft') ? 'Giường nằm mềm' : 'Giường nằm cứng',
    desc: cls.includes('soft') ? 'Khoang riêng 4 giường, điều hòa, ổ điện' : 'Khoang 6 giường, điều hòa, quạt',
    icon: Sofa,
    features: cls.includes('soft')
      ? ['Đệm êm', 'Rèm che riêng', 'Đèn đọc sách', 'Ổ cắm điện', 'Phục vụ đồ uống']
      : ['Giường nằm', 'Quạt thông gió', 'Đèn ngủ', 'Để hành lý'],
  }
  if (cls.includes('soft seat')) return {
    label: 'Ngồi mềm điều hòa', desc: 'Ghế bọc đệm ngả được, điều hòa, WiFi',
    icon: Sofa,
    features: ['Ghế bọc đệm ngả 150°', 'WiFi miễn phí', 'Điều hòa', 'Hệ thống giải trí'],
  }
  return {
    label: 'Ngồi cứng', desc: 'Ghế ngồi cơ bản, quạt thông gió',
    icon: Sofa,
    features: ['Ghế ngồi', 'Quạt thông gió', 'Để hành lý', 'Quầy hàng thực phẩm'],
  }
}

const airlineAmenities = {
  VN: { wifi: true, power: true, entertainment: true, blanket: true },
  VJ: { wifi: false, power: false, entertainment: false, blanket: false },
  QH: { wifi: true, power: true, entertainment: true, blanket: true },
  BL: { wifi: false, power: false, entertainment: false, blanket: false },
  VU: { wifi: true, power: true, entertainment: false, blanket: true },
}

export default function TicketDetailModal({ item, type, onClose }) {
  const isFlight = type === 'flight'
  const isTrain = type === 'train'
  const isBus = type === 'bus'
  const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })
  const durMs = new Date(item.arrivalTime) - new Date(item.departureTime)
  const hours = Math.floor(durMs / 3600000)
  const mins = Math.floor((durMs % 3600000) / 60000)

  const flightClass = isFlight ? getFlightClass(item.price, item.seatClass) : null
  const baggage = isFlight ? getBaggage(item.price, item.airlineCode, item.seatClass) : null
  const meals = isFlight ? getMeals(item.price, item.airlineCode, item.seatClass) : null
  const fareRules = getFareRules(item.price, item.seatClass)
  const baseAmenties = airlineAmenities[item.airlineCode] || airlineAmenities.VN
  const amenities = isFlight ? (item.seatClass === 'Business' ? { wifi: true, power: true, entertainment: true, blanket: true } : baseAmenties) : null
  const trainClass = isTrain ? getTrainClass(item) : null
  const isSleeper = isTrain && (item.coachClass || '').toLowerCase().includes('sleeper')
  const fromCity = cityNames[item.departureLocation] || item.departureLocation
  const toCity = cityNames[item.arrivalLocation] || item.arrivalLocation
  const headerGradient = isFlight
    ? 'bg-gradient-to-r from-primary-500 to-primary-600'
    : isBus
      ? 'bg-gradient-to-r from-primary-500 to-primary-600'
      : 'bg-gradient-to-r from-primary-500 to-primary-600'
  const accentText = isBus ? 'text-primary-500' : 'text-primary-500'
  const typeIcon = isFlight ? <Plane className="w-5 h-5" /> : isBus ? <Bus className="w-5 h-5" /> : <Train className="w-5 h-5" />
  const typeName = isFlight ? item.airlineName : isBus ? item.busCompany : (item.trainName || item.trainCode)
  const typeCode = isFlight ? (item.flightNumber || `${item.airlineCode}${(item.id % 900) + 100}`) : isBus ? item.busCode : item.trainCode
  const routeLabel = isBus ? 'Đi thẳng' : isFlight ? 'Bay thẳng' : (trainClass?.label || 'Trực tiếp')

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
          <div className={`sticky top-0 z-10 flex items-center justify-between p-4 border-b border-[var(--color-border)] ${headerGradient}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white">
                {typeIcon}
              </div>
              <div>
                <h3 className="text-white font-bold text-base">{typeName}</h3>
                <p className="text-white/70 text-xs">{typeCode}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Route Timeline */}
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-2">{fmtDate(item.departureTime)}</p>
              <div className="flex items-center gap-3">
                <div className="text-right min-w-[80px]">
                  <div className="text-xl font-bold text-[var(--color-text-primary)]">{fmt(item.departureTime)}</div>
                  <div className="text-xs text-[var(--color-text-secondary)] font-semibold">{item.departureLocation}</div>
                  <div className="text-[10px] text-[var(--color-text-tertiary)]">{fromCity}</div>
                </div>
                <div className="flex-1 flex flex-col items-center px-2">
                  <div className="text-[11px] text-[var(--color-text-tertiary)] font-medium">{hours}h{mins}m</div>
                  <div className="w-full flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary-500 shrink-0" />
                    <div className="flex-1 h-[2px] bg-gradient-to-r from-primary-500 via-primary-400 to-primary-500 rounded-full" />
                    <div className="w-2.5 h-2.5 rounded-full bg-primary-500 shrink-0" />
                  </div>
                  <div className={`text-[10px] font-semibold ${accentText}`}>{routeLabel}</div>
                </div>
                <div className="text-left min-w-[80px]">
                  <div className="text-xl font-bold text-[var(--color-text-primary)]">{fmt(item.arrivalTime)}</div>
                  <div className="text-xs text-[var(--color-text-secondary)] font-semibold">{item.arrivalLocation}</div>
                  <div className="text-[10px] text-[var(--color-text-tertiary)]">{toCity}</div>
                </div>
              </div>
            </div>

            <div className="h-px bg-[var(--color-border)]" />

            {/* Price */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">Giá vé</span>
              <div className="text-right">
                <div className={`text-2xl font-black ${accentText}`}>{formatCurrencyVnd(item.price)}</div>
                <div className="text-[11px] text-[var(--color-text-tertiary)]">Đã bao gồm thuế, phí</div>
              </div>
            </div>

            <div className="h-px bg-[var(--color-border)]" />

            {/* Flight Details */}
            {isFlight && (
              <>
                {/* Hạng vé */}
                <div>
                  <h4 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">Hạng vé & Ghế</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`flex flex-col gap-1.5 p-3 rounded-xl border ${flightClass.color}`}>
                      <Sofa className="w-4 h-4" />
                      <span className="text-sm font-bold">{flightClass.label}</span>
                      <span className="text-[11px] text-[var(--color-text-tertiary)]">Ghế {flightClass.seats}</span>
                    </div>
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
                      <Users className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">{flightClass.pitch}</span>
                      <span className="text-[11px] text-[var(--color-text-tertiary)]">Khoảng cách ghế</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-[var(--color-text-tertiary)]">
                    <Ban className="w-3.5 h-3.5" />
                    Không hút thuốc trên toàn bộ chuyến bay
                  </div>
                </div>

                <div className="h-px bg-[var(--color-border)]" />

                {/* Hành lý */}
                <div>
                  <h4 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Luggage className="w-3.5 h-3.5" /> Hành lý
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                      <span className="text-sm text-[var(--color-text-primary)]">Xách tay</span>
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">{baggage.cabin}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                      <span className="text-sm text-[var(--color-text-primary)]">Ký gửi</span>
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">{baggage.checked}</span>
                    </div>
                    {baggage.priority && (
                      <div className="flex items-center gap-2 text-xs text-primary-500 bg-primary-500/5 px-3 py-2 rounded-xl">
                        <Star className="w-3.5 h-3.5" /> Ưu tiên lên máy bay
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px bg-[var(--color-border)]" />

                {/* Dịch vụ trên máy bay */}
                <div>
                  <h4 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">Dịch vụ trên máy bay</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`flex items-center gap-2 p-3 rounded-xl border ${amenities.wifi ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-[var(--color-border)] bg-[var(--color-bg)] opacity-40'}`}>
                      <Wifi className={`w-4 h-4 ${amenities.wifi ? 'text-emerald-500' : 'text-[var(--color-text-tertiary)]'}`} />
                      <div><div className="text-xs font-semibold text-[var(--color-text-primary)]">WiFi</div><div className="text-[10px] text-[var(--color-text-tertiary)]">{amenities.wifi ? 'Có' : 'Không'}</div></div>
                    </div>
                    <div className={`flex items-center gap-2 p-3 rounded-xl border ${amenities.power ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-[var(--color-border)] bg-[var(--color-bg)] opacity-40'}`}>
                      <BatteryCharging className={`w-4 h-4 ${amenities.power ? 'text-emerald-500' : 'text-[var(--color-text-tertiary)]'}`} />
                      <div><div className="text-xs font-semibold text-[var(--color-text-primary)]">Cổng sạc</div><div className="text-[10px] text-[var(--color-text-tertiary)]">{amenities.power ? 'Có' : 'Không'}</div></div>
                    </div>
                    <div className={`flex items-center gap-2 p-3 rounded-xl border ${amenities.entertainment ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-[var(--color-border)] bg-[var(--color-bg)] opacity-40'}`}>
                      <Tv className={`w-4 h-4 ${amenities.entertainment ? 'text-emerald-500' : 'text-[var(--color-text-tertiary)]'}`} />
                      <div><div className="text-xs font-semibold text-[var(--color-text-primary)]">Giải trí</div><div className="text-[10px] text-[var(--color-text-tertiary)]">{amenities.entertainment ? 'Màn hình cá nhân' : 'Không'}</div></div>
                    </div>
                    <div className={`flex items-center gap-2 p-3 rounded-xl border ${amenities.blanket ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-[var(--color-border)] bg-[var(--color-bg)] opacity-40'}`}>
                      <Wind className={`w-4 h-4 ${amenities.blanket ? 'text-emerald-500' : 'text-[var(--color-text-tertiary)]'}`} />
                      <div><div className="text-xs font-semibold text-[var(--color-text-primary)]">Chăn/Gối</div><div className="text-[10px] text-[var(--color-text-tertiary)]">{amenities.blanket ? 'Có' : 'Không'}</div></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 mt-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                    <Utensils className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                    <div>
                      <div className="text-xs font-semibold text-[var(--color-text-primary)]">Suất ăn</div>
                      <div className="text-[10px] text-[var(--color-text-tertiary)]">{meals}</div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-[var(--color-border)]" />
              </>
            )}

            {/* Train Details */}
            {isTrain && (
              <>
                <div>
                  <h4 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">Hạng toa & Tiện nghi</h4>
                  <div className="p-4 rounded-xl border border-primary-500/20 bg-primary-500/5">
                    <div className="text-sm font-bold text-[var(--color-text-primary)]">{trainClass.label}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)] mt-1">{trainClass.desc}</div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {trainClass.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-[var(--color-text-primary)]">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />{f}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-[var(--color-border)]" />

                <div>
                  <h4 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">Dịch vụ trên tàu</h4>
                  <div className={`grid ${isSleeper ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                    {isSleeper && (
                      <div className="flex items-center gap-2 p-3 rounded-xl border border-primary-500/20 bg-primary-500/5">
                        <Coffee className="w-4 h-4 text-primary-500" />
                        <div><div className="text-xs font-semibold text-[var(--color-text-primary)]">Phục vụ</div><div className="text-[10px] text-[var(--color-text-tertiary)]">Tận khoang</div></div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
                      <Wifi className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                      <div><div className="text-xs font-semibold text-[var(--color-text-primary)]">WiFi</div><div className="text-[10px] text-[var(--color-text-tertiary)]">{isSleeper ? 'Miễn phí' : 'Trả phí'}</div></div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
                      <BatteryCharging className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                      <div><div className="text-xs font-semibold text-[var(--color-text-primary)]">Ổ cắm</div><div className="text-[10px] text-[var(--color-text-tertiary)]">{isSleeper ? 'Mỗi khoang' : 'Khu vực chung'}</div></div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
                      <Wind className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                      <div><div className="text-xs font-semibold text-[var(--color-text-primary)]">Điều hòa</div><div className="text-[10px] text-[var(--color-text-tertiary)]">{isSleeper ? 'Điều chỉnh riêng' : 'Trung tâm'}</div></div>
                    </div>
                    {!isSleeper && (
                      <div className="flex items-center gap-2 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
                        <Coffee className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                        <div><div className="text-xs font-semibold text-[var(--color-text-primary)]">Đồ uống</div><div className="text-[10px] text-[var(--color-text-tertiary)]">Phục vụ trên tàu</div></div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px bg-[var(--color-border)]" />
              </>
            )}

            {/* Bus Details */}
            {isBus && (
              <>
                <div>
                  <h4 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">Hạng xe & Tiện nghi</h4>
                  <div className="p-4 rounded-xl border border-primary-500/20 bg-primary-500/5">
                    <div className="text-sm font-bold text-[var(--color-text-primary)]">{item.coachClass || 'Ghế ngồi'}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)] mt-1">Nhà xe {item.busCompany} · Điều hòa, màn hình giải trí</div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {['Ghế ngả', 'Điều hòa', 'WiFi', 'Nước uống'].map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-[var(--color-text-primary)]">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />{f}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-[var(--color-border)]" />

                <div>
                  <h4 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">Đón & trả khách</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                      <span className="text-sm text-[var(--color-text-primary)]">Đón tại</span>
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">{item.pickupPoint || 'Bến xe'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                      <span className="text-sm text-[var(--color-text-primary)]">Trả tại</span>
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]">{item.dropoffPoint || 'Bến xe'}</span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-[var(--color-border)]" />
              </>
            )}

            {/* Fare Rules */}
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" /> Chính sách hoàn & đổi
              </h4>
              <div className="space-y-2">
                {fareRules.map((rule, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${
                    rule.free ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-[var(--color-border)] bg-[var(--color-bg)]'
                  }`}>
                    <span className="text-sm text-[var(--color-text-primary)]">{rule.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${rule.free ? 'text-emerald-500' : 'text-[var(--color-text-secondary)]'}`}>{rule.value}</span>
                      {rule.free && <Shield className="w-3.5 h-3.5 text-emerald-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-card)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[var(--color-text-tertiary)]">Tổng tiền</div>
                <div className="text-xl font-black text-primary-500">{formatCurrencyVnd(item.price)}</div>
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