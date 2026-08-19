import { useState, useEffect } from 'react'
import { searchLocations } from '../services/api'

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
const labelCls = "block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase mb-1.5"

export default function LocationSelect({ value, onChange, label, placeholder = 'Chọn địa điểm' }) {
  const [locations, setLocations] = useState([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    searchLocations('')
      .then(res => { setLocations(res.data || []); setFailed(false) })
      .catch(() => setFailed(true))
  }, [])

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select required value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
        <option value="">{failed ? 'Không tải được danh sách' : placeholder}</option>
        {locations.map(l => (
          <option key={l.code} value={l.code}>{l.code} — {l.name}</option>
        ))}
      </select>
    </div>
  )
}