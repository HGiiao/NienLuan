import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Ticket, Search, Plane, Train, Bus, CalendarDays, CreditCard, Calendar, X, Shield, Star, AlertTriangle, RotateCcw, CheckCircle2, Loader, FileText } from 'lucide-react'
import { getBookings, cancelBooking, getRefundInfo } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'
import { PageHeader, SearchForm, SkeletonList, EmptyState } from '../ui'
import TicketDetailModal from '../components/TicketDetailModal'
import ReviewSection from '../components/ReviewSection'

const statusConfig = {
  Pending: { label: 'Chờ xác nhận', class: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  Confirmed: { label: 'Đã xác nhận', class: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20' },
  Cancelled: { label: 'Đã hủy', class: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20' },
  Departed: { label: 'Đã đi', class: 'bg-primary-500/10 text-primary-400 border-primary-500/20' },
  Completed: { label: 'Đã hoàn thành', class: 'bg-primary-500/10 text-primary-400 border-primary-500/20' },
}

const stagger = { whileInView: { transition: { staggerChildren: 0.06 } }, viewport: { once: true } }
const cardVariant = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  viewport: { once: true },
}

const bookingType = (b) => (b.flightId ? 'flight' : b.trainId ? 'train' : 'bus')
const bookingItem = (b) => b.flight || b.train || b.bus || null
const bookingDep = (b) => b.departureTime || bookingItem(b)?.departureTime || null
const bookingClass = (b) => b.seatClass || bookingItem(b)?.seatClass || bookingItem(b)?.coachClass || null

function TypeIcon({ b, className }) {
  const t = bookingType(b)
  if (t === 'flight') return <Plane className={className} />
  if (t === 'bus') return <Bus className={className} />
  return <Train className={className} />
}

export default function Bookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [notice, setNotice] = useState(null) // { type: 'success'|'error', text }

  const [cancelBookingState, setCancelBookingState] = useState(null) // { booking, info, loading }
  const [cancelling, setCancelling] = useState(false)
  const [reviewBooking, setReviewBooking] = useState(null)
  const [detailBooking, setDetailBooking] = useState(null)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const stored = JSON.parse(sessionStorage.getItem('user') || '{}')
      const searchEmail = email || stored.email || ''
      if (!searchEmail) { setLoading(false); return }

      const res = await getBookings({ email: searchEmail, page, pageSize: 10 })
      setBookings(res.data.items || res.data)
      setTotal(res.data.total || 0)
    } catch { setBookings([]) } finally { setLoading(false) }
  }, [email, page])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  const openCancelModal = async (b) => {
    setCancelBookingState({ booking: b, info: null, loading: true })
    try {
      const res = await getRefundInfo(b.id)
      setCancelBookingState({ booking: b, info: res.data, loading: false })
    } catch {
      setCancelBookingState({ booking: b, info: null, loading: false })
    }
  }

  const confirmCancel = async () => {
    if (!cancelBookingState) return
    const { booking } = cancelBookingState
    setCancelling(true)
    try {
      const res = await cancelBooking(booking.id)
      const d = res.data
      setCancelBookingState(null)
      setNotice({
        type: 'success',
        text: d.refundAmount > 0
          ? `Đã hủy đặt chỗ #${booking.id}. Hoàn tiền ${formatCurrencyVnd(d.refundAmount)} (${d.refundPercent}% theo chính sách: ${d.policyLabel}).`
          : `Đã hủy đặt chỗ #${booking.id}. Theo chính sách ${d.policyLabel}, không có khoản hoàn tiền.`,
      })
      setTimeout(() => setNotice(null), 8000)
      fetchBookings()
    } catch (err) {
      setCancelBookingState(null)
      setNotice({ type: 'error', text: err.response?.data?.message || 'Không thể hủy đặt chỗ' })
      setTimeout(() => setNotice(null), 6000)
    } finally { setCancelling(false) }
  }

  const renderTypeLine = (b) => {
    if (b.segments?.length) {
      return (
        <span className="flex items-center gap-1.5">
          <Ticket className="w-3.5 h-3.5 text-primary-500" />
          <span>Lộ trình kết hợp · {b.segments.length} chặng</span>
        </span>
      )
    }
    const item = bookingItem(b)
    if (!item) {
      return <span className="text-[var(--color-text-tertiary)]">--</span>
    }
    const t = bookingType(b)
    const code = t === 'flight'
      ? `${item.airlineCode}${(item.id % 900) + 100}`
      : t === 'bus' ? item.busCode : item.trainCode
    const name = t === 'flight' ? item.airlineName : t === 'bus' ? item.busCompany : (item.trainName || item.trainCode)
    return (
      <span className="flex items-center gap-1.5">
        <TypeIcon b={b} className="w-3.5 h-3.5 text-primary-500" />
        <span>{code} · {name}</span>
      </span>
    )
  }

  const renderRoute = (b) => {
    if (b.segments?.length) {
      const first = b.segments[0]
      const last = b.segments[b.segments.length - 1]
      return (
        <span className="font-semibold text-[var(--color-text-primary)]">
          {first.departureLocation} → {last.arrivalLocation}
        </span>
      )
    }
    const item = bookingItem(b)
    if (!item) return null
    return (
      <span className="font-semibold text-[var(--color-text-primary)]">
        {item.departureLocation} → {item.arrivalLocation}
      </span>
    )
  }

  const renderStatusBadge = (b) => {
    const displayStatus = (b.hasDeparted && (b.status === 'Confirmed' || b.status === 'Completed')) ? 'Departed' : b.status
    const cfg = statusConfig[displayStatus] || statusConfig.Pending
    return (
      <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cfg.class}`}>
        {cfg.label}
      </span>
    )
  }

  const renderActions = (b) => {
    const item = bookingItem(b)
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {/* Đã xác nhận + qua giờ khởi hành → chuyển sang nút đánh giá */}
        {b.canReview && (b.status === 'Confirmed' || b.status === 'Completed') && (
          <button
            onClick={() => setReviewBooking(b)}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-primary-500 to-primary-600 px-3.5 py-2 rounded-xl hover:shadow-md hover:shadow-primary-500/20 transition-all"
          >
            <Star className="w-3.5 h-3.5" /> Đánh giá chuyến đi
          </button>
        )}
        {b.canCancel && (
          <button
            onClick={() => openCancelModal(b)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-danger)] bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 px-3.5 py-2 rounded-xl hover:bg-[var(--color-danger)]/20 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Hủy đặt chỗ
          </button>
        )}
        {item && (
          <button
            onClick={() => setDetailBooking(b)}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary-500 bg-primary-500/10 border border-primary-500/20 px-3.5 py-2 rounded-xl hover:bg-primary-500/20 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> Chi tiết vé
          </button>
        )}
      </div>
    )
  }

  const depTime = (b) => {
    const d = bookingDep(b)
    if (!d) return null
    return new Date(d).toLocaleString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
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
          <button onClick={fetchBookings} className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md">
            <Search className="w-4 h-4" /> Tìm kiếm
          </button>
        </div>
      </SearchForm>

      {notice && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className={`mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm ${
            notice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
              : 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/20 text-[var(--color-danger)]'
          }`}
        >
          {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {notice.text}
        </motion.div>
      )}

      {loading && <SkeletonList count={3} height="h-28" />}

      {!loading && bookings.length === 0 && (
        <EmptyState icon={Ticket} title="Chưa có đặt chỗ nào" desc="Sau khi đặt vé, thông tin sẽ hiển thị tại đây" />
      )}

      <motion.div {...stagger} className="space-y-3">
        {bookings.map(b => (
          <motion.div key={b.id} variants={cardVariant}
            className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-4 md:p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                  <span className="font-semibold text-[var(--color-text-primary)] text-lg">Đặt chỗ #{b.id}</span>
                  {renderStatusBadge(b)}
                  {b.status === 'Cancelled' && (b.refundAmount ?? 0) > 0 && (
                    <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      Đã hoàn {formatCurrencyVnd(b.refundAmount)}
                    </span>
                  )}
                </div>
                <div className="text-sm text-[var(--color-text-secondary)] flex flex-wrap items-center gap-x-3 gap-y-1">
                  {renderTypeLine(b)}
                  {renderRoute(b)}
                </div>
                {bookingClass(b) && (
                  <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
                    Hạng: {bookingClass(b)}
                  </div>
                )}
                <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> Đặt lúc {new Date(b.bookingDate).toLocaleDateString('vi-VN')}</span>
                  {depTime(b) && <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Khởi hành {depTime(b)}</span>}
                </div>
              </div>
              <div className="flex flex-col items-start lg:items-end gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-1.5 text-2xl font-bold text-primary-500">
                  <CreditCard className="w-4 h-4" />
                  {formatCurrencyVnd(b.totalPrice)}
                </div>
                {renderActions(b)}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {total > 10 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: Math.ceil(total / 10) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-xl text-sm font-semibold border transition-all ${
                page === p
                  ? 'bg-primary-500 text-white border-primary-500 shadow-md shadow-primary-500/20'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-primary-500/50'
              }`}
            >{p}</button>
          ))}
        </div>
      )}

      {/* Modal hủy đặt chỗ — hiển thị chính xác khoản hoàn theo chính sách đã xem trong chi tiết vé */}
      <AnimatePresence>
        {cancelBookingState && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { if (!cancelling) setCancelBookingState(null) }}
          >
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-danger)]/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[var(--color-danger)]/10 flex items-center justify-center text-[var(--color-danger)]">
                    <RotateCcw className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-text-primary)]">Hủy đặt chỗ #{cancelBookingState.booking.id}</h3>
                    <p className="text-[11px] text-[var(--color-text-tertiary)]">Hoàn tiền theo đúng chính sách trong chi tiết vé</p>
                  </div>
                </div>
                <button onClick={() => setCancelBookingState(null)} disabled={cancelling}
                  className="w-8 h-8 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                ><X className="w-4 h-4" /></button>
              </div>

              <div className="p-5 space-y-4">
                {cancelBookingState.loading ? (
                  <div className="flex flex-col items-center py-8 gap-3">
                    <Loader className="w-8 h-8 animate-spin text-primary-500" />
                    <p className="text-sm text-[var(--color-text-secondary)]">Đang kiểm tra chính sách hoàn đổi...</p>
                  </div>
                ) : cancelBookingState.info ? (
                  <>
                    <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
                      <Shield className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                      <div className="text-sm text-[var(--color-text-secondary)]">
                        Chính sách <span className="font-bold text-[var(--color-text-primary)]">Hủy chuyến</span> của vé này:
                        <span className="block mt-1 text-sm font-bold text-[var(--color-text-primary)]">{cancelBookingState.info.policyLabel}</span>
                      </div>
                    </div>

                    {cancelBookingState.info.hoursToDeparture != null && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--color-text-secondary)]">Còn lại trước giờ khởi hành</span>
                        <span className="font-bold text-[var(--color-text-primary)]">
                          {cancelBookingState.info.hoursToDeparture >= 1
                            ? `${cancelBookingState.info.hoursToDeparture} giờ`
                            : `${Math.round(cancelBookingState.info.hoursToDeparture * 60)} phút`}
                        </span>
                      </div>
                    )}

                    <div className="rounded-xl border border-primary-500/20 bg-primary-500/5 p-4">
                      <div className="text-xs text-[var(--color-text-tertiary)] mb-1">Số tiền hoàn trả khi hủy</div>
                      <div className="text-3xl font-black text-primary-500">
                        {formatCurrencyVnd(cancelBookingState.info.refundAmount)}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-tertiary)] mt-1">
                        {cancelBookingState.info.refundPercent}% của {formatCurrencyVnd(cancelBookingState.info.totalPrice)}
                        {cancelBookingState.info.discountAmount > 0 && ` (đã trừ giảm giá ${formatCurrencyVnd(cancelBookingState.info.discountAmount)})`}
                      </div>
                    </div>

                    {cancelBookingState.info.refundAmount === 0 && (
                      <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 text-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        Vé này thuộc hạng <b>không được hoàn tiền</b> khi hủy theo chính sách đã hiển thị khi đặt vé.
                      </div>
                    )}

                    <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs text-[var(--color-text-tertiary)]">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--color-text-tertiary)]" />
                      Việc hủy là không thể hoàn tác. Số tiền hoàn trả được tính tự động theo đúng chính sách bạn đã xem trong mục "Chi tiết vé".
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[var(--color-danger)]">Không tải được thông tin hoàn tiền. Vui lòng thử lại.</p>
                )}
              </div>

              <div className="px-5 py-4 border-t border-[var(--color-border)] flex gap-3">
                <button onClick={() => setCancelBookingState(null)} disabled={cancelling}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition-colors"
                >Giữ đặt chỗ</button>
                <button onClick={confirmCancel} disabled={cancelling || cancelBookingState.loading || !cancelBookingState.info}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--color-danger)] text-white text-sm font-bold hover:bg-[var(--color-danger)]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cancelling ? <><Loader className="w-4 h-4 animate-spin" /> Đang hủy...</> : 'Xác nhận hủy'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal đánh giá chuyến đi (sau khi đã qua giờ khởi hành) */}
      <AnimatePresence>
        {reviewBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setReviewBooking(null)}
          >
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] sticky top-0 z-10 bg-[var(--color-bg-card)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
                    <Star className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-text-primary)]">Đánh giá chuyến đi #{reviewBooking.id}</h3>
                    <p className="text-[11px] text-[var(--color-text-tertiary)]">Chia sẻ trải nghiệm của bạn với cộng đồng</p>
                  </div>
                </div>
                <button onClick={() => setReviewBooking(null)}
                  className="w-8 h-8 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                ><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5">
                <ReviewSection
                  flightId={reviewBooking.flightId || null}
                  trainId={reviewBooking.trainId || null}
                  busId={reviewBooking.busId || null}
                  bookingId={reviewBooking.id}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal chi tiết vé (chính sách hoàn & đổi khách đã xem khi đặt) */}
      <AnimatePresence>
        {detailBooking && bookingItem(detailBooking) && (
          <TicketDetailModal
            item={bookingItem(detailBooking)}
            type={bookingType(detailBooking)}
            onClose={() => setDetailBooking(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
