import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plane, Bus, Train, Sparkles, CheckCircle2, ArrowRight, TrendingDown, Zap, Star, ShieldCheck, Clock, Flame, BadgeCheck, Headphones } from 'lucide-react'
import { VIETNAM_PATH } from './IntroAnimation'

const SCENE_DURATION = 2500
const BG = {
  logo: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1920&q=80',
  compare: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=1920&q=80',
  map: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1920&q=80',
  save: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80',
  ai: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1920&q=80',
  cta: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1920&q=80',
}
/* Đếm tiền khi chuyển cảnh */
function CountUp({ to, prefix = '', duration = 1.1, className, style }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let start
    let raf
    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / (duration * 1000), 1)
      setVal(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [to, duration])
  return <span className={className} style={style}>{prefix}{val.toLocaleString('vi-VN')}đ</span>
}

const SCENES = [
  {
    id: 'logo',
    content: (
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.15 }}
          className="flex items-center gap-5">
          <motion.div
            animate={{ rotate: [0, -3, 3, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-[9vh] h-[9vh] rounded-[2.4vh] flex items-center justify-center text-white text-[5vh] font-black"
            style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)', boxShadow: '0 3vh 6vh rgba(249,115,22,0.45)' }}>V</motion.div>
          <span className="text-[9vh] font-black tracking-tight text-white drop-shadow">Vé247</span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-[2vh] text-[4vh] font-black text-white">
          Đặt vé rẻ hơn cho mọi chuyến đi
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="mt-[1.2vh] text-[2.6vh] font-semibold text-white/75 max-w-[90vh]">
          So sánh giá từ tất cả hãng máy bay, xe khách &amp; tàu hỏa trong 1 nơi
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="flex gap-3 mt-[3vh]">
          {['Giá rẻ nhất', 'Đặt trong 60 giây'].map(t => (
            <span key={t} className="flex items-center gap-2 px-4 py-2 rounded-full text-[2.2vh] font-bold text-white border border-white/25"
              style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
              <CheckCircle2 className="text-emerald-400" style={{ width: '2.6vh', height: '2.6vh' }} />{t}
            </span>
          ))}
        </motion.div>
      </div>
    ),
  },
  {
    id: 'compare',
    content: (
      <div className="flex flex-col items-center">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[6vh] font-black text-white mb-[1vh] text-center">
          Một nơi, so sánh <span className="text-orange-400">tất cả</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-[2.4vh] font-semibold text-white/70 mb-[3.5vh]">
          6 hãng máy bay · 1.000+ tuyến xe · 36 chuyến tàu mỗi ngày
        </motion.p>
        <div className="flex gap-[3vh]">
          {[
            { Icon: Plane, label: 'Máy bay', price: '1.890.000đ', delay: 0.1, best: true },
            { Icon: Bus, label: 'Xe khách', price: '380.000đ', delay: 0.35 },
            { Icon: Train, label: 'Tàu hỏa', price: '620.000đ', delay: 0.6 },
          ].map(({ Icon, label, price, delay, best }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 40, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay, type: 'spring', stiffness: 120, damping: 14 }}
              className="relative flex flex-col items-center gap-[1.6vh] w-[22vh] py-[3vh] rounded-[2.4vh] border"
              style={{ background: 'rgba(255,255,255,0.07)', borderColor: best ? 'rgba(251,146,60,0.7)' : 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
              {best && (
                <span className="absolute -top-3 px-3 py-0.5 rounded-full text-[1.8vh] font-black text-white"
                  style={{ background: 'linear-gradient(135deg,#F97316,#FB923C)' }}>RẺ NHẤT</span>
              )}
              <div className="w-[8vh] h-[8vh] rounded-full flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.18)' }}>
                <Icon className="text-orange-400" style={{ width: '4vh', height: '4vh' }} />
              </div>
              <span className="text-[2.6vh] font-bold text-white">{label}</span>
              <span className="text-[3.2vh] font-black text-orange-400">{price}</span>
            </motion.div>
          ))}
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex items-center gap-2 mt-[3vh] text-[2.2vh] font-bold text-white/70">
          <Flame className="text-orange-400" style={{ width: '2.6vh', height: '2.6vh' }} />
          Giá cập nhật theo thời gian thực
        </motion.p>
      </div>
    ),
  },
  {
    id: 'map',
    content: (
      <div className="flex flex-col items-center">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[5.5vh] font-black text-white mb-[1vh]">
          Phủ sóng <span className="text-orange-400">63 tỉnh thành</span>
        </motion.h2>
        <motion.svg
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          viewBox="0 0 200 560" style={{ height: '34vh', filter: 'drop-shadow(0 2vh 4vh rgba(0,0,0,0.3))' }}>
          <path d={VIETNAM_PATH} fill="url(#promoLand)" stroke="#FB923C" strokeWidth="2" />
          <defs>
            <linearGradient id="promoLand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          {[
            { x: 155, y: 72, c: 'HAN' },
            { x: 120, y: 248, c: 'DAD' },
            { x: 142, y: 352, c: 'CXR' },
            { x: 120, y: 448, c: 'SGN' },
          ].map(city => (
            <g key={city.c}>
              <circle cx={city.x} cy={city.y} r="6" fill="#FFFFFF" />
              <circle cx={city.x} cy={city.y} r="3.4" fill="#F97316" />
              <animate attributeName="opacity" values="0;1" dur="0.5s" fill="freeze" />
            </g>
          ))}
          {[{ fx: 155, fy: 72, tx: 120, ty: 248 }, { fx: 120, fy: 248, tx: 120, ty: 448 }].map((r, i) => (
            <g key={i}>
              <path d={`M ${r.fx} ${r.fy} Q ${(r.fx + r.tx) / 2 + 15} ${(r.fy + r.ty) / 2 - 40} ${r.tx} ${r.ty}`} fill="none" stroke="#FB923C" strokeWidth="2.4" strokeDasharray="5 6" />
              <circle r="3" fill="#FFFFFF" stroke="#F97316" strokeWidth="1.5">
                <animateMotion dur="2.2s" repeatCount="indefinite"
                  path={`M ${r.fx} ${r.fy} Q ${(r.fx + r.tx) / 2 + 15} ${(r.fy + r.ty) / 2 - 40} ${r.tx} ${r.ty}`} />
              </circle>
            </g>
          ))}
        </motion.svg>
        <div className="flex gap-3 mt-[2vh]">
          {[['✈', '214', 'chuyến bay'], ['🚌', '3.000+', 'chuyến xe'], ['🚆', '36', 'chuyến tàu']].map(([ic, num, label], i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.15 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-white"
              style={{ background: 'rgba(255,255,255,0.08)' }}>
              <span className="text-[2.4vh]">{ic}</span>
              <span className="text-[2.4vh] font-black text-orange-400">{num}</span>
              <span className="text-[2vh] font-semibold text-white/80">{label}</span>
            </motion.div>
          ))}
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex items-center gap-2 mt-[2vh] text-[2.2vh] font-bold text-white/75">
          <Flame className="text-orange-400" style={{ width: '2.6vh', height: '2.6vh' }} />
          Cháy tuyến: Hà Nội → Đà Nẵng · TP.HCM → Nha Trang
        </motion.p>
      </div>
    ),
  },
  {
    id: 'save',
    content: (
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          className="flex items-center gap-3 px-5 py-2 rounded-full text-[2.2vh] font-black text-white"
          style={{ background: 'rgba(249,115,22,0.25)', border: '1px solid rgba(251,146,60,0.5)', backdropFilter: 'blur(8px)' }}>
          <TrendingDown style={{ width: '2.8vh', height: '2.8vh' }} className="text-orange-400" />
          TP.HCM → Đà Nẵng · Hôm nay
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 100, damping: 12, delay: 0.15 }}
          className="text-[7vh] font-black text-white mt-[2vh]">
          Tiết kiệm <span className="text-orange-400">650.000đ</span>
        </motion.h2>
        <div className="flex flex-col items-center mt-[1vh]">
          <span className="text-[3vh] font-semibold text-white/50 line-through">2.540.000đ</span>
          <CountUp to={1890000} duration={1.3}
            className="text-[6.5vh] font-black text-emerald-400 drop-shadow-[0_0_3vh_rgba(52,211,153,0.5)]" />
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-2 mt-[2.5vh] text-[2.4vh] font-bold text-white/85">
          <Clock className="text-orange-400" style={{ width: '3vh', height: '3vh' }} />
          Chỉ còn 12 vé mức giá này
        </motion.div>
      </div>
    ),
  },
  {
    id: 'ai',
    content: (
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          className="flex items-center gap-3 px-6 py-3 rounded-full border border-white/20 mb-[2.5vh]"
          style={{ background: 'rgba(255,255,255,0.08)' }}>
          <Sparkles className="text-orange-400" style={{ width: '3.6vh', height: '3.6vh' }} />
          <span className="text-[3vh] font-bold text-white">AI Vé247</span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[5vh] font-black text-white mb-[3vh] text-center">
          Gợi ý hành trình <span className="text-orange-400">tối ưu</span> cho bạn
        </motion.h2>
        {['So sánh giá theo thời gian thực', 'Cảnh báo khi giá giảm', 'Lộ trình kết hợp bay + tàu'].map((line, i) => (
          <motion.div
            key={line}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.2 }}
            className="flex items-center gap-3 mb-[1.6vh]">
            <CheckCircle2 className="text-emerald-400 shrink-0" style={{ width: '3.4vh', height: '3.4vh' }} />
            <span className="text-[2.8vh] font-semibold text-white/90">{line}</span>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="flex items-center gap-4 mt-[2.5vh] px-5 py-2.5 rounded-2xl border border-white/15"
          style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="flex text-orange-400">
            {[...Array(5)].map((_, i) => <Star key={i} style={{ width: '2.6vh', height: '2.6vh' }} fill="currentColor" />)}
          </div>
          <span className="text-[2.4vh] font-black text-white">4.9/5</span>
          <span className="text-[2.2vh] font-semibold text-white/70">· 12.000+ khách đặt mỗi tháng</span>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'cta',
    content: (
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 12 }}
          className="flex items-center gap-4 mb-[2vh]">
          <div className="w-[7vh] h-[7vh] rounded-[1.8vh] flex items-center justify-center text-white text-[3.6vh] font-black"
            style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)' }}>V</div>
          <span className="text-[5.5vh] font-black text-white">Sẵn sàng để đi?</span>
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center gap-3 px-8 py-4 rounded-full text-[3.2vh] font-black text-white"
          style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)', boxShadow: '0 2.5vh 6vh rgba(249,115,22,0.5)' }}>
          <Zap style={{ width: '3.6vh', height: '3.6vh' }} />
          ve247-booking.vercel.app
        </motion.div>
        <div className="flex gap-4 mt-[2.5vh]">
          {[
            { Icon: ShieldCheck, t: 'Thanh toán an toàn' },
            { Icon: BadgeCheck, t: 'Miễn phí hủy' },
            { Icon: Headphones, t: 'Hỗ trợ 24/7' },
          ].map(({ Icon, t }, i) => (
            <motion.div
              key={t}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.15 }}
              className="flex flex-col items-center gap-1.5 text-white/85">
              <Icon className="text-orange-400" style={{ width: '3.4vh', height: '3.4vh' }} />
              <span className="text-[2vh] font-semibold">{t}</span>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex items-center gap-2 mt-[2.5vh] text-[2.6vh] font-black text-white">
          Khám phá ngay
          <ArrowRight style={{ width: '3vh', height: '3vh' }} className="text-orange-400" />
        </motion.div>
      </div>
    ),
  },
]

export default function PromoVideo() {
  const [scene, setScene] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => setScene(s => (s + 1) % SCENES.length), SCENE_DURATION)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="fixed inset-0 z-[9998] overflow-hidden"
      style={{ background: 'linear-gradient(140deg, #0B1020 0%, #101A33 55%, #2A1A3A 100%)' }}>
      {/* ambient glows */}
      <div className="absolute -top-40 -left-40 w-[80vh] h-[80vh] rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, #F97316 0%, transparent 60%)' }} />
      <div className="absolute -bottom-40 -right-40 w-[80vh] h-[80vh] rounded-full opacity-25"
        style={{ background: 'radial-gradient(circle, #FB923C 0%, transparent 60%)' }} />

      {/* grain */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat', backgroundSize: '180px 180px',
        }} />

      {/* Logo nhỏ cố định góc trên trái */}
      <div className="absolute top-5 left-6 z-20 flex items-center gap-2">
        <div className="w-[4.5vh] h-[4.5vh] rounded-[1.2vh] flex items-center justify-center text-white text-[2.2vh] font-black"
          style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)', boxShadow: '0 1.5vh 3vh rgba(249,115,22,0.4)' }}>V</div>
        <span className="text-[2.4vh] font-black text-white drop-shadow">Vé247</span>
      </div>

      <AnimatePresence mode="popLayout">
        <motion.div
          key={scene}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55 }}
          className="absolute inset-0">
          {/* Ảnh nền như clip quảng cáo + hiệu ứng Ken Burns */}
          <motion.img
            src={BG[SCENES[scene].id]}
            alt=""
            initial={{ scale: 1.12 }}
            animate={{ scale: 1 }}
            transition={{ duration: SCENE_DURATION / 1000, ease: 'linear' }}
            className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(140deg, rgba(8,12,26,0.82) 0%, rgba(8,12,26,0.52) 45%, rgba(8,12,26,0.78) 100%)' }} />
          <div className="absolute inset-0 flex items-center justify-center px-[6vh]">
            {SCENES[scene].content}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* bottom progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[0.8vh] bg-white/5">
        <motion.div
          key={scene}
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: SCENE_DURATION / 1000, ease: 'linear' }}
          className="h-full"
          style={{ background: 'linear-gradient(90deg, #F97316, #FB923C)' }} />
      </div>
    </div>
  )
}