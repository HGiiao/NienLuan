export default function Card({ children, className = '', padding = 'md', hover = true }) {
  const p = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' }[padding] || 'p-5'
  return (
    <div className={`bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl ${p} ${hover ? 'hover:border-white/[0.12] transition-all duration-200' : ''} ${className}`}>
      {children}
    </div>
  )
}
