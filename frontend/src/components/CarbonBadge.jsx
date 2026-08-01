import { useState, useEffect } from 'react'
import { Leaf, Train, Plane, Bus } from 'lucide-react'
import { getCarbonFootprint } from '../services/api'

export default function CarbonBadge({ item, type, detailed, from: propFrom, to: propTo }) {
  const [carbon, setCarbon] = useState(null)
  const [loading, setLoading] = useState(false)

  const from = propFrom || item?.departureLocation
  const to = propTo || item?.arrivalLocation

  useEffect(() => {
    if (!from || !to || carbon) return
    if (!detailed) return
    setLoading(true)
    getCarbonFootprint({ from, to }).then(r => setCarbon(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [from, to, detailed, carbon])

  if (loading || !carbon) return null

  if (type === 'train' && detailed) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
        <Leaf className="w-3.5 h-3.5" />Xanh hơn — Chỉ {carbon.trainKgCO2}kg CO₂
      </div>
    )
  }

  if (type === 'bus' && detailed) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
        <Leaf className="w-3.5 h-3.5" />Xanh hơn — Chỉ {carbon.busKgCO2}kg CO₂
      </div>
    )
  }

  if (type === 'train' || type === 'bus') {
    return (
      <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
        <Leaf className="w-3 h-3" />Xanh hơn
      </div>
    )
  }

  if (detailed) {
    return (
      <div className="border border-[var(--color-border)] rounded-2xl p-4 bg-[var(--color-bg)]">
        <div className="flex items-center gap-2 mb-3">
          <Leaf className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-bold text-[var(--color-text-primary)]">Lượng khí thải CO₂</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-orange-500/10 rounded-xl p-3 text-center">
            <Plane className="w-5 h-5 mx-auto mb-1 text-orange-500" />
            <div className="text-lg font-bold text-orange-500">{carbon.flightKgCO2}</div>
            <div className="text-[10px] text-[var(--color-text-tertiary)]">kg CO₂ — Máy bay</div>
          </div>
          <div className="bg-primary-500/10 rounded-xl p-3 text-center">
            <Bus className="w-5 h-5 mx-auto mb-1 text-primary-500" />
            <div className="text-lg font-bold text-primary-500">{carbon.busKgCO2}</div>
            <div className="text-[10px] text-[var(--color-text-tertiary)]">kg CO₂ — Xe khách</div>
          </div>
          <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
            <Train className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
            <div className="text-lg font-bold text-emerald-500">{carbon.trainKgCO2}</div>
            <div className="text-[10px] text-[var(--color-text-tertiary)]">kg CO₂ — Tàu hỏa</div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 rounded-xl">
          <Leaf className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-xs text-[var(--color-text-secondary)]">{carbon.recommendation}</p>
        </div>
        <p className="text-[10px] text-[var(--color-text-tertiary)] mt-2">Khoảng cách: {carbon.distanceKm}km</p>
      </div>
    )
  }

  return null
}
