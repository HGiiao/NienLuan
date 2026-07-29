import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, total, pageSize = 20, onChange }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i).filter(p => p <= totalPages)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)] mt-4">
      <span className="text-xs text-[var(--color-text-tertiary)]">
        {Math.min((page - 1) * pageSize + 1, total).toLocaleString('vi-VN')}–{Math.min(page * pageSize, total).toLocaleString('vi-VN')} / {total.toLocaleString('vi-VN')}
      </span>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Trước
        </button>
        {pages.map(p => (
          <button key={p} onClick={() => onChange(p)}
            className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
              p === page ? 'bg-primary-500 text-white shadow-sm' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-white/5'
            }`}
          >{p}</button>
        ))}
        <button disabled={page >= totalPages} onClick={() => onChange(page + 1)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          Sau <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
