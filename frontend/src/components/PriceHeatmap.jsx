import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { getPriceCalendar } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'

const cityNames = {
  HAN: 'Hà Nội', SGN: 'TP. Hồ Chí Minh', DAD: 'Đà Nẵng',
  CXR: 'Nha Trang', PQC: 'Phú Quốc', HUI: 'Huế',
  HPH: 'Hải Phòng', VII: 'Vinh', VCA: 'Cần Thơ',
  UIH: 'Quy Nhơn',
}

function getPriceLevel(price, avg) {
  if (price == null || avg == null) return 'neutral'
  const ratio = price / avg
  if (ratio <= 0.85) return 'cheap'
  if (ratio >= 1.15) return 'expensive'
  return 'neutral'
}

function levelStyle(level) {
  switch (level) {
    case 'cheap': return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25'
    case 'expensive': return 'bg-red-500/15 text-red-600 border-red-500/25'
    default: return 'bg-[var(--color-surface-50)] text-[var(--color-text-secondary)] border-[var(--color-border)]'
  }
}

function levelDot(level) {
  switch (level) {
    case 'cheap': return 'bg-emerald-500'
    case 'expensive': return 'bg-red-400'
    default: return 'bg-[var(--color-text-tertiary)]'
  }
}

export default function PriceHeatmap({ from, onSelectDate }) {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedDest, setSelectedDest] = useState(null)

  useEffect(() => {
    if (!from) return
    setLoading(true)
    setSelectedDest(null)
    getPriceCalendar({ from, month, year })
      .then(r => { setData(r.data); setSelectedDest(null) })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [from, month, year])

  const destinations = useMemo(() => {
    if (!data?.rows) return []
    return data.rows
  }, [data])

  const activeDest = useMemo(() => {
    if (!destinations.length) return null
    if (selectedDest) return destinations.find(d => d.location === selectedDest) || destinations[0]
    return destinations[0]
  }, [destinations, selectedDest])

  const weeks = useMemo(() => {
    if (!data?.startDate || !activeDest) return []
    const start = new Date(data.startDate)
    const end = new Date(data.endDate)
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
    const weeks = []
    let currentWeek = []
    let weekStart = null
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay()
      const dateStr = d.toISOString().split('T')[0]
      const dayIndex = Math.floor((d - new Date(data.startDate)) / 86400000)
      const price = activeDest.days[dayIndex] ?? null
      const level = getPriceLevel(price, activeDest.avgPrice)
      if (dayOfWeek === 1 && currentWeek.length > 0) {
        weeks.push({ days: currentWeek })
        currentWeek = []
      }
      currentWeek.push({ date: d.getDate(), dateStr, dayOfWeek, dayName: dayNames[dayOfWeek], price, level })
      if (weekStart === null) weekStart = d.getDay()
    }
    if (currentWeek.length > 0) weeks.push({ days: currentWeek })
    return weeks
  }, [data, activeDest])

  const avgPrice = activeDest?.avgPrice ?? null
  const minPrice = activeDest ? Math.min(...activeDest.days.filter(p => p != null)) : null
  const maxPrice = activeDest ? Math.max(...activeDest.days.filter(p => p != null)) : null

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
          <div className="flex items-center gap-1 bg-[var(--color-border)]/30 rounded-lg p-0.5">
            <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-[var(--color-border)]/50 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-[var(--color-text-primary)] min-w-[80px] text-center">
              Tháng {month}/{year}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-[var(--color-border)]/50 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="animate-pulse space-y-3">
          <div className="h-9 bg-[var(--color-border)] rounded-lg w-48" />
          <div className="h-12 bg-[var(--color-border)] rounded-lg" />
          <div className="h-12 bg-[var(--color-border)] rounded-lg" />
          <div className="h-12 bg-[var(--color-border)] rounded-lg" />
        </div>
      )}

      {!loading && destinations.length > 0 && activeDest && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
              <select
                value={activeDest.location}
                onChange={e => setSelectedDest(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--color-surface-50)] border border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
              >
                {destinations.map(d => (
                  <option key={d.location} value={d.location}>
                    {d.location} — {cityNames[d.location] || d.location}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 text-xs text-[var(--color-text-tertiary)]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Rẻ hơn TB
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-text-tertiary)]" />
                TB
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                Đắt hơn TB
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-text-tertiary)]">Từ {from}</span>
              <span className="text-primary-500 font-bold">→</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{activeDest.location}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-600 font-semibold">
                <TrendingDown className="w-3 h-3 inline mr-0.5" />
                {formatCurrencyVnd(minPrice)}
              </span>
              <span className="text-[var(--color-text-tertiary)]">–</span>
              <span className="text-red-500 font-semibold">
                <TrendingUp className="w-3 h-3 inline mr-0.5" />
                {formatCurrencyVnd(maxPrice)}
              </span>
              <span className="text-[var(--color-text-tertiary)] before:content-['•'] before:mr-1.5">
                TB {formatCurrencyVnd(avgPrice)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="w-16" />
                  {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
                    <th key={i} className="text-center font-medium text-[10px] text-[var(--color-text-tertiary)] px-1 py-1.5">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, wi) => (
                  <tr key={wi}>
                    <td className="text-[10px] text-[var(--color-text-tertiary)] font-medium pr-2 whitespace-nowrap">
                      {week.days[0]?.date}/{month}
                      {week.days.length > 1 && week.days[week.days.length - 1]?.date !== week.days[0]?.date
                        ? ` - ${week.days[week.days.length - 1]?.date}/${month}`
                        : ''}
                    </td>
                    {[1, 2, 3, 4, 5, 6, 0].map(dow => {
                      const day = week.days.find(d => d.dayOfWeek === dow)
                      if (!day) return <td key={dow} className="p-0.5" />
                      const level = day.level
                      return (
                        <td key={dow} className="p-0.5">
                          <button
                            onClick={() => day.price != null && onSelectDate?.(activeDest.location, day.dateStr)}
                            disabled={day.price == null}
                            className={`w-full min-w-[48px] px-1 py-2 rounded-xl border transition-all ${levelStyle(level)} ${day.price != null ? 'cursor-pointer hover:ring-2 hover:ring-primary-500' : 'opacity-40 cursor-default'}`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${levelDot(level)} shrink-0`} />
                              <span className="font-semibold text-[11px]">
                                {day.price != null ? formatCurrencyVnd(day.price).replace('₫', '').trim() : '—'}
                              </span>
                            </div>
                            <div className="text-[9px] text-inherit opacity-60 mt-0.5">{day.date}</div>
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {destinations.length > 1 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-tertiary)]">
              <MapPin className="w-3 h-3" />
              <span>
                {destinations.length - 1} điểm đến khác:{' '}
                {destinations.filter(d => d.location !== activeDest.location).map((d, i) => (
                  <button key={d.location} onClick={() => setSelectedDest(d.location)}
                    className="text-primary-500 hover:underline font-medium mx-0.5"
                  >
                    {d.location}{i < destinations.length - 2 ? ',' : ''}
                  </button>
                ))}
              </span>
            </div>
          )}
        </>
      )}

      {!loading && destinations.length === 0 && (
        <div className="text-center py-6 text-sm text-[var(--color-text-tertiary)]">
          <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Không có dữ liệu cho tháng này
        </div>
      )}
    </div>
  )
}
