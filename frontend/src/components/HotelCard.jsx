import { motion } from 'framer-motion'
import { Star, MapPin, Wifi, Waves, Dumbbell, Coffee, Building2 } from 'lucide-react'
import { formatCurrencyVnd } from '../utils/formatters'

const amenityIcons = {
  'WiFi': Wifi, 'Hồ bơi': Waves, 'Gym': Dumbbell, 'Nhà hàng': Coffee,
  'Spa': Waves, 'Bữa sáng': Coffee,
}

export default function HotelCard({ hotel, index = 0, onSelect }) {
  const amenities = hotel.amenities.split(',').map(a => a.trim()).filter(Boolean)

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center shrink-0">
          <Building2 className="w-8 h-8 text-primary-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-[var(--color-text-primary)] truncate">{hotel.name}</h3>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: hotel.starRating }).map((_, i) => (
                <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] mb-2">
            <MapPin className="w-3 h-3" />{hotel.location}
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mb-2">{hotel.description}</p>
          <div className="flex flex-wrap gap-1">
            {amenities.slice(0, 3).map(a => {
              const Icon = amenityIcons[a] || Coffee
              return <span key={a} className="flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)] bg-[var(--color-border)]/30 px-1.5 py-0.5 rounded"><Icon className="w-2.5 h-2.5" />{a}</span>
            })}
            {amenities.length > 3 && <span className="text-[10px] text-[var(--color-text-tertiary)]">+{amenities.length - 3}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-black text-primary-500">{formatCurrencyVnd(hotel.pricePerNight)}</div>
          <div className="text-[10px] text-[var(--color-text-tertiary)]">/đêm</div>
          <button onClick={() => onSelect?.(hotel)}
            className="mt-2 bg-accent-500 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-accent-600 transition-all shadow-md"
          >Đặt ngay</button>
        </div>
      </div>
    </motion.div>
  )
}
