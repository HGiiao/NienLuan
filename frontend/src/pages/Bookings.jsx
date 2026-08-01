import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Ticket, Search, Plane, Train, CalendarDays, CreditCard, Calendar } from 'lucide-react'
import { getBookings, cancelBooking } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'
import { PageHeader, SearchForm, SkeletonList, EmptyState, Card, StatusBadge, Button } from '../ui'

const statusConfig = {
  Pending: { label: 'Chờ xác nhận', class: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  Confirmed: { label: 'Đã xác nhận', class: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20' },
  Cancelled: { label: 'Đã hủy', class: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20' },
}

const stagger = { whileInView: { transition: { staggerChildren: 0.06 } }, viewport: { once: true } }
const cardVariant = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  viewport: { once: true },
}

export default function Bookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [cancelling, setCancelling] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const stored = JSON.parse(sessionStorage.getItem('user') || '{}')
      const searchEmail = email || stored.email || ''
      if (!searchEmail) { setLoading(false); return }

      const res = await getBookings({ email: searchEmail, page, pageSize: 10 })
      setBookings(res.data.items || res.data)
      setTotal(res.data.total || 0)
    } catch { setBookings([]) } finally { setLoading(false) }
  }

  useEffect(() => { fetchBookings() }, [page])

  const handleCancel = async (id) => {
    setCancelling(id)
    try {
      await cancelBooking(id)
      fetchBookings()
    } catch { alert('Không thể hủy đặt chỗ') } finally { setCancelling(null) }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
      className="max-w-7xl mx-auto px-4 py-6 md:py-8"
    >
      <PageHeader icon={Ticket} title="Đặt chỗ của tôi" />

      <SearchForm>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Email</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
              <input className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 py-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]" placeholder="Email của bạn" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          <Button icon={Search} onClick={fetchBookings}>Tìm kiếm</Button>
        </div>
      </SearchForm>

      {loading && <SkeletonList count={3} height="h-28" />}

      {!loading && bookings.length === 0 && (
        <EmptyState icon={Ticket} title="Chưa có đặt chỗ nào" desc="Sau khi đặt vé, thông tin sẽ hiển thị tại đây" />
      )}

      <motion.div {...stagger} className="space-y-3">
        {bookings.map(b => {
          const status = statusConfig[b.status]
          return (
            <motion.div key={b.id} variants={cardVariant}
              className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-4 md:p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="font-semibold text-[var(--color-text-primary)] text-lg">Đặt chỗ #{b.id}</span>
                    <StatusBadge status={b.status} config={statusConfig} />
                  </div>
                  <div className="text-sm text-[var(--color-text-secondary)] flex items-center gap-2">
                    {b.flightId ? <><Plane className="w-3.5 h-3.5 text-primary-500" /><span>Chuyến bay #{b.flightId}</span></> : b.trainId ? <><Train className="w-3.5 h-3.5 text-primary-500" /><span>Chuyến tàu #{b.trainId}</span></> : <span className="text-[var(--color-text-tertiary)]">--</span>}
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5 flex items-center gap-1.5">
                    <CalendarDays className="w-3 h-3" />
                    {new Date(b.bookingDate).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <div className="text-right flex md:flex-col items-center md:items-end gap-3 md:gap-1.5">
                  <div className="flex items-center gap-1.5 text-2xl font-bold text-primary-500">
                    <CreditCard className="w-4 h-4" />
                    {formatCurrencyVnd(b.totalPrice)}
                  </div>
                  {b.status === 'Confirmed' && (
                    <a href={`/api/bookings/${b.id}/calendar`} download
                      className="flex items-center gap-1 text-[11px] font-semibold text-primary-500 bg-primary-500/10 px-3 py-1.5 rounded-lg hover:bg-primary-500/20 transition-colors"
                    ><Calendar className="w-3.5 h-3.5" />Thêm vào lịch</a>
                  )}
                  {b.status === 'Pending' && (
                    <Button variant="danger" size="sm"
                      onClick={() => handleCancel(b.id)}
                      disabled={cancelling === b.id}
                    >
                      {cancelling === b.id ? 'Đang hủy...' : 'Hủy đặt chỗ'}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
