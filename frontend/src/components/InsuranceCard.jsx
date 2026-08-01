import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Check, Plus, Minus, X } from 'lucide-react'
import { getInsurancePackages, addBookingInsurance, removeBookingInsurance } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'

export default function InsuranceCard({ bookingId, onInsuranceChange }) {
  const [packages, setPackages] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailPkg, setDetailPkg] = useState(null)

  useEffect(() => {
    getInsurancePackages()
      .then(r => setPackages(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const confirmSelect = (pkg) => {
    setSelectedId(pkg.id)
    setDetailPkg(null)
    onInsuranceChange?.(pkg)
    if (bookingId) {
      addBookingInsurance(bookingId, { packageId: pkg.id }).catch(() => {})
    }
  }

  const handleDeselect = (pkg) => {
    setSelectedId(null)
    onInsuranceChange?.(null)
    if (bookingId) {
      removeBookingInsurance(bookingId).catch(() => {})
    }
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
    <div className="border border-[var(--color-border)] rounded-2xl p-4 relative">
      {packages.map(pkg => {
        const isSelected = selectedId === pkg.id
        return (
          <div key={pkg.id} className={`relative rounded-xl border mb-2 transition-all ${isSelected ? 'border-orange-500 ring-1 ring-orange-500' : 'border-[var(--color-border)]'}`}>
            <button type="button" onClick={() => isSelected ? handleDeselect(pkg) : setDetailPkg(pkg)}
              className="w-full flex items-center gap-3 p-3 text-left"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-orange-500 text-white' : 'bg-orange-500/10 text-orange-500'}`}>
                {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isSelected ? 'text-orange-500' : 'text-[var(--color-text-primary)]'}`}>{pkg.name}</p>
                <p className="text-[11px] text-[var(--color-text-tertiary)] truncate">{pkg.provider} — {pkg.coverage}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-orange-500">{formatCurrencyVnd(pkg.price)}</p>

              </div>
            </button>
            {isSelected && (
              <button type="button" onClick={() => handleDeselect(pkg)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
            )}
          </div>
        )
      })}

      {detailPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDetailPkg(null)}>
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 pb-0">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)' }}>
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base text-gray-900">{detailPkg.name}</p>
                  <p className="text-xs font-medium text-gray-500">{detailPkg.provider}</p>
                </div>
                <button type="button" onClick={() => setDetailPkg(null)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0 transition-colors">
                  <X className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="bg-orange-50 rounded-2xl p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Mô tả</p>
                  <p className="text-sm leading-relaxed text-gray-700">{detailPkg.description}</p>
                </div>
                <div className="h-px bg-orange-200/60" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Phạm vi bảo vệ</p>
                  <div className="flex flex-wrap gap-2">
                    {detailPkg.coverage.split(',').map((item, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-white px-2.5 py-1 rounded-lg border border-orange-200 shadow-sm">
                        <svg className="w-3 h-3 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                        {item.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-gray-500">Giá gói</span>
                <p className="text-xl font-black" style={{ color: '#F97316' }}>{formatCurrencyVnd(detailPkg.price)}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDetailPkg(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Hủy
                </button>
                <button type="button" onClick={() => confirmSelect(detailPkg)}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 active:scale-[0.97]"
                  style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)', boxShadow: '0 6px 18px rgba(249,115,22,0.30)' }}
                >
                  Đồng ý
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
