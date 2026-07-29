import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'

const rowVariants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
}

export default function DataTable({
  columns,
  data = [],
  loading = false,
  page = 1,
  pageSize = 10,
  total = 0,
  onPageChange,
  onSearch,
  searchValue,
  searchPlaceholder = 'Tìm kiếm...',
  emptyIcon: EmptyIcon,
  emptyTitle = 'Không có dữ liệu',
  emptyDesc = '',
  actions,
  onRowClick,
  keyExtractor = (row) => row.id,
  filters,
}) {
  const [sortField, setSortField] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [localSearch, setLocalSearch] = useState(searchValue || '')
  const debounceRef = useRef(null)

  useEffect(() => { setLocalSearch(searchValue || '') }, [searchValue])

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const handleSearchChange = (value) => {
    setLocalSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onSearch(value), 500)
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortedData = useMemo(() => {
    if (!sortField) return data
    return [...data].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [data, sortField, sortDir])

  const totalPages = Math.ceil(total / pageSize)

  if (loading) {
    return (
      <div className="rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] overflow-hidden">
        <div className="p-5 space-y-4 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-border)]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-[var(--color-border)] rounded-md w-1/3" />
                <div className="h-2.5 bg-[var(--color-border)] rounded-md w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] overflow-hidden">
      {onSearch && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input
              value={localSearch}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]             outline-none focus:border-primary-500/40 focus:ring-2 focus:ring-primary-500/10 transition-all"
            />
          </div>
          <span className="text-xs text-[var(--color-text-tertiary)] font-medium">{total.toLocaleString('vi-VN')} kết quả</span>
        </div>
      )}

      {filters && filters.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg)]/50 flex-wrap">
          {filters.map(f => (
            <div key={f.key} className="flex items-center gap-1.5">
              <label className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase whitespace-nowrap">{f.label}</label>
              {f.type === 'select' ? (
                <select
                  value={f.value || ''}
                  onChange={e => f.onChange(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-xs text-[var(--color-text-primary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all appearance-none cursor-pointer"
                >
                  <option value="">Tất cả</option>
                  {f.options?.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : f.type === 'date' ? (
                <input
                  type="date"
                  value={f.value || ''}
                  onChange={e => f.onChange(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-xs text-[var(--color-text-primary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                />
              ) : null}
              {f.value && (
                <button onClick={() => f.onChange('')} className="p-0.5 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {sortedData.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          {EmptyIcon && (
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center mb-4">
              <EmptyIcon className="w-6 h-6 text-[var(--color-text-tertiary)]" />
            </div>
          )}
          <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">{emptyTitle}</p>
          {emptyDesc && <p className="text-xs text-[var(--color-text-tertiary)]">{emptyDesc}</p>}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    className={`py-3 px-4 text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider ${
                      col.sortable !== false ? 'cursor-pointer hover:text-[var(--color-text-primary)] select-none' : ''
                    } ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    <div className={`flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : ''}`}>
                      {col.label}
                      {col.sortable !== false && sortField === col.key && (
                        sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                ))}
                {actions && <th className="py-3 px-4 text-right text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {sortedData.map((row, i) => (
                  <motion.tr
                    key={keyExtractor(row)}
                    variants={rowVariants}
                    initial="initial"
                    animate="animate"
                    exit="initial"
                    transition={{ delay: i * 0.02 }}
                    onClick={() => onRowClick?.(row)}
                    className={`group border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg)] transition-colors last:border-0 ${
                      onRowClick ? 'cursor-pointer' : ''
                    }`}
                  >
                    {columns.map(col => (
                      <td key={col.key} className={`py-3 px-4 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                        {col.render ? col.render(row) : (
                          <span className="text-sm text-[var(--color-text-secondary)]">{row[col.key]}</span>
                        )}
                      </td>
                    ))}
                    {actions && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {actions(row)}
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {Math.min((page - 1) * pageSize + 1, total).toLocaleString('vi-VN')}–{Math.min(page * pageSize, total).toLocaleString('vi-VN')} / {total.toLocaleString('vi-VN')}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Trước
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              const p = start + i
              if (p > totalPages) return null
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                    p === page
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]'
                  }`}
                >
                  {p}
                </button>
              )
            })}
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              Sau
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
