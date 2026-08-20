import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, Search, CalendarDays, AlertCircle, Sparkles, Bell } from 'lucide-react'
import BusCard from '../components/BusCard'
import TicketDetailModal from '../components/TicketDetailModal'
import PriceFilter from '../components/PriceFilter'
import BookingOptionsModal from '../components/BookingOptionsModal'
import PriceWatchModal from '../components/PriceWatchModal'

import LocationInput from '../components/LocationInput'
import { getBuses, createPriceAlert } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'
import { PageHeader, SearchForm, SkeletonList, EmptyState, Pagination } from '../ui'
import useRefetchOnTabVisible from '../hooks/useRefetchOnTabVisible'

const PAGE_SIZE = 20

export default function SearchBuses() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const highlightId = searchParams.get('highlight')
  const [query, setQuery] = useState({
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    date: searchParams.get('date') || '',
    returnDate: searchParams.get('returnDate') || '',
    tripType: searchParams.get('tripType') || 'one-way',
  })
  const isRoundTrip = query.tripType === 'round-trip'

  const setTripType = (type) => {
    setQuery(prev => ({
      ...prev,
      tripType: type,
      ...(type === 'one-way' ? { returnDate: '' } : {}),
    }))
  }
  const [filters, setFilters] = useState({ sortBy: 'price' })

  const [items, setItems] = useState([])
  const [outboundItems, setOutboundItems] = useState([])
  const [returnItems, setReturnItems] = useState([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [outboundTotal, setOutboundTotal] = useState(0)
  const [returnTotal, setReturnTotal] = useState(0)
  const [outboundPage, setOutboundPage] = useState(1)
  const [returnPage, setReturnPage] = useState(1)
  const initialLoad = useRef(true)
  const filterDebounceRef = useRef(null)

  const [bookingItem, setBookingItem] = useState(null)
  const [detailItem, setDetailItem] = useState(null)
  const [watchItem, setWatchItem] = useState(null)
  const [watchMsg, setWatchMsg] = useState('')
  const [watchedIds, setWatchedIds] = useState(new Set())

  const fetchBuses = async (params, pageNum = 1, filterOverride, silent = false) => {
    const f = filterOverride || filters
    if (!silent) setLoading(true)
    setError('')
    try {
      const res = await getBuses({ ...params, ...f, page: pageNum, pageSize: PAGE_SIZE })
      const data = res.data

      if (data.outbound) {
        setOutboundItems(data.outbound.items)
        setOutboundTotal(data.outbound.total)
        setOutboundPage(data.outbound.page)
        setReturnItems(data.return.items)
        setReturnTotal(data.return.total)
        setReturnPage(data.return.page)
        setItems([])
      } else {
        setItems(data.items || data)
        setTotal(data.total || 0)
        setPage(pageNum)
        setOutboundItems([]); setReturnItems([])
      }
    } catch (err) {
      console.error('[SearchBuses] Error:', err.response?.data || err.message)
      setError(err.response?.data?.message || 'Không thể tải danh sách xe khách')
      if (!silent) {
        setItems([]); setOutboundItems([]); setReturnItems([])
        setTotal(0); setOutboundTotal(0); setReturnTotal(0)
      }
    } finally { setLoading(false) }
  }

  const searchParamsObj = useMemo(() => ({
    from: query.from, to: query.to, date: query.date,
    ...(isRoundTrip && query.returnDate ? { returnDate: query.returnDate, tripType: 'round-trip' } : {}),
  }), [isRoundTrip, query.from, query.to, query.date, query.returnDate])

  useEffect(() => {
    fetchBuses(searchParamsObj, 1, filters)
    if (query.from || query.to) setHasSearched(true)
    initialLoad.current = false
  }, [])

  // Cuộn tới vé được chỉ định từ trang so sánh (highlight=id) khi danh sách đã có
  useEffect(() => {
    if (!highlightId) return
    const el = document.getElementById(`bus-card-${highlightId}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [items, outboundItems, returnItems, highlightId])

  useEffect(() => {
    if (initialLoad.current) return
    setPage(1); setOutboundPage(1); setReturnPage(1)
    // Debounce 300ms: tránh gọi API liên tục khi gõ min/max giá hoặc đổi filter nhanh
    clearTimeout(filterDebounceRef.current)
    filterDebounceRef.current = setTimeout(() => {
      fetchBuses(searchParamsObj, 1, filters)
    }, 300)
    return () => clearTimeout(filterDebounceRef.current)
  }, [filters])

  // Reload dữ liệu khi tab được mở/chuyển tới — fetch silent (không flash skeleton)
  useRefetchOnTabVisible(() => {
    if (!query.from || !query.to) return
    fetchBuses(searchParamsObj, isRoundTrip ? outboundPage : page, filters, true)
  })

  const handleSearch = () => {
    setHasSearched(true)
    setPage(1); setOutboundPage(1); setReturnPage(1)
    fetchBuses(searchParamsObj, 1, filters)
  }

  const handlePageChange = (newPage) => {
    setPage(newPage)
    fetchBuses(searchParamsObj, newPage, filters)
  }

  const handleOutboundPageChange = (newPage) => {
    setOutboundPage(newPage)
    fetchBuses(searchParamsObj, newPage, filters)
  }

  const handleReturnPageChange = (newPage) => {
    setReturnPage(newPage)
    fetchBuses(searchParamsObj, newPage, filters)
  }

  const handleWatch = (bus) => {
    const stored = (() => { try { return JSON.parse(sessionStorage.getItem('user')) } catch { return null } })()
    if (!stored?.email) { navigate('/auth?redirect=/buses'); return }
    if (watchedIds.has(bus.id)) return
    setWatchItem(bus)
  }

  const confirmWatch = async (targetPrice) => {
    if (!watchItem) return
    const stored = (() => { try { return JSON.parse(sessionStorage.getItem('user')) } catch { return null } })()
    try {
      await createPriceAlert({ email: stored.email, routeFrom: watchItem.departureLocation, routeTo: watchItem.arrivalLocation, targetPrice, itemId: watchItem.id, mode: 'bus' })
      setWatchedIds(prev => new Set(prev).add(watchItem.id))
      setWatchMsg(`Đã theo dõi — sẽ thông báo khi giá vé ≤ ${formatCurrencyVnd(targetPrice)}`)
      setTimeout(() => setWatchMsg(''), 6000)
      setWatchItem(null)
    } catch (err) {
      setWatchMsg(err.response?.data?.message || 'Không thể theo dõi giá')
      setTimeout(() => setWatchMsg(''), 4000)
    }
  }

  const stagger = { whileInView: { transition: { staggerChildren: 0.06 } }, viewport: { once: true } }
  const cardVariant = {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    viewport: { once: true },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
      className="max-w-7xl mx-auto px-4 py-6 md:py-8"
    >
      <PageHeader icon={Bus} title={isRoundTrip ? 'Tìm xe khách khứ hồi' : 'Tìm xe khách'} />

      <SearchForm>
        <div className="flex items-end gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Bến đi</label>
            <LocationInput
              placeholder="Từ (VD: HAN)"
              value={query.from}
              onChange={v => setQuery({ ...query, from: v })}
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Bến đến</label>
            <LocationInput
              placeholder="Đến (VD: SGN)"
              value={query.to}
              onChange={v => setQuery({ ...query, to: v })}
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">
              {isRoundTrip ? 'Ngày đi' : 'Ngày'}
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none" />
              <input
                className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 h-[42px] text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-colors"
                type="date"
                value={query.date}
                onChange={e => setQuery({ ...query, date: e.target.value })}
              />
            </div>
          </div>
          <AnimatePresence initial={false}>
            {isRoundTrip && (
              <motion.div
                initial={{ opacity: 0, width: 0, overflow: 'hidden' }}
                animate={{ opacity: 1, width: 'auto', overflow: 'visible' }}
                exit={{ opacity: 0, width: 0, overflow: 'hidden' }}
                transition={{ duration: 0.25 }}
                className="min-w-[150px]"
              >
                <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Ngày về</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none" />
                  <input
                    className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 h-[42px] text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-colors"
                    type="date"
                    value={query.returnDate}
                    min={query.date || undefined}
                    onChange={e => setQuery({ ...query, returnDate: e.target.value })}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div>
            <label className="block text-xs font-medium text-transparent mb-1.5 select-none">·</label>
            <div className="flex items-center gap-1 bg-[var(--color-border)]/30 rounded-lg p-0.5 h-[42px]">
              <button onClick={() => setTripType('one-way')}
                className={`px-3 text-xs font-semibold rounded-md border transition-all h-full flex items-center ${
                  query.tripType === 'one-way'
                    ? 'bg-primary-500 text-white shadow-sm border-transparent'
                    : 'bg-transparent border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                }`}>
                Một chiều
              </button>
              <button onClick={() => setTripType('round-trip')}
                className={`px-3 text-xs font-semibold rounded-md border transition-all h-full flex items-center ${
                  query.tripType === 'round-trip'
                    ? 'bg-primary-500 text-white shadow-sm border-transparent'
                    : 'bg-transparent border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                }`}>
                Khứ hồi
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-transparent mb-1.5 select-none">·</label>
            <motion.button
              onClick={handleSearch}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 h-[42px] rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md shadow-primary-500/20"
            >
              <Search className="w-4 h-4" />
              Tìm kiếm
            </motion.button>
          </div>
        </div>
      </SearchForm>

      <div className="flex items-center justify-between gap-3 mt-4 mb-4">
        <PriceFilter type="bus" onChange={setFilters} />
      </div>

      {watchMsg && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-accent-500 bg-accent-500/10 px-4 py-3 rounded-xl border border-accent-500/20 mt-4">
          <Bell className="w-4 h-4" />
          {watchMsg}
        </motion.div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-4">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={handleSearch} className="text-red-600 font-semibold hover:underline">Thử lại</button>
        </div>
      )}

      {loading && <SkeletonList count={3} />}

      {!loading && isRoundTrip && (
        <>
          <div className="mt-8 mb-1">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-500" />
              Chuyến đi — {query.from || '--'} → {query.to || '--'}
              {query.date && <span className="text-sm font-normal text-[var(--color-text-tertiary)]">· {new Date(query.date).toLocaleDateString('vi-VN')}</span>}
            </h2>
          </div>
          {loading && <SkeletonList count={3} />}
          {!loading && (
            <motion.div {...stagger} className="space-y-3">
              {outboundItems.map(b => (
                <motion.div key={b.id} id={highlightId ? `bus-card-${b.id}` : undefined} variants={cardVariant} className={highlightId === String(b.id) ? 'ring-2 ring-primary-500 rounded-2xl' : ''}>
                  <BusCard bus={b} onBook={(bus) => setBookingItem(bus)} onDetail={(bus) => setDetailItem(bus)} onWatch={handleWatch} watched={watchedIds.has(b.id)}  prediction={null} />
                </motion.div>
              ))}
              {outboundItems.length === 0 && hasSearched && (
                <EmptyState icon={Bus} title="Không tìm thấy chuyến đi" desc="Thử thay đổi điểm đi, điểm đến hoặc ngày khởi hành" />
              )}
            </motion.div>
          )}
          {!loading && outboundTotal > PAGE_SIZE && (
            <Pagination page={outboundPage} total={outboundTotal} pageSize={PAGE_SIZE} onChange={handleOutboundPageChange} />
          )}

          <div className="mt-10 mb-1">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-500" />
              Chuyến về — {query.to || '--'} → {query.from || '--'}
              {query.returnDate && <span className="text-sm font-normal text-[var(--color-text-tertiary)]">· {new Date(query.returnDate).toLocaleDateString('vi-VN')}</span>}
            </h2>
          </div>
          {!loading && (
            <motion.div {...stagger} className="space-y-3">
              {returnItems.map(b => (
                <motion.div key={b.id} id={highlightId ? `bus-card-${b.id}` : undefined} variants={cardVariant} className={highlightId === String(b.id) ? 'ring-2 ring-primary-500 rounded-2xl' : ''}>
                  <BusCard bus={b} onBook={(bus) => setBookingItem(bus)} onDetail={(bus) => setDetailItem(bus)} onWatch={handleWatch} watched={watchedIds.has(b.id)}  prediction={null} />
                </motion.div>
              ))}
              {returnItems.length === 0 && hasSearched && (
                <EmptyState icon={Bus} title="Không tìm thấy chuyến về" desc="Thử thay đổi điểm đi, điểm đến hoặc ngày khởi hành" />
              )}
            </motion.div>
          )}
          {!loading && returnTotal > PAGE_SIZE && (
            <Pagination page={returnPage} total={returnTotal} pageSize={PAGE_SIZE} onChange={handleReturnPageChange} />
          )}
        </>
      )}

      {!loading && !isRoundTrip && (
        <>
          <motion.div {...stagger} className="space-y-3">
            {items.map(b => (
              <motion.div key={b.id} id={highlightId ? `bus-card-${b.id}` : undefined} variants={cardVariant} className={highlightId === String(b.id) ? 'ring-2 ring-primary-500 rounded-2xl' : ''}>
                <BusCard bus={b} onBook={(bus) => setBookingItem(bus)} onDetail={(bus) => setDetailItem(bus)} onWatch={handleWatch} watched={watchedIds.has(b.id)}  prediction={null} />
              </motion.div>
            ))}
            {items.length === 0 && hasSearched && (
              <EmptyState icon={Bus} title="Không tìm thấy chuyến xe nào" desc="Thử thay đổi điểm đi, điểm đến hoặc ngày khởi hành" />
            )}
            {items.length === 0 && !hasSearched && (
              <EmptyState icon={Bus} title="Nhập điểm đi và điểm đến để tìm xe khách" />
            )}
          </motion.div>
          {!loading && total > PAGE_SIZE && (
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={handlePageChange} />
          )}
        </>
      )}

      {bookingItem && (
        <BookingOptionsModal
          item={bookingItem}
          type="bus"
          onClose={() => setBookingItem(null)}
          onBookAtVe247={(bus) => {
            setBookingItem(null)
            navigate(`/booking/bus/${bus.id}`, { state: { item: bus } })
          }}
        />
      )}

      {detailItem && (
        <TicketDetailModal
          item={detailItem}
          type="bus"
          onClose={() => setDetailItem(null)}
        />
      )}

      {watchItem && (
        <PriceWatchModal
          item={watchItem}
          type="bus"
          onClose={() => setWatchItem(null)}
          onConfirm={confirmWatch}
        />
      )}
    </motion.div>
  )
}
