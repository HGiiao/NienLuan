import { useState, useEffect } from 'react'
import { Shield, Check, Plus, X } from 'lucide-react'
import { getInsurancePackages, addBookingInsurance, removeBookingInsurance } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'

export default function InsuranceCard({ bookingId, onInsuranceChange }) {
  const [packages, setPackages] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getInsurancePackages()
      .then(r => setPackages(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = async (pkg) => {
    if (!bookingId) return
    if (selected?.id === pkg.id) {
      try { await removeBookingInsurance(bookingId); setSelected(null); onInsuranceChange?.(null) } catch {}
      return
    }
    try {
      await addBookingInsurance(bookingId, { packageId: pkg.id })
      setSelected(pkg)
      onInsuranceChange?.(pkg)
    } catch {}
  }

  if (loading) {
    return (
      <div className="border border-[var(--color-border)] rounded-2xl p-4 animate-pulse">
        <div className="h-4 bg-[var(--color-border)] rounded w-40 mb-3" />
        <div className="h-16 bg-[var(--color-border)] rounded-xl" />
      </div>
    )
  }

  return (
    <div className="border border-[var(--color-border)] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-accent-500" />
        <span className="text-sm font-bold text-[var(--color-text-primary)]">Bảo hiểm chuyến đi</span>
        <span className="text-[10px] bg-accent-500/10 text-accent-500 px-2 py-0.5 rounded-full font-semibold">Đề xuất</span>
      </div>

      {packages.map(pkg => {
        const isSelected = selected?.id === pkg.id
        return (
          <button key={pkg.id} onClick={() => handleSelect(pkg)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border mb-2 text-left transition-all ${isSelected ? 'border-accent-500 bg-accent-500/5' : 'border-[var(--color-border)] hover:border-accent-500/30'}`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-accent-500 text-white' : 'bg-accent-500/10 text-accent-500'}`}>
              {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${isSelected ? 'text-accent-500' : 'text-[var(--color-text-primary)]'}`}>{pkg.name}</p>
              <p className="text-[11px] text-[var(--color-text-tertiary)] truncate">{pkg.provider} — {pkg.coverage}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-primary-500">{formatCurrencyVnd(pkg.price)}</p>
              <p className="text-[10px] text-[var(--color-text-tertiary)]">/người</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
