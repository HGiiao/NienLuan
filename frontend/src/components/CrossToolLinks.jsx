import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart4, Route as RouteIcon } from 'lucide-react'
import { saveLastSearch } from '../utils/searchHistory'

// Nút chuyển nhanh sang /compare và /optimal-route mang theo tham số tra cứu
// hiện tại — khách không phải nhập lại điểm đi/đến/ngày ở trang đích
export default function CrossToolLinks({ query }) {
  const navigate = useNavigate()
  if (!query?.from || !query?.to) return null

  const buildParams = () => {
    saveLastSearch(query)
    const params = new URLSearchParams({
      from: query.from, to: query.to, date: query.date || '',
      tripType: query.tripType || 'one-way',
    })
    if (query.tripType === 'round-trip' && query.returnDate) params.set('returnDate', query.returnDate)
    return params.toString()
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      <span className="text-xs text-[var(--color-text-tertiary)]">Mẹo:</span>
      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={() => navigate(`/compare?${buildParams()}`)}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-primary-500/40 hover:text-primary-400 hover:bg-primary-500/5 transition-all">
        <BarChart4 className="w-3.5 h-3.5" />
        So sánh cả 3 phương tiện
      </motion.button>
      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={() => navigate(`/optimal-route?${buildParams()}`)}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-primary-500/40 hover:text-primary-400 hover:bg-primary-500/5 transition-all">
        <RouteIcon className="w-3.5 h-3.5" />
        Tìm lộ trình tối ưu
      </motion.button>
    </div>
  )
}
