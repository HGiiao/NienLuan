import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Users, Ticket, Plane, Train, Bus, Loader, X } from 'lucide-react'
import { getAdminUsers, getAdminBookings, getAdminFlights, getAdminTrains, getAdminBuses } from '../services/api'

const fmtMoney = (n) => Number(n || 0).toLocaleString('vi-VN')

export default function GlobalSearch({ onNavigate }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const ref = useRef(null)
  const debounceRef = useRef(null)

  // ⌘K / Ctrl+K mở tìm kiếm
  useEffect(() => {
    const handle = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const runSearch = useCallback((q) => {
    if (!q.trim()) { setResults(null); setLoading(false); return }
    setLoading(true)
    const params = { search: q.trim(), page: 1, pageSize: 5 }
    Promise.allSettled([
      getAdminUsers(params),
      getAdminBookings(params),
      getAdminFlights(params),
      getAdminTrains(params),
      getAdminBuses(params),
    ]).then(([u, b, fl, tr, bu]) => {
      setResults({
        users: u.status === 'fulfilled' ? (u.value.data.items || []) : [],
        bookings: b.status === 'fulfilled' ? (b.value.data.items || []) : [],
        flights: fl.status === 'fulfilled' ? (fl.value.data.items || []) : [],
        trains: tr.status === 'fulfilled' ? (tr.value.data.items || []) : [],
        buses: bu.status === 'fulfilled' ? (bu.value.data.items || []) : [],
      })
      setLoading(false)
    })
  }, [])

  const handleChange = (v) => {
    setQuery(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(v), 300)
  }

  const go = (tab) => {
    setOpen(false)
    setQuery('')
    setResults(null)
    onNavigate(tab)
  }

  const total = results ? Object.values(results).reduce((s, arr) => s + arr.length, 0) : 0

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-[var(--color-sidebar-hover)] transition-colors text-xs text-[var(--color-text-tertiary)]"
      >
        <Search className="w-4 h-4" />
        <span>Tìm kiếm...</span>
        <kbd className="hidden md:inline-flex px-1.5 py-0.5 rounded bg-[var(--color-border)] text-[10px] font-mono text-[var(--color-text-tertiary)]">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[420px] max-h-[560px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
              <Search className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => handleChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
                placeholder="Tìm người dùng, đặt chỗ, chuyến bay, xe, tàu..."
                className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none"
              />
              {loading && <Loader className="w-4 h-4 animate-spin text-primary-500 shrink-0" />}
              {query && !loading && (
                <button onClick={() => { setQuery(''); setResults(null) }} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {!query.trim() ? (
                <div className="p-6 text-center">
                  <Search className="w-8 h-8 mx-auto text-[var(--color-text-tertiary)] mb-2" />
                  <p className="text-xs text-[var(--color-text-tertiary)]">Gõ tên, email, mã chuyến, mã đặt chỗ... (phím tắt ⌘K)</p>
                </div>
              ) : total === 0 && !loading ? (
                <div className="p-6 text-center">
                  <p className="text-xs text-[var(--color-text-tertiary)]">Không tìm thấy kết quả cho "{query.trim()}"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results?.users?.length > 0 && (
                    <div>
                      <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1"><Users className="w-3 h-3" />Người dùng</p>
                      {results.users.map(u => (
                        <button key={u.id} onClick={() => go('users')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--color-border)]/30 transition-colors text-left">
                          <span className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center text-[10px] font-bold text-primary-600">{(u.fullName || u.email || '?')[0].toUpperCase()}</span>
                          <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[var(--color-text-primary)] truncate">{u.fullName || '—'}</span><span className="block text-[10px] text-[var(--color-text-tertiary)] truncate">{u.email}</span></span>
                        </button>
                      ))}
                    </div>
                  )}

                  {results?.bookings?.length > 0 && (
                    <div>
                      <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1"><Ticket className="w-3 h-3" />Đặt chỗ</p>
                      {results.bookings.map(b => (
                        <button key={b.id} onClick={() => go('bookings')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--color-border)]/30 transition-colors text-left">
                          <span className="text-xs font-mono text-[var(--color-text-tertiary)]">#{b.id}</span>
                          <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[var(--color-text-primary)] truncate">{b.user?.fullName || '—'}</span><span className="block text-[10px] text-[var(--color-text-tertiary)] truncate">{b.user?.email || ''}</span></span>
                          <span className="text-xs font-bold text-primary-600">{fmtMoney(b.totalPrice)} ₫</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {results?.flights?.length > 0 && (
                    <div>
                      <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1"><Plane className="w-3 h-3" />Chuyến bay</p>
                      {results.flights.map(f => (
                        <button key={f.id} onClick={() => go('flights')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--color-border)]/30 transition-colors text-left">
                          <span className="text-sm font-bold text-[var(--color-text-primary)]">{f.flightNumber || f.airlineCode}</span>
                          <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-secondary)]">{f.departureLocation} → {f.arrivalLocation} • {f.departureTime?.split('T')[0]}</span>
                          <span className="text-xs font-semibold text-primary-600">{fmtMoney(f.price)} ₫</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {results?.buses?.length > 0 && (
                    <div>
                      <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1"><Bus className="w-3 h-3" />Xe khách</p>
                      {results.buses.map(b => (
                        <button key={b.id} onClick={() => go('buses')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--color-border)]/30 transition-colors text-left">
                          <span className="text-sm font-bold text-[var(--color-text-primary)]">{b.busCode}</span>
                          <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-secondary)]">{b.departureLocation} → {b.arrivalLocation} • {b.departureTime?.split('T')[0]}</span>
                          <span className="text-xs font-semibold text-primary-600">{fmtMoney(b.price)} ₫</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {results?.trains?.length > 0 && (
                    <div>
                      <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1"><Train className="w-3 h-3" />Tàu hỏa</p>
                      {results.trains.map(t => (
                        <button key={t.id} onClick={() => go('trains')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--color-border)]/30 transition-colors text-left">
                          <span className="text-sm font-bold text-[var(--color-text-primary)]">{t.trainCode}</span>
                          <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-secondary)]">{t.departureLocation} → {t.arrivalLocation}</span>
                          <span className="text-xs font-semibold text-primary-600">{fmtMoney(t.price)} ₫</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
