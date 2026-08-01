
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, ArrowRight, Star, Clock, BarChart3,
  ShieldCheck, DollarSign, Zap, TrendingUp, MapPin,
  Gift, CheckCircle, Plane, Train, Bus, Award, ChevronRight,
  Calendar, Activity, BarChart4, ArrowLeftRight, Database,
  Sparkles, TrendingDown, Waves, Sun, Flower2, Leaf,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, Line, LineChart } from 'recharts'
import HeroSearch from '../components/HeroSearch'
import PromoBanner from '../components/PromoBanner'
import { formatCurrencyVnd } from '../utils/formatters'

const stats = [
  { value: '4.000+', label: 'Tổng chuyến', icon: Database, desc: 'Bay, xe khách & tàu' },
  { value: '940', label: 'Chuyến bay', icon: Plane, desc: '6 hãng hàng không' },
  { value: '3.000+', label: 'Chuyến xe khách', icon: Bus, desc: '5 nhà xe' },
  { value: '235', label: 'Chuyến tàu', icon: Train, desc: '4 tuyến chính' },
]

const features = [
  { icon: Database, title: 'Tổng hợp đa nguồn', desc: 'Thu thập dữ liệu từ tất cả hãng bay, nhà xe và đường sắt, hiển thị trên một giao diện duy nhất.', gradient: 'from-primary-500 to-primary-600' },
  { icon: ArrowLeftRight, title: 'So sánh giá real-time', desc: 'So sánh giá vé máy bay, xe khách và tàu hỏa cạnh nhau, cập nhật theo thời gian thực.', gradient: 'from-primary-500 to-primary-600' },
  { icon: TrendingUp, title: 'Phân tích xu hướng', desc: 'Biểu đồ giá theo ngày với dự báo xu hướng, giúp bạn chọn thời điểm đặt vé tốt nhất.', gradient: 'from-primary-500 to-primary-600' },
  { icon: Sparkles, title: 'Gợi ý thông minh', desc: 'Hệ thống đề xuất phương tiện tiết kiệm nhất dựa trên dữ liệu giá thực tế.', gradient: 'from-primary-500 to-primary-600' },
  { icon: Clock, title: 'Cập nhật liên tục', desc: 'Dữ liệu giá được làm mới mỗi 30 giây, đảm bảo bạn luôn có thông tin mới nhất.', gradient: 'from-primary-500 to-primary-600' },
  { icon: ShieldCheck, title: 'Miễn phí hoàn toàn', desc: 'Bạn chỉ trả tiền vé khi đặt trên website chính thức. Chúng tôi không thu phí.', gradient: 'from-primary-500 to-primary-600' },
]

const trendData = [
  { day: 'T2', price: 1520000, flight: 1520000, train: 980000 },
  { day: 'T3', price: 1480000, flight: 1480000, train: 950000 },
  { day: 'T4', price: 1350000, flight: 1350000, train: 920000 },
  { day: 'T5', price: 1280000, flight: 1280000, train: 890000 },
  { day: 'T6', price: 1320000, flight: 1320000, train: 910000 },
  { day: 'T7', price: 1450000, flight: 1450000, train: 960000 },
  { day: 'CN', price: 1380000, flight: 1380000, train: 940000 },
]

const liveComparison = [
  { route: 'HAN → SGN', flight: 1170000, train: 890000, diff: 'Máy bay đắt hơn 31%' },
  { route: 'HAN → DAD', flight: 650000, train: 480000, diff: 'Máy bay đắt hơn 35%' },
  { route: 'SGN → DAD', flight: 780000, train: 520000, diff: 'Máy bay đắt hơn 50%' },
  { route: 'HAN → CXR', flight: 890000, train: 610000, diff: 'Tàu hỏa tiết kiệm 31%' },
]

const steps = [
  { step: 1, title: 'Nhập thông tin', desc: 'Chọn điểm đi, điểm đến và ngày khởi hành.', icon: Search, gradient: 'from-primary-500 to-primary-600' },
  { step: 2, title: 'Hệ thống tổng hợp', desc: 'Dữ liệu từ các nhà cung cấp được thu thập và phân tích.', icon: Database, gradient: 'from-primary-500 to-primary-600' },
  { step: 3, title: 'So sánh & gợi ý', desc: 'Xem giá vé máy bay, xe khách, tàu hỏa cạnh nhau với gợi ý tiết kiệm.', icon: BarChart4, gradient: 'from-primary-500 to-primary-600' },
  { step: 4, title: 'Đặt vé', desc: 'Chuyển đến website chính thức để hoàn tất đặt vé an toàn.', icon: ArrowRight, gradient: 'from-primary-500 to-primary-600' },
]

const getSeasonalData = () => {
  const month = new Date().getMonth() + 1
  if (month >= 4 && month <= 8) return {
    label: 'Mùa biển',
    icon: Waves,
    items: [
      { name: 'Nha Trang', code: 'CXR', reason: 'Biển xanh, lặn san hô', gradient: 'from-cyan-500 to-blue-500', price: 890000, image: 'https://tse3.mm.bing.net/th/id/OIP.lmOSh4__DVScQiGPX_z8gAHaE7?r=0&rs=1&pid=ImgDetMain&o=7&rm=3' },
      { name: 'Phú Quốc', code: 'PQC', reason: 'Biển hoang sơ, sunset đẹp', gradient: 'from-amber-400 to-orange-500', price: 1450000, image: 'https://anhdephd.vn/wp-content/uploads/2022/05/anh-dao-phu-quoc-voi-thuyen-du-lich.jpg' },
      { name: 'Đà Nẵng', code: 'DAD', reason: 'Biển Mỹ Khê, Bà Nà Hills', gradient: 'from-teal-400 to-emerald-500', price: 650000, image: 'https://cdn3.ivivu.com/2022/09/c%E1%BA%A7u-r%E1%BB%93ng-%C4%91%C3%A0-n%E1%BA%B5ng-ivivu-4.jpg' },
      { name: 'Quy Nhơn', code: 'UIH', reason: 'Biển ít người, giá rẻ', gradient: 'from-sky-400 to-blue-500', price: 520000, image: 'https://bloganchoi.com/wp-content/uploads/2023/05/quy-nhon.jpg' },
    ]
  }
  if (month >= 10 || month <= 2) return {
    label: 'Tránh rét',
    icon: Sun,
    items: [
      { name: 'TP. Hồ Chí Minh', code: 'SGN', reason: 'Nắng ấm quanh năm', gradient: 'from-orange-400 to-red-500', price: 1170000 },
      { name: 'Phú Quốc', code: 'PQC', reason: 'Nắng đẹp, ít mưa', gradient: 'from-amber-400 to-orange-500', price: 1450000 },
      { name: 'Cần Thơ', code: 'VCA', reason: 'Chợ nổi mùa nước nổi', gradient: 'from-green-400 to-emerald-500', price: 680000 },
      { name: 'Nha Trang', code: 'CXR', reason: 'Biển nắng, ít gió', gradient: 'from-cyan-400 to-blue-500', price: 890000 },
    ]
  }
  if (month >= 3 && month <= 4) return {
    label: 'Miền Trung',
    icon: Flower2,
    items: [
      { name: 'Huế', code: 'HUI', reason: 'Festival Huế, hoa lemoine', gradient: 'from-purple-400 to-pink-500', price: 720000 },
      { name: 'Đà Nẵng', code: 'DAD', reason: 'Festival hoa, thời tiết đẹp', gradient: 'from-teal-400 to-emerald-500', price: 650000 },
      { name: 'Hà Nội', code: 'HAN', reason: 'Hoa sưa, hoa ban nở', gradient: 'from-pink-300 to-rose-400', price: 1300000 },
      { name: 'Nha Trang', code: 'CXR', reason: 'Biển lặng, ít mưa', gradient: 'from-cyan-400 to-blue-500', price: 890000 },
    ]
  }
  return {
    label: 'Mùa vàng',
    icon: Leaf,
    items: [
      { name: 'Hà Nội', code: 'HAN', reason: 'Cốm Làng Vòng, thu Hà Nội', gradient: 'from-amber-400 to-yellow-500', price: 1300000 },
      { name: 'Đà Nẵng', code: 'DAD', reason: 'Biển đẹp, ít khách', gradient: 'from-teal-400 to-emerald-500', price: 650000 },
      { name: 'Hải Phòng', code: 'HPH', reason: 'Đồ biển tươi, giá rẻ', gradient: 'from-blue-400 to-indigo-500', price: 580000 },
      { name: 'Vinh', code: 'VII', reason: 'Cửa Lò seafood', gradient: 'from-orange-300 to-amber-400', price: 490000 },
    ]
  }
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function Home() {
  const navigate = useNavigate()

  return (
    <div>
      <HeroSearch />

      {/* Stats Bar */}
      <section className="py-10 md:py-14 border-b border-[var(--color-border)] bg-[var(--color-surface-50)]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-6 justify-center">
            <Database className="w-4 h-4 text-primary-500" />
            <span className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
              Dữ liệu tổng hợp từ 8+ nhà cung cấp
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {stats.map((s, i) => {
              const Icon = s.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="text-center py-3 md:py-4 px-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:shadow-md transition-all"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center mx-auto mb-2.5">
                    <Icon className="w-5 h-5 text-primary-500" />
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] mb-0.5">{s.value}</p>
                  <p className="text-xs md:text-sm text-[var(--color-text-secondary)]">{s.label}</p>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">{s.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Live Comparison Preview */}
      <section className="py-14 md:py-20 border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-semibold text-primary-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
                </span>
                So sánh thời gian thực
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)]">Giá vé hôm nay</h2>
            </div>
            <Link
              to="/compare"
              className="flex items-center gap-1.5 text-sm font-semibold text-primary-500 hover:text-primary-600 transition-colors group"
            >
              Xem tất cả so sánh
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart4 className="w-4 h-4 text-primary-500" />
                <span className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Máy bay vs Tàu hỏa
                </span>
              </div>
              <div className="space-y-2.5">
                {liveComparison.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-[var(--color-surface-50)] hover:bg-[var(--color-border)]/30 transition-colors">
                    <span className="text-sm font-semibold text-[var(--color-text-primary)] min-w-[100px]">{item.route}</span>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <Plane className="w-3 h-3 text-primary-400" />
                        <span className="font-semibold text-[var(--color-text-primary)]">{formatCurrencyVnd(item.flight)}</span>
                      </span>
                      <span className="text-[var(--color-text-tertiary)]">vs</span>
                      <span className="flex items-center gap-1">
                        <Train className="w-3 h-3 text-primary-400" />
                        <span className="font-semibold text-[var(--color-text-primary)]">{formatCurrencyVnd(item.train)}</span>
                      </span>
                      <span className="text-[11px] font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                        {item.diff}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary-500" />
                  <span className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
                    Xu hướng giá 7 ngày
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-2 rounded-full bg-primary-500 inline-block" />
                    <span className="text-[var(--color-text-tertiary)]">Bay</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] ml-2">
                    <span className="w-2 h-2 rounded-full bg-primary-500 inline-block" />
                    <span className="text-[var(--color-text-tertiary)]">Tàu</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                    formatter={(value) => formatCurrencyVnd(value)}
                  />
                  <Line type="monotone" dataKey="flight" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="train" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-2 inline-block">Nền tảng tổng hợp</span>
            <h2 className="text-2xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-3">
              Tại sao chọn <span className="text-primary-500">Vé247</span>?
            </h2>
            <p className="text-sm md:text-base text-[var(--color-text-secondary)] max-w-xl mx-auto">
              Hệ thống tổng hợp dữ liệu vé máy bay, xe khách và tàu hỏa, phân tích thời gian thực, gợi ý tiết kiệm
            </p>
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className="group bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 md:p-7 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--color-border)]/30 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white shadow-md mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-base md:text-lg text-[var(--color-text-primary)] mb-2">{f.title}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{f.desc}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24 bg-[var(--color-surface-50)] border-t border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-2 inline-block">Cách hoạt động</span>
            <h2 className="text-2xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-3">
              Tìm vé trong <span className="text-primary-500">4 bước</span>
            </h2>
            <p className="text-sm md:text-base text-[var(--color-text-secondary)] max-w-xl mx-auto">
              Hệ thống tự động tổng hợp và so sánh dữ liệu từ nhiều nhà cung cấp
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {steps.map((s, i) => {
              const Icon = s.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="text-center relative"
                >
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[60%] right-[-20%] h-px bg-gradient-to-r from-primary-300 to-primary-300" />
                  )}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-lg mx-auto mb-4 relative`}>
                    <Icon className="w-6 h-6" />
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--color-bg-card)] border-2 border-primary-500 text-primary-500 text-[11px] font-bold flex items-center justify-center shadow-sm">
                      {s.step}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm md:text-base text-[var(--color-text-primary)] mb-1">{s.title}</h3>
                  <p className="text-xs md:text-sm text-[var(--color-text-secondary)] leading-relaxed">{s.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <PromoBanner />

      {/* Seasonal Destinations — Hero + Small Cards */}
      {(() => {
        const season = getSeasonalData()
        const SeasonIcon = season.icon
        const hero = season.items[0]
        const others = season.items.slice(1)
        return (
          <section className="py-10 md:py-14">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs font-semibold text-primary-500 uppercase tracking-wider">Khám phá</span>
                  <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Điểm đến theo mùa</h2>
                </div>
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-500 border border-primary-500/20">{season.label}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hero card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="group cursor-pointer rounded-2xl overflow-hidden border border-[var(--color-border)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  onClick={() => navigate(`/flights?from=SGN&to=${hero.code}`)}
                >
                  <div className="relative h-64 md:h-full md:min-h-[340px] p-6 md:p-8 flex flex-col justify-between overflow-hidden">
                    <img src={hero.image} alt={hero.name} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.classList.add(hero.gradient.split(' ')[0], hero.gradient.split(' ')[1]); }} />
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10" />
                    <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full bg-white/5" />
                    <div className="relative z-10 flex items-center justify-between">
                      <SeasonIcon className="w-8 h-8 text-white/70" />
                      <span className="text-white/80 text-xs font-bold bg-white/20 px-3 py-1 rounded-full">{hero.code}</span>
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-white font-bold text-3xl md:text-4xl leading-tight mb-2">{hero.name}</h3>
                      <p className="text-white/70 text-sm mb-4">{hero.reason}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-white/60 text-xs">Từ</span>
                        <span className="text-white text-2xl font-black">{formatCurrencyVnd(hero.price)}</span>
                      </div>
                    </div>
                    <div className="relative z-10 mt-4">
                      <span className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                        Tìm kiếm <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </motion.div>
                {/* Small cards */}
                <div className="grid grid-cols-3 md:grid-cols-1 gap-3 md:gap-4">
                  {others.map((d, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: (i + 1) * 0.1 }}
                      className="group cursor-pointer rounded-2xl overflow-hidden border border-[var(--color-border)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                      onClick={() => navigate(`/flights?from=SGN&to=${d.code}`)}
                    >
                      <div className="relative h-full md:h-[108px] p-3 md:p-4 flex flex-col justify-between overflow-hidden">
                        <img src={d.image} alt={d.name} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.classList.add(d.gradient.split(' ')[0], d.gradient.split(' ')[1]); }} />
                        <div className="absolute inset-0 bg-black/30" />
                        <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
                        <div className="flex items-center justify-between relative z-10">
                          <SeasonIcon className="w-4 h-4 md:w-5 md:h-5 text-white/70" />
                          <span className="text-white/80 text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">{d.code}</span>
                        </div>
                        <div className="relative z-10">
                          <h4 className="text-white font-bold text-sm md:text-base">{d.name}</h4>
                          <p className="text-white/60 text-[10px] md:text-[11px]">{d.reason}</p>
                          <span className="text-white/80 text-xs font-bold mt-1 inline-block">{formatCurrencyVnd(d.price)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )
      })()}
    </div>
  )
}
