const colorMap = {
  primary: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
  accent: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
  emerald: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
  amber: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  violet: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
  slate: 'bg-white/5 text-white/50 border-white/10',
}

export default function Badge({ children, color = 'primary', icon: Icon, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${colorMap[color] || colorMap.primary} ${className}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  )
}

const statusMap = {
  Confirmed: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20',
  Pending: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
  Cancelled: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20',
  Completed: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
}

export function StatusBadge({ status }) {
  const label = { Confirmed: 'Đã xác nhận', Pending: 'Chờ xử lý', Cancelled: 'Đã huỷ', Completed: 'Hoàn thành' }[status] || status
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusMap[status] || statusMap.Pending}`}>
      {label}
    </span>
  )
}
