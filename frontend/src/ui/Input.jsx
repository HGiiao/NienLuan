export default function Input({ label, icon: Icon, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none" />}
        <input
          className={`w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl ${Icon ? 'pl-10' : 'pl-4'} pr-4 h-[42px] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/10 transition-all ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-[var(--color-danger)] mt-1">{error}</p>}
    </div>
  )
}

export function Select({ label, options = [], className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">{label}</label>}
      <select
        className={`w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 h-[42px] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/10 transition-all ${className}`}
        {...props}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function ToggleGroup({ options, value, onChange, label }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">{label}</label>}
      <div className="flex items-center gap-1 bg-[var(--color-border)]/30 rounded-lg p-0.5">
        {options.map(o => (
          <button key={o.value} onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              value === o.value ? 'bg-primary-500 text-white shadow-sm' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
            }`}
          >{o.label}</button>
        ))}
      </div>
    </div>
  )
}

export function RouteChip({ children, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
        active
          ? 'bg-primary-500/10 border-primary-500/30 text-primary-400'
          : 'border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:border-primary-500/30 hover:text-primary-400 hover:bg-primary-500/5'
      }`}
    >{children}</button>
  )
}
