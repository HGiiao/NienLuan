export default function SearchForm({ children, className = '' }) {
  return (
    <div className={`bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 mb-6 ${className}`}>
      {children}
    </div>
  )
}
