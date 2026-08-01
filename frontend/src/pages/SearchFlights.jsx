import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plane, Search, CalendarDays, AlertCircle, Sparkles, Bell, Filter, Star } from 'lucide-react'
import FlightCard from '../components/FlightCard'
import TicketDetailModal from '../components/TicketDetailModal'
import PriceFilter from '../components/PriceFilter'
import BookingOptionsModal from '../components/BookingOptionsModal'

import LocationInput from '../components/LocationInput'
import { getFlights, predictPrice, createPriceAlert, getPriceAlerts } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'
import { PageHeader, SearchForm, SkeletonList, EmptyState, Pagination } from '../ui'

const PAGE_SIZE = 20

export default function SearchFlights() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
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

  const [bookingItem, setBookingItem] = useState(null)
  const [detailItem, setDetailItem] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [buyNowFilter, setBuyNowFilter] = useState(false)
  const [watchMsg, setWatchMsg] = useState('')
  const [watchedIds, setWatchedIds] = useState(new Set())
  const [ratingSummary, setRatingSummary] = useState(null)
  const [showReviewModal, setShowReviewModal] = useState(false)

  const fetchFlights = async (params, pageNum = 1, filterOverride) => {
    const f = filterOverride || filters
    setLoading(true)
    setError('')
    try {
      const res = await getFlights({ ...params, ...f, page: pageNum, pageSize: PAGE_SIZE })
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
      if (!data.outbound && query.from && query.to && data.items?.length > 0) {
        predictPrice({ from: query.from, to: query.to }).then(r => setPrediction(r.data)).catch(() => setPrediction(null))
      }
    } catch (err) {
      console.error('[SearchFlights] Error:', err.response?.data || err.message)
      setError(err.response?.data?.message || 'Không thể tải danh sách chuyến bay')
      setItems([]); setOutboundItems([]); setReturnItems([])
      setTotal(0); setOutboundTotal(0); setReturnTotal(0)
    } finally { setLoading(false) }
  }

  const searchParamsObj = useMemo(() => ({
    from: query.from, to: query.to, date: query.date,
    ...(isRoundTrip && query.returnDate ? { returnDate: query.returnDate, tripType: 'round-trip' } : {}),
  }), [isRoundTrip, query.from, query.to, query.date, query.returnDate])

  useEffect(() => {
    fetchFlights(searchParamsObj, 1, filters)
    if (query.from || query.to) setHasSearched(true)
    initialLoad.current = false
  }, [])

  useEffect(() => {
    if (initialLoad.current) return
    setPage(1); setOutboundPage(1); setReturnPage(1)
    fetchFlights(searchParamsObj, 1, filters)
  }, [filters])

  const handleSearch = () => {
    setHasSearched(true)
    setPage(1); setOutboundPage(1); setReturnPage(1)
    fetchFlights(searchParamsObj, 1, filters)
  }

  const handlePageChange = (newPage) => {
    setPage(newPage)
    fetchFlights(searchParamsObj, newPage, filters)
  }

  const handleOutboundPageChange = (newPage) => {
    setOutboundPage(newPage)
    fetchFlights(searchParamsObj, newPage, filters)
  }

  const handleReturnPageChange = (newPage) => {
    setReturnPage(newPage)
    fetchFlights(searchParamsObj, newPage, filters)
  }

  const badges = useMemo(() => {
    if (!items.length) return {}
    const b = {}
    const cheapest = items.reduce((a, b) => a.price < b.price ? a : b)
    b[cheapest.id] = 'Rẻ nhất'
    const remaining = items.filter(f => f.id !== cheapest.id)
    if (remaining.length) {
      const fastest = remaining.reduce((a, b) =>
        (new Date(a.arrivalTime) - new Date(a.departureTime)) < (new Date(b.arrivalTime) - new Date(b.departureTime)) ? a : b)
      b[fastest.id] = 'Nhanh nhất'
    }
    return b
  }, [items])

  const outboundBadges = useMemo(() => {
    if (!outboundItems.length) return {}
    const b = {}
    const cheapest = outboundItems.reduce((a, b) => a.price < b.price ? a : b)
    b[cheapest.id] = 'Rẻ nhất'
    const remaining = outboundItems.filter(f => f.id !== cheapest.id)
    if (remaining.length) {
      const fastest = remaining.reduce((a, b) =>
        (new Date(a.arrivalTime) - new Date(a.departureTime)) < (new Date(b.arrivalTime) - new Date(b.departureTime)) ? a : b)
      b[fastest.id] = 'Nhanh nhất'
    }
    return b
  }, [outboundItems])

  const returnBadges = useMemo(() => {
    if (!returnItems.length) return {}
    const b = {}
    const cheapest = returnItems.reduce((a, b) => a.price < b.price ? a : b)
    b[cheapest.id] = 'Rẻ nhất'
    const remaining = returnItems.filter(f => f.id !== cheapest.id)
    if (remaining.length) {
      const fastest = remaining.reduce((a, b) =>
        (new Date(a.arrivalTime) - new Date(a.departureTime)) < (new Date(b.arrivalTime) - new Date(b.departureTime)) ? a : b)
      b[fastest.id] = 'Nhanh nhất'
    }
    return b
  }, [returnItems])

  const filteredItems = useMemo(() => {
    if (!buyNowFilter || !prediction || prediction.recommendation !== 'buy_now') return items
    return items
  }, [items, buyNowFilter, prediction])

  const handleWatch = async (flight) => {
    const stored = (() => { try { return JSON.parse(sessionStorage.getItem('user')) } catch { return null } })()
    if (!stored?.email) { navigate('/auth?redirect=/flights'); return }
    try {
      if (watchedIds.has(flight.id)) return
      await createPriceAlert({ email: stored.email, routeFrom: flight.departureLocation, routeTo: flight.arrivalLocation, targetPrice: flight.price * 0.9 })
      setWatchedIds(prev => new Set(prev).add(flight.id))
      setWatchMsg(`Đã theo dõi giá vé ${formatCurrencyVnd(flight.price)}!`)
      setTimeout(() => setWatchMsg(''), 4000)
    } catch (err) {
      setWatchMsg(err.response?.data?.message || 'Không thể theo dõi giá')
      setTimeout(() => setWatchMsg(''), 4000)
    }
  }

  const renderFlightList = (flightList, badgeMap, emptyMsg, pred) => (
    <div className="space-y-3">
      {flightList.map((f, i) => (
        <FlightCard key={f.id} flight={f} onBook={(flight) => setBookingItem(flight)} onDetail={(flight) => setDetailItem(flight)} onWatch={handleWatch} watched={watchedIds.has(f.id)} badge={badgeMap[f.id]} index={i} prediction={pred} />
      ))}
      {!loading && flightList.length === 0 && hasSearched && (
        <EmptyState icon={Plane} title={emptyMsg} desc="Thử thay đổi điểm đi, điểm đến hoặc ngày khởi hành" />
      )}
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
      className="max-w-7xl mx-auto px-4 py-6 md:py-8"
    >
      <PageHeader icon={Plane} title={isRoundTrip ? 'Tìm chuyến bay khứ hồi' : 'Tìm chuyến bay'} />

      <SearchForm>
        <div className="flex items-end gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Điểm đi</label>
            <LocationInput
              placeholder="Từ (VD: HAN)"
              value={query.from}
              onChange={v => setQuery({ ...query, from: v })}
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-1.5">Điểm đến</label>
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
        <PriceFilter type="flight" onChange={setFilters} />
        <div className="flex items-center gap-2">
          {prediction && prediction.confidence > 0.3 && !isRoundTrip && (
            <button onClick={() => setBuyNowFilter(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                buyNowFilter
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : 'border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Chỉ vé nên mua
            </button>
          )}
        </div>
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
          {renderFlightList(outboundItems, outboundBadges, 'Không tìm thấy chuyến đi', null)}
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
          {renderFlightList(returnItems, returnBadges, 'Không tìm thấy chuyến về', null)}
          {!loading && returnTotal > PAGE_SIZE && (
            <Pagination page={returnPage} total={returnTotal} pageSize={PAGE_SIZE} onChange={handleReturnPageChange} />
          )}
        </>
      )}

      {!loading && !isRoundTrip && (
        <>
          {renderFlightList(filteredItems, badges, 'Không tìm thấy chuyến bay nào', prediction)}
          {!loading && items.length === 0 && !hasSearched && (
            <EmptyState icon={Plane} title="Nhập điểm đi và điểm đến để tìm chuyến bay" />
          )}
          {!loading && total > PAGE_SIZE && (
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={handlePageChange} />
          )}
        </>
      )}

      {bookingItem && (
        <BookingOptionsModal
          item={bookingItem}
          type="flight"
          onClose={() => setBookingItem(null)}
          onBookAtVe247={(flight) => {
            setBookingItem(null)
            navigate(`/booking/flight/${flight.id}`, { state: { item: flight } })
          }}
        />
      )}

      {detailItem && (
        <TicketDetailModal
          item={detailItem}
          type="flight"
          onClose={() => setDetailItem(null)}
        />
      )}
    </motion.div>
  )
}