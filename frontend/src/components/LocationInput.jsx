import { useState, useEffect, useRef } from 'react'
import { MapPin } from 'lucide-react'
import { searchLocations } from '../services/api'

export default function LocationInput({ value, onChange, placeholder, variant = 'default', icon: Icon }) {
  const [query, setQuery] = useState(value || '')
  const [locations, setLocations] = useState([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const ref = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    searchLocations('').then(res => setLocations(res.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (value !== query) setQuery(value || '')
  }, [value])

  const filtered = locations.filter(l =>
    !query || l.code?.toLowerCase().includes(query.toLowerCase()) ||
    l.name?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8)

  const select = (loc) => {
    setQuery(loc.code)
    onChange(loc.code)
    setOpen(false)
  }

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
    if (e.key === 'Enter' && highlight >= 0 && filtered[highlight]) { select(filtered[highlight]); inputRef.current?.blur() }
    if (e.key === 'Escape') setOpen(false)
  }

  const baseInput = variant === 'hero'
    ? 'w-full bg-white/20 border border-white/10 rounded-lg pl-9 pr-3 py-[10px] text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all'
    : 'w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 h-[42px] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/10 transition-all'

  const IconCmp = Icon || MapPin

  return (
    <div className="relative w-full" ref={ref}>
      <IconCmp className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${variant === 'hero' ? 'text-primary-500' : 'text-[var(--color-text-tertiary)]'}`} />
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={e => { setQuery(e.target.value); setOpen(true); setHighlight(-1); onChange('') }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKey}
        className={baseInput}
      />
      {open && filtered.length > 0 && (
        <div className={`absolute top-full left-0 right-0 mt-1 z-50 max-h-32 overflow-y-auto rounded-lg border shadow-xl scrollbar-thin ${
          variant === 'hero' ? 'bg-black/70 backdrop-blur-xl border-white/10 shadow-xl' : 'bg-[var(--color-bg-card)] border-[var(--color-border)]'
        }`}>
          {filtered.map((loc, i) => (
            <button key={loc.code} type="button"
              onClick={() => select(loc)}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-colors ${
                variant === 'hero'
                  ? (highlight === i ? 'bg-primary-500/20 text-primary-300' : 'text-white/80')
                  : (highlight === i ? 'bg-primary-500/10 text-primary-500' : 'text-[var(--color-text-primary)]')
              }`}
            >
              <MapPin className={`w-3.5 h-3.5 shrink-0 ${variant === 'hero' ? 'text-primary-500/50' : 'text-[var(--color-text-tertiary)]'}`} />
              <span className="font-semibold">{loc.code}</span>
              <span className={`text-xs ${variant === 'hero' ? 'text-white/50' : 'text-[var(--color-text-tertiary)]'}`}>{loc.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
