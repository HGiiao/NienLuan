import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plane, Train, Bus, Search, ArrowRight, ArrowLeftRight,
  Calendar, MapPin,
} from 'lucide-react'
import LocationInput from './LocationInput'

const popularRoutes = [
  { from: 'HAN', to: 'SGN', fromName: 'Hà Nội', toName: 'TP. Hồ Chí Minh' },
  { from: 'SGN', to: 'HAN', fromName: 'TP. Hồ Chí Minh', toName: 'Hà Nội' },
  { from: 'HAN', to: 'DAD', fromName: 'Hà Nội', toName: 'Đà Nẵng' },
  { from: 'SGN', to: 'DAD', fromName: 'TP. Hồ Chí Minh', toName: 'Đà Nẵng' },
]

function ComparisonPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.15 } }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/15"
    >
      <div className="flex -space-x-1.5">
        <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center ring-2 ring-primary-700 shadow-sm">
          <Plane className="w-2.5 h-2.5 text-white" />
        </div>
        <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center ring-2 ring-primary-700 shadow-sm">
          <Train className="w-2.5 h-2.5 text-primary-700" />
        </div>
        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-primary-700 shadow-sm">
          <Bus className="w-2.5 h-2.5 text-white" />
        </div>
      </div>
      <span className="text-[11px] font-medium text-white/80">
        <span className="text-white font-semibold">940</span> chuyến bay · <span className="text-white font-semibold">235</span> chuyến tàu · <span className="text-white font-semibold">3.000+</span> chuyến xe khách
      </span>
    </motion.div>
  )
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

const fadeUpSpring = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 180, damping: 22 } },
}

export default function HeroSearch() {
  const dateRef = useRef(null)
  const returnDateRef = useRef(null)
  const [mode, setMode] = useState('flights')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [date, setDate] = useState('')
  const [tripType, setTripType] = useState('one-way')
  const [returnDate, setReturnDate] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSearch = () => {
    if (!from || !to || !date) return
    const prefix = mode === 'flights' ? '/flights' : mode === 'buses' ? '/buses' : '/trains'
    const params = new URLSearchParams({ from, to, date, tripType })
    if (returnDate) params.set('returnDate', returnDate)
    navigate(`${prefix}?${params}`)
  }

  const handleSwap = () => { setFrom(to); setTo(from) }

  const handleQuickRoute = (r) => {
    const prefix = mode === 'flights' ? '/flights' : mode === 'buses' ? '/buses' : '/trains'
    const params = new URLSearchParams({ from: r.from, to: r.to, date, tripType })
    if (returnDate) params.set('returnDate', returnDate)
    navigate(`${prefix}?${params}`)
  }

  return (
    <>
      <style>{`
        @keyframes routeDash {
          to { stroke-dashoffset: -200; }
        }
        .date-picker-trigger::-webkit-calendar-picker-indicator {
          display: none;
        }
      `}</style>

      <section className="relative z-20 min-h-[88vh] flex items-center">
        {/* Background image */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/NENBANNER.jpg')" }} />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/40 to-black/50" />

        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Large circles */}
          <div className="absolute -top-80 -right-60 w-[900px] h-[900px] rounded-full border border-white/10" />
          <div className="absolute -top-72 -right-52 w-[800px] h-[800px] rounded-full border border-white/[0.05]" />

          {/* Route line top right */}
          <svg className="absolute top-[15%] right-[8%] w-[280px] h-[180px] opacity-40" viewBox="0 0 280 180" fill="none">
            <path d="M10 170 Q70 30 140 90 T270 15" stroke="#F97316" strokeWidth="1.5" strokeDasharray="5 5" className="animate-[routeDash_4s_linear_infinite]" />
            <circle cx="10" cy="170" r="3" fill="#F97316" opacity="0.8" />
            <circle cx="140" cy="90" r="2" fill="white" opacity="0.5" />
            <circle cx="270" cy="15" r="3" fill="white" opacity="0.7" />
          </svg>

          {/* Route line bottom left */}
          <svg className="absolute bottom-[15%] left-[3%] w-[200px] h-[140px] opacity-40" viewBox="0 0 200 140" fill="none">
            <path d="M5 120 Q60 10 120 60 T195 20" stroke="white" strokeWidth="1" strokeDasharray="4 4" className="animate-[routeDash_5s_linear_infinite]" />
            <circle cx="5" cy="120" r="2.5" fill="white" opacity="0.6" />
            <circle cx="195" cy="20" r="2.5" fill="#F97316" opacity="0.8" />
          </svg>

          {/* Gradient glow */}
          <div className="absolute top-1/2 left-1/3 w-[600px] h-[300px] bg-gradient-to-r from-primary-500/5 via-transparent to-transparent blur-[80px] -translate-y-1/2 rotate-[-20deg]" />
        </div>

        {/* Main content */}
        <div className="relative w-full max-w-5xl mx-auto px-6 md:px-8 py-6 md:py-10">
          <motion.div initial="hidden" animate="visible" variants={containerVariants} className="text-center">
            {/* Badges */}
            <motion.div variants={fadeUpSpring} className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <ComparisonPreview />
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary-400" />
                </span>
                <span className="text-[11px] font-semibold text-primary-300">Dữ liệu thời gian thực</span>
              </div>
            </motion.div>

            {/* Heading */}
            <motion.h1 variants={fadeUpSpring}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-5"
            >
              <span className="text-white">So sánh & </span>
              <span className="relative inline-block">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-300 drop-shadow-sm">
                  đặt vé
                </span>
                <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-gradient-to-r from-primary-500 to-primary-400 rounded-full" />
              </span>
              <br />
              <span className="text-white/80">máy bay, xe khách, tàu hỏa</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p variants={fadeUpSpring}
              className="text-base md:text-lg text-white/50 max-w-xl mx-auto leading-relaxed font-medium mb-8"
            >
              Hệ thống tổng hợp dữ liệu từ nhiều nhà cung cấp, phân tích xu hướng giá theo thời gian thực
              và gợi ý chuyến đi tiết kiệm nhất cho bạn
            </motion.p>

            {/* Search card */}
            <motion.div variants={fadeUpSpring} className="max-w-4xl mx-auto text-left">
              <div className="bg-black/30 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/40 border border-white/10 relative">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary-500 to-transparent" />
                {/* Tab bar */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <div className="flex gap-1">
                    {[
                      { id: 'flights', label: 'Vé máy bay', icon: Plane },
                      { id: 'buses', label: 'Vé xe khách', icon: Bus },
                      { id: 'trains', label: 'Vé tàu hỏa', icon: Train },
                    ].map(tab => {
                      const Icon = tab.icon
                      const active = mode === tab.id
                      return (
                        <button key={tab.id} onClick={() => setMode(tab.id)}
                          className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                            active
                              ? 'text-primary-500'
                              : 'text-white/50 hover:text-white/80'
                          }`}
                        >
                          {active && (
                            <motion.div layoutId="heroTabBg"
                              className="absolute inset-0 bg-white/10 rounded-lg"
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                          <Icon className={`w-4 h-4 relative z-10 ${active ? 'text-primary-500' : 'text-white/40'}`} />
                          <span className="relative z-10">{tab.label}</span>
                          {active && (
                            <motion.div layoutId="heroTabAccent"
                              className="absolute bottom-0 left-[20%] right-[20%] h-[2.5px] bg-primary-500 rounded-full"
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5 shrink-0 h-[34px]">
                    {(['one-way', 'round-trip']).map(t => (
                      <button key={t} onClick={() => setTripType(t)}
                         className={`px-3 text-xs font-medium rounded-md border transition-all h-full flex items-center ${
                          tripType === t
                            ? 'bg-white/20 text-white shadow-sm border-white/20'
                            : 'bg-transparent text-white/40 border-transparent hover:text-white/70'
                        }`}>{t === 'one-way' ? 'Một chiều' : 'Khứ hồi'}</button>
                    ))}
                  </div>
                </div>

                {/* Search form */}
                <div className="px-5 pb-5">
                  <div className="flex items-end gap-3">
                    {/* Điểm đi */}
                    <motion.div layout className="flex-1 min-w-0">
                        <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1">Điểm đi</label>
                      <LocationInput variant="hero" icon={MapPin} placeholder="Hà Nội (HAN)" value={from} onChange={setFrom} />
                    </motion.div>

                    {/* Swap */}
                    <motion.div layout className="shrink-0">
                      <label className="block text-[11px] text-transparent select-none mb-1">·</label>
                      <button onClick={handleSwap}
                        className="w-10 h-[40px] rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary-500 hover:border-primary-500/30 hover:bg-primary-500/10 transition-all"
                      ><ArrowLeftRight className="w-4 h-4" /></button>
                    </motion.div>

                    {/* Điểm đến */}
                    <motion.div layout className="flex-1 min-w-0">
                        <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1">Điểm đến</label>
                      <LocationInput variant="hero" icon={MapPin} placeholder="TP. Hồ Chí Minh (SGN)" value={to} onChange={setTo} />
                    </motion.div>

                    {/* Ngày đi */}
                    <motion.div layout className="flex-1 min-w-0">
                      <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1">Ngày đi</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500 cursor-pointer z-10" onClick={() => dateRef.current?.showPicker()} />
                        <input
                          ref={dateRef}
                          onClick={() => dateRef.current?.showPicker()}
                          className="date-picker-trigger w-full bg-white/20 border border-white/10 rounded-lg pl-9 pr-3 h-[40px] text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all"
                          type="date" value={date}
                          onChange={e => setDate(e.target.value)}
                        />
                      </div>
                    </motion.div>

                    {/* Ngày về - conditional render, tự động co dãn */}
                    <AnimatePresence>
                    {tripType === 'round-trip' && (
                      <motion.div layout
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        exit={{ opacity: 0, scaleX: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="flex-1 min-w-0 overflow-hidden"
                        style={{ originX: 0 }}
                      >
                        <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1">Ngày về</label>
                      <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500 cursor-pointer z-10" onClick={() => returnDateRef.current?.showPicker()} />
                        <input
                          ref={returnDateRef}
                          onClick={() => returnDateRef.current?.showPicker()}
                          className="date-picker-trigger w-full bg-white/20 border border-white/10 rounded-lg pl-9 pr-3 h-[40px] text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all"
                          type="date" value={returnDate} min={date || undefined}
                            onChange={e => setReturnDate(e.target.value)}
                          />
                        </div>
                      </motion.div>
                    )}
                    </AnimatePresence>

                    {/* CTA */}
                    <motion.div layout className="shrink-0">
                      <label className="block text-[11px] text-transparent select-none mb-1">·</label>
                        <motion.button onClick={handleSearch}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white py-[10px] px-6 rounded-lg font-bold text-sm shadow-lg shadow-primary-500/25 hover:from-primary-600 hover:to-primary-700 hover:shadow-primary-500/40 transition-all whitespace-nowrap h-[40px]"
                      >
                        <Search className="w-4 h-4" />
                        Tra cứu
                      </motion.button>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Popular routes */}
              <motion.div variants={fadeUpSpring} className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs font-medium text-white/50 mr-1">Tuyến phổ biến:</span>
                {popularRoutes.map((route, i) => (
                  <button key={i} onClick={() => handleQuickRoute(route)}
                    className="flex items-center gap-1.5 text-xs bg-white/20 border border-white/30 text-white/80 px-3 py-1.5 rounded-lg hover:bg-white/30 hover:text-white transition-all"
                  >
                    <span>{route.fromName}</span>
                    <ArrowRight className="w-2.5 h-2.5 text-white/30" />
                    <span>{route.toName}</span>
                  </button>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </>
  )
}
