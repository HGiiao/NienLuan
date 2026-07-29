import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ErrorState({ message = 'Đã có lỗi xảy ra', onRetry }) {
  return (
    <div className="flex flex-col items-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-[var(--color-danger)]" />
      </div>
      <p className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Thử lại
        </button>
      )}
    </div>
  )
}
