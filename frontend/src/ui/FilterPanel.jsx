import { useState } from 'react'
import { Filter } from 'lucide-react'
import { Select } from './Input'

const sortOptions = [
  { value: 'price', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'departure', label: 'Giờ đi sớm nhất' },
  { value: 'duration', label: 'Thời gian ngắn nhất' },
]

export default function FilterPanel({ onFilterChange }) {
  const [filters, setFilters] = useState({ sortBy: 'price', minPrice: '', maxPrice: '' })

  const update = (key, value) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value }
      onFilterChange?.(next)
      return next
    })
  }

  const hasFilters = filters.minPrice || filters.maxPrice

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-primary)]">
          <Filter className="w-4 h-4 text-[var(--color-text-tertiary)]" />
          Bộ lọc
          {hasFilters && <span className="w-2 h-2 rounded-full bg-primary-500" />}
        </div>
        <div className="w-40">
          <Select options={sortOptions} value={filters.sortBy} onChange={e => update('sortBy', e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number" placeholder="Giá tối thiểu" value={filters.minPrice}
            onChange={e => update('minPrice', e.target.value)}
            className="w-28 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 h-[42px] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-primary-500/50 transition-all"
          />
          <span className="text-[var(--color-text-tertiary)] text-sm">—</span>
          <input
            type="number" placeholder="Giá tối đa" value={filters.maxPrice}
            onChange={e => update('maxPrice', e.target.value)}
            className="w-28 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 h-[42px] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-primary-500/50 transition-all"
          />
        </div>
      </div>
    </div>
  )
}
