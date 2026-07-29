import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, ChevronLeft, ChevronRight, Plane, Info } from 'lucide-react'
import { getPriceCalendar } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'

const cityNames = {
  HAN: 'Hà Nội', SGN: 'TP. Hồ Chí Minh', DAD: 'Đà Nẵng',
  CXR: 'Nha Trang', PQC: 'Phú Quốc', HUI: 'Huế',
  HPH: 'Hải Phòng', VII: 'Vinh', VCA: 'Cần Thơ',
  UIH: 'Quy Nhơn',
}

function getColor(price, minP, maxP) {
  if (price == null) return 'bg-[var(--color-border)]/20'
  if (maxP === minP) return 'bg-emerald-400/60'
  const ratio = (price - minP) / (maxP - minP)
  if (ratio <= 0.2) return 'bg-emerald-400/70'
  if (ratio <= 0.4) return 'bg-emerald-400/40'
  if (ratio <= 0.6) return 'bg-amber-400/30'
  if (ratio <= 0.8) return 'bg-orange-400/40'
  return 'bg-red-400/50'
}

function getTextColor(price, minP, maxP) {
  if (price == null) return 'text-[var(--color-text-tertiary)]'
  if (maxP === minP) return 'text-emerald-900'
  const ratio = (price - minP) / (maxP - minP)
  if (ratio <= 0.4) return 'text-emerald-900'
  return 'text-red-900'
}

export default function PriceHeatmap({ from, onSelectDate }) {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!from) return
    setLoading(true)
    getPriceCalendar({ from, month, year })
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [from, month, year])

  const daysInMonth = useMemo(() => {
    if (!data) return []
    const start = new Date(data.startDate)
    const end = new Date(data.endDate)
    const days = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push({
        date: d.getDate(),
        dayOfWeek: d.toLocaleDateString('vi-VN', { weekday: 'narrow' }),
        fullDate: d.toISOString().split('T')[0],
      })
    }
    return days
  }, [data])

  const allPrices = useMemo(() => {
    if (!data?.rows) return []
    const prices = []
    data.rows.forEach(row => {
      row.days.forEach(p => { if (p != null) prices.push(p) })
    })
    return prices
  }, [data])

  const minPrice = allPrices.length ? Math.min(...allPrices) : 0
  const maxPrice = allPrices.length ? Math.max(...allPrices) : 0

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  if (!from) return null

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary-500" />
          <h3 className="font-semibold text-[var(--color-text-primary)]">Giá vé theo ngày</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-tertiary)] font-medium">{from}</span>
          <div className="flex items-center gap-1 bg-[var(--color-border)]/30 rounded-lg p-0.5">
            <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-[var(--color-border)]/50 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-[var(--color-text-primary)] min-w-[100px] text-center">
              Tháng {month}/{year}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-[var(--color-border)]/50 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-[var(--color-border)] rounded-lg w-1/3" />
          <div className="h-48 bg-[var(--color-border)] rounded-lg" />
        </div>
      )}

      {!loading && data?.rows && (
        <>
          <div className="flex items-center gap-2 mb-3 text-[11px] text-[var(--color-text-tertiary)]">
            <Info className="w-3 h-3" />
            <span>Màu xanh = giá rẻ, màu đỏ = giá đắt. Click vào ô để xem chuyến bay.</span>
          </div>

          {data.rows.length === 0 && (
            <div className="text-center py-8 text-sm text-[var(--color-text-tertiary)]">
              <Plane className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Không có dữ liệu cho tháng này
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left font-semibold text-[var(--color-text-tertiary)] px-2 py-2 w-[120px]">Điểm đến</th>
                  {daysInMonth.map((d, i) => (
                    <th key={i} className={`text-center font-medium text-[10px] px-1 py-2 min-w-[32px] ${
                      d.dayOfWeek === 'T7' || d.dayOfWeek === 'CN' ? 'text-primary-500' : 'text-[var(--color-text-tertiary)]'
                    }`}>
                      <div>{d.dayOfWeek}</div>
                      <div className="font-bold text-xs mt-0.5">{d.date}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, ri) => (
                  <tr key={ri}>
                    <td className="font-semibold text-[var(--color-text-primary)] px-2 py-2 whitespace-nowrap">
                      <div>{row.location}</div>
                      <div className="text-[10px] text-[var(--color-text-tertiary)] font-normal">{cityNames[row.location] || ''}</div>
                    </td>
                    {row.days.map((price, di) => (
                      <td key={di} className="p-0.5">
                        <button
                          onClick={() => onSelectDate?.(row.location, daysInMonth[di]?.fullDate)}
                          className={`w-full h-10 rounded-lg ${getColor(price, minPrice, maxPrice)} ${getTextColor(price, minPrice, maxPrice)} flex items-center justify-center text-[10px] font-semibold hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer`}
                          title={price != null ? `${row.location} - ${daysInMonth[di]?.fullDate}: ${formatCurrencyVnd(price)}` : 'Không có vé'}
                        >
                          {price != null ? formatCurrencyVnd(price).replace('₫', '').trim() : '—'}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 mt-3 justify-end">
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-tertiary)]">
              <span className="w-3 h-3 rounded bg-emerald-400/70" />
              <span>Rẻ</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-tertiary)]">
              <span className="w-3 h-3 rounded bg-amber-400/30" />
              <span>Trung bình</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-tertiary)]">
              <span className="w-3 h-3 rounded bg-red-400/50" />
              <span>Đắt</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
