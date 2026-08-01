import { useState, useCallback, useEffect, useRef } from 'react'
import { Filter, X, Clock, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { Select } from './Input'

const sortOptions = [
  { value: 'price', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'departure', label: 'Giờ đi sớm nhất' },
  { value: 'duration', label: 'Thời gian ngắn nhất' },
]

const flightSeatOptions = [
  { value: 'all', label: 'Tất cả hạng' },
  { value: 'Business', label: 'Business' },
  { value: 'Premium Economy', label: 'Premium Economy' },
  { value: 'Economy', label: 'Economy' },
]

const airlineOptions = [
  { value: 'all', label: 'Tất cả hãng' },
  { value: 'VN', label: 'Vietnam Airlines' },
  { value: 'VJ', label: 'VietJet Air' },
  { value: 'QH', label: 'Bamboo Airways' },
  { value: 'VU', label: 'Vietravel Airlines' },
  { value: 'BL', label: 'Pacific Airlines' },
]

const trainCoachOptions = [
  { value: 'all', label: 'Tất cả hạng' },
  { value: 'Soft Sleeper', label: 'Giường mềm' },
  { value: 'Hard Sleeper', label: 'Giường cứng' },
  { value: 'Soft Seat', label: 'Ghế mềm' },
  { value: 'Seat', label: 'Ghế cứng' },
]

const trainTypeOptions = [
  { value: 'all', label: 'Tất cả loại' },
  { value: 'Reunification Express', label: 'Reunification Express' },
  { value: 'Fast Train', label: 'Fast Train' },
  { value: 'Local Train', label: 'Local Train' },
]

const busCoachOptions = [
  { value: 'all', label: 'Tất cả hạng' },
  { value: 'Giường nằm', label: 'Giường nằm' },
  { value: 'Ghế ngồi', label: 'Ghế ngồi' },
  { value: 'Limousine', label: 'Limousine' },
  { value: 'VIP', label: 'VIP' },
]

const busCompanyOptions = [
  { value: 'all', label: 'Tất cả nhà xe' },
  { value: 'Mai Linh', label: 'Mai Linh' },
  { value: 'Kumho Samco', label: 'Kumho Samco' },
  { value: 'Hải Âu', label: 'Hải Âu' },
  { value: 'Sao Việt', label: 'Sao Việt' },
  { value: 'Phương Trang', label: 'Phương Trang' },
]

const timeOptions = [
  { value: 'all', label: 'Tất cả giờ' },
  { value: '06:00:00-12:00:00', label: 'Sáng (6h-12h)' },
  { value: '12:00:00-18:00:00', label: 'Chiều (12h-18h)' },
  { value: '18:00:00-06:00:00', label: 'Tối (18h-6h)' },
]

export default function FilterPanel({ onChange, type = 'flight' }) {
  const [filters, setFilters] = useState({
    sortBy: 'price',
    minPrice: '',
    maxPrice: '',
    seatClass: 'all',
    airline: 'all',
    coachClass: 'all',
    trainType: 'all',
    company: 'all',
    timeRange: 'all',
    minSeats: '',
  })
  const [expanded, setExpanded] = useState(false)
  const initial = useRef(true)

  const isFlight = type === 'flight'

  const update = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const activeFilterCount = Object.entries(filters).filter(([key, val]) => {
    if (key === 'sortBy') return false
    if (val === '' || val === 'all') return false
    return true
  }).length

  useEffect(() => {
    if (!onChange) return
    if (initial.current) { initial.current = false; return }
    const cleaned = { sortBy: filters.sortBy }
    const min = String(filters.minPrice || '').trim()
    const max = String(filters.maxPrice || '').trim()
    if (min !== '') cleaned.minPrice = min
    if (max !== '') cleaned.maxPrice = max
    const numMin = parseFloat(min)
    const numMax = parseFloat(max)
    if (min !== '' && max !== '' && numMin > numMax) {
      cleaned.minPrice = ''
      cleaned.maxPrice = ''
    }
    if (filters.seatClass && filters.seatClass !== 'all') cleaned.seatClass = filters.seatClass
    if (filters.airline && filters.airline !== 'all') cleaned.airline = filters.airline
    if (filters.coachClass && filters.coachClass !== 'all') cleaned.coachClass = filters.coachClass
    if (filters.trainType && filters.trainType !== 'all') cleaned.trainType = filters.trainType
    if (filters.company && filters.company !== 'all') cleaned.company = filters.company
    if (filters.timeRange && filters.timeRange !== 'all') {
      const [tf, tt] = filters.timeRange.split('-')
      cleaned.timeFrom = tf
      cleaned.timeTo = tt
    }
    if (filters.minSeats && parseInt(filters.minSeats) > 0) cleaned.minSeats = parseInt(filters.minSeats)
    onChange(cleaned)
  }, [filters, onChange])

  const clearFilters = () => {
    setFilters({
      sortBy: filters.sortBy,
      minPrice: '', maxPrice: '',
      seatClass: 'all', airline: 'all',
      coachClass: 'all', trainType: 'all',
      company: 'all',
      timeRange: 'all', minSeats: '',
    })
  }

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <button onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-primary)] hover:opacity-80 transition-all">
          <Filter className="w-4 h-4 text-[var(--color-text-tertiary)]" />
          Bộ lọc
          {activeFilterCount > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
          {expanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
        </button>

        {activeFilterCount > 0 && (
          <button onClick={clearFilters}
            className="text-xs font-semibold text-[var(--color-danger)] hover:bg-[var(--color-danger)]/5 px-2.5 py-1 rounded-lg transition-all">
            Xóa tất cả
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--color-border)] pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <Select label="Sắp xếp" options={sortOptions} value={filters.sortBy}
              onChange={e => update('sortBy', e.target.value)} />

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Khoảng giá</label>
              <div className="flex items-center gap-2">
                <input type="number" inputMode="decimal"
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 h-[42px] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/10 transition-all"
                  placeholder="Tối thiểu" value={filters.minPrice}
                  onChange={e => update('minPrice', e.target.value)} />
                <span className="text-[var(--color-text-tertiary)] text-sm">–</span>
                <input type="number" inputMode="decimal"
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 h-[42px] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/10 transition-all"
                  placeholder="Tối đa" value={filters.maxPrice}
                  onChange={e => update('maxPrice', e.target.value)} />
              </div>
            </div>

            {isFlight ? (
              <>
                <Select label="Hạng ghế" options={flightSeatOptions} value={filters.seatClass}
                  onChange={e => update('seatClass', e.target.value)} />
                <Select label="Hãng bay" options={airlineOptions} value={filters.airline}
                  onChange={e => update('airline', e.target.value)} />
              </>
            ) : type === 'bus' ? (
              <>
                <Select label="Hạng xe" options={busCoachOptions} value={filters.coachClass}
                  onChange={e => update('coachClass', e.target.value)} />
                <Select label="Nhà xe" options={busCompanyOptions} value={filters.company}
                  onChange={e => update('company', e.target.value)} />
              </>
            ) : (
              <>
                <Select label="Hạng ghế" options={trainCoachOptions} value={filters.coachClass}
                  onChange={e => update('coachClass', e.target.value)} />
                <Select label="Loại tàu" options={trainTypeOptions} value={filters.trainType}
                  onChange={e => update('trainType', e.target.value)} />
              </>
            )}

            <Select label={<span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Khung giờ</span>}
              options={timeOptions} value={filters.timeRange}
              onChange={e => update('timeRange', e.target.value)} />

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Số ghế trống tối thiểu</span>
              </label>
              <input type="number" inputMode="numeric"
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 h-[42px] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/10 transition-all"
                placeholder="VD: 5" value={filters.minSeats}
                onChange={e => update('minSeats', e.target.value)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
