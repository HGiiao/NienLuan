import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plane, Train, ArmchairIcon, Info, Check, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { getSeatMap } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'

export default function SeatMap({ type, referenceId, userId, onSeatsSelected, onClose }) {
  const [seats, setSeats] = useState([])
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deck, setDeck] = useState('economy')

  useEffect(() => {
    if (!referenceId) return
    setLoading(true)
    getSeatMap(type, referenceId)
      .then(r => setSeats(r.data.seats))
      .catch(() => setError('Không thể tải sơ đồ ghế'))
      .finally(() => setLoading(false))
  }, [type, referenceId])

  const isFlight = type === 'flight'

  const grouped = useMemo(() => {
    const filtered = seats.filter(s => s.class === deck || deck === 'all')
    const rows = {}
    filtered.forEach(s => {
      if (!rows[s.row]) rows[s.row] = []
      rows[s.row].push(s)
    })
    const sorted = Object.entries(rows).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    if (isFlight) {
      sorted.forEach(([, rowSeats]) => rowSeats.sort((a, b) => a.column.localeCompare(b.column)))
    }
    return sorted
  }, [seats, deck, isFlight])

  const cols = isFlight ? ['A', 'B', 'C', 'D', 'E', 'F'] : ['1', '2', '3', '4', '5', '6']

  const toggleSeat = (seat) => {
    if (seat.status !== 'available') return
    setSelected(prev => {
      const idx = prev.findIndex(s => s.id === seat.id)
      if (idx >= 0) return prev.filter(s => s.id !== seat.id)
      if (prev.length >= (isFlight ? 9 : 6)) return prev
      return [...prev, seat]
    })
  }

  const totalPrice = useMemo(() => selected.reduce((sum, s) => sum + s.price, 0), [selected])

  const confirmSelection = () => {
    if (onSeatsSelected) onSeatsSelected(selected)
    if (onClose) onClose()
  }

  return (
    <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          {isFlight ? <Plane className="w-4 h-4 text-primary-500" /> : <Train className="w-4 h-4 text-primary-500" />}
          <span className="text-sm font-bold text-[var(--color-text-primary)]">Chọn ghế</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-[var(--color-text-tertiary)]">Đang tải sơ đồ ghế...</div>
      ) : error ? (
        <div className="p-12 text-center">
          <p className="text-sm text-[var(--color-danger)] mb-2">{error}</p>
          <button onClick={() => window.location.reload()} className="text-xs text-accent-500 hover:underline">Thử lại</button>
        </div>
      ) : (
        <>
          {isFlight && (
            <div className="flex gap-1 px-4 pt-3 pb-1 border-b border-[var(--color-border)]">
              {['economy', 'business'].map(d => (
                <button key={d} onClick={() => { setDeck(d); setSelected([]) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${deck === d ? 'bg-accent-500 text-white' : 'bg-[var(--color-border)]/30 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/50'}`}
                >{d === 'economy' ? 'Phổ thông' : 'Thương gia'}</button>
              ))}
            </div>
          )}

          <div className="p-4 overflow-x-auto">
            <div className="flex flex-col items-center min-w-[300px]">
              {isFlight && <div className="w-3/4 h-1 bg-[var(--color-border)] rounded-full mb-4" />}

              {grouped.map(([rowNum, rowSeats]) => (
                <div key={rowNum} className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-6 text-[10px] font-semibold text-[var(--color-text-tertiary)] text-right mr-1">{rowNum}</span>

                  {isFlight && rowSeats.slice(0, 3).map(s => renderSeat(s, toggleSeat, selected))}
                  {isFlight && <div className="w-6" />}
                  {isFlight && rowSeats.slice(3).map(s => renderSeat(s, toggleSeat, selected))}

                  {!isFlight && rowSeats.map(s => renderSeat(s, toggleSeat, selected))}
                </div>
              ))}

              {isFlight && <div className="w-3/4 h-1 bg-[var(--color-border)] rounded-full mt-2" />}

              <div className="flex items-center gap-4 mt-4 text-[11px] text-[var(--color-text-tertiary)]">
                <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/40" />Trống</span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-accent-500/20 border border-accent-500/40" />Đang chọn</span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-[var(--color-border)] opacity-50" />Đã đặt</span>
              </div>
            </div>
          </div>

          {selected.length > 0 && (
            <div className="border-t border-[var(--color-border)] p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-tertiary)]">Đã chọn <span className="font-bold text-[var(--color-text-primary)]">{selected.length}</span> ghế</p>
                <p className="text-sm font-bold text-primary-500">{formatCurrencyVnd(totalPrice)}</p>
                <p className="text-[10px] text-[var(--color-text-tertiarity)]">{selected.map(s => s.seatNumber).join(', ')}</p>
              </div>
              <button onClick={confirmSelection}
                className="bg-accent-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-accent-600 transition-all shadow-md"
              >Xác nhận ghế</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function renderSeat(seat, toggleSeat, selected) {
  const isSelected = selected.some(s => s.id === seat.id)
  const isBooked = seat.status !== 'available'
  const isUnavailable = isBooked && !isSelected

  let bg = 'bg-emerald-500/20 border-emerald-500/40'
  let text = 'text-emerald-600'
  if (isSelected) { bg = 'bg-accent-500/20 border-accent-500/40'; text = 'text-accent-600' }
  if (isUnavailable) { bg = 'bg-[var(--color-border)]/30 border-[var(--color-border)]/50'; text = 'text-[var(--color-text-tertiary)]' }

  return (
    <motion.button key={seat.id} whileHover={!isUnavailable ? { scale: 1.1 } : undefined} whileTap={!isUnavailable ? { scale: 0.95 } : undefined}
      onClick={() => toggleSeat(seat)}
      disabled={isUnavailable}
      title={`Ghế ${seat.seatNumber}${seat.isWindow ? ' - Cửa sổ' : ''}${seat.isAisle ? ' - Lối đi' : ''}${seat.isExitRow ? ' - Hàng thoát hiểm' : ''}${isUnavailable ? ' - Đã đặt' : ''}${isSelected ? ' - Đang chọn' : ''}`}
      className={`w-9 h-9 rounded-lg border text-[10px] font-bold flex items-center justify-center transition-all ${bg} ${text} ${isUnavailable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {isSelected ? <Check className="w-3.5 h-3.5" /> : isUnavailable ? <X className="w-3 h-3" /> : seat.column}
    </motion.button>
  )
}
