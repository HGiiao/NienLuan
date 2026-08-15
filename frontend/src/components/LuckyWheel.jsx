import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Copy, Check, Loader, Ticket, Clock, LogIn, Sparkles, PartyPopper } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getLuckyWheelStatus, spinLuckyWheel, getLuckyWheelHistory } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'

// 8 ô trên vòng quay — ô 1 và 5 là "Giảm giá" (trúng mã), còn lại "May mắn lần sau"
const SEGMENTS = [
  { label: 'May mắn', win: false },
  { label: 'Giảm giá', win: true },
  { label: 'May mắn', win: false },
  { label: 'May mắn', win: false },
  { label: 'May mắn', win: false },
  { label: 'Giảm giá', win: true },
  { label: 'May mắn', win: false },
  { label: 'May mắn', win: false },
]
const COLORS = ['#64748b', '#2563eb', '#475569', '#64748b', '#475569', '#0ea5e9', '#64748b', '#475569']
const SEG_ANGLE = 360 / SEGMENTS.length

const gradient = `conic-gradient(${COLORS.map((c, i) => `${c} ${i * SEG_ANGLE}deg ${(i + 1) * SEG_ANGLE}deg`).join(', ')})`

function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00'
  const s = Math.floor(ms / 1000)
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return `${h}:${m}:${sec}`
}

export default function LuckyWheel() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [spinsLeft, setSpinsLeft] = useState(0)
  const [resetAt, setResetAt] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [history, setHistory] = useState([])
  const [copied, setCopied] = useState('')

  const [rotation, setRotation] = useState(0)
  const rotationRef = useRef(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('user'))
      if (stored?.email) setEmail(stored.email)
    } catch {}
  }, [])

  const loadHistory = async () => {
    if (!email) return
    try {
      const res = await getLuckyWheelHistory(email)
      setHistory(res.data || [])
    } catch {}
  }

  useEffect(() => {
    if (!email) return
    getLuckyWheelStatus(email)
      .then(r => { setSpinsLeft(r.data.spinsLeft); setResetAt(r.data.resetAt) })
      .catch(() => {})
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Hết thời gian reset → tự làm mới số lượt quay
  useEffect(() => {
    if (email && spinsLeft === 0 && resetAt && now >= new Date(resetAt)) {
      getLuckyWheelStatus(email)
        .then(r => { setSpinsLeft(r.data.spinsLeft); setResetAt(r.data.resetAt) })
        .catch(() => {})
    }
  }, [now, email, spinsLeft, resetAt])

  const msToReset = resetAt ? new Date(resetAt).getTime() - now : 0

  const spin = async () => {
    if (spinning || spinsLeft <= 0 || !email) return
    setSpinning(true)
    setError('')
    setResult(null)
    try {
      const res = await spinLuckyWheel({ email })
      const d = res.data
      const current = rotationRef.current
      // Quay thêm 5 vòng rồi dừng đúng tâm ô prizeIndex
      const delta = (360 - (d.prizeIndex * SEG_ANGLE + SEG_ANGLE / 2) - (current % 360) + 360) % 360
      const target = current + 5 * 360 + delta
      setRotation(target)
      rotationRef.current = target
      setTimeout(() => {
        setResult(d)
        setSpinning(false)
        setSpinsLeft(d.spinsLeft)
        setResetAt(d.resetAt)
        if (d.win) loadHistory()
      }, 4300)
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể quay — thử lại sau')
      setSpinning(false)
    }
  }

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(''), 2000)
    } catch {}
  }

  return (
    <section className="py-16 md:py-24 bg-[var(--color-surface-50)] border-t border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-10 md:mb-12">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-500 uppercase tracking-wider bg-primary-500/10 border border-primary-500/20 px-3 py-1.5 rounded-full mb-3">
            <Gift className="w-3.5 h-3.5" />
            Ưu đãi hôm nay
          </span>
          <h2 className="text-2xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-3">
            Vòng quay <span className="text-primary-500">may mắn</span>
          </h2>
          <p className="text-sm md:text-base text-[var(--color-text-secondary)] max-w-xl mx-auto">
            Quay để nhận mã giảm giá ngẫu nhiên — mỗi tài khoản có <strong className="text-primary-500">3 lượt quay</strong>, làm mới mỗi <strong className="text-primary-500">3 giờ</strong>
          </p>
        </div>

        {!email ? (
          <div className="max-w-md mx-auto text-center bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-8 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-7 h-7 text-primary-500" />
            </div>
            <h3 className="font-bold text-[var(--color-text-primary)] mb-2">Đăng nhập để quay thử vận may</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">Mỗi tài khoản được quay miễn phí và nhận mã giảm giá khi trúng thưởng</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/auth?redirect=/')}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 h-[42px] rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md shadow-primary-500/20"
            >
              <LogIn className="w-4 h-4" />
              Đăng nhập / Đăng ký
            </motion.button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center max-w-4xl mx-auto">
            {/* Wheel */}
            <div className="flex flex-col items-center">
              <div className="relative w-[260px] h-[260px] md:w-[300px] md:h-[300px] select-none">
                {/* Pointer */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
                  <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-primary-500 drop-shadow" />
                </div>

                {/* Wheel body */}
                <div
                  className="absolute inset-0 rounded-full border-8 border-[var(--color-bg-card)] shadow-2xl"
                  style={{
                    background: gradient,
                    transform: `rotate(${rotation}deg)`,
                    transition: spinning ? 'transform 4.2s cubic-bezier(0.15, 0.8, 0.1, 1)' : 'none',
                  }}
                >
                  {SEGMENTS.map((seg, i) => {
                    const angle = i * SEG_ANGLE + SEG_ANGLE / 2
                    return (
                      <div key={i} className="absolute left-1/2 top-1/2" style={{ transform: `rotate(${angle}deg)` }}>
                        <div
                          className="absolute w-14 text-center text-white text-[10px] md:text-[11px] font-bold leading-tight drop-shadow"
                          style={{ transform: `translateY(-68px) rotate(${-angle}deg)`, left: -28 }}
                        >
                          {seg.label}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Center button */}
                <button
                  onClick={spin}
                  disabled={spinning || spinsLeft <= 0}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center text-primary-500 font-black text-sm tracking-wider hover:scale-105 active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed border-4 border-[var(--color-bg-card)]"
                >
                  {spinning ? <Loader className="w-6 h-6 animate-spin" /> : 'QUAY'}
                </button>
              </div>

              <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary-500/10 text-primary-500 border border-primary-500/20 px-3 py-1.5 rounded-full">
                  <Ticket className="w-3.5 h-3.5" />
                  Còn {spinsLeft} lượt quay
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)] bg-[var(--color-bg-card)] border border-[var(--color-border)] px-3 py-1.5 rounded-full">
                  <Clock className="w-3.5 h-3.5" />
                  Reset sau {formatCountdown(msToReset)}
                </span>
              </div>
            </div>

            {/* Info / Result / History */}
            <div className="space-y-4">
              {error && (
                <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <AnimatePresence mode="wait">
                {result && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`rounded-2xl border p-5 ${
                      result.win
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : 'bg-[var(--color-bg-card)] border-[var(--color-border)]'
                    }`}
                  >
                    {result.win ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <PartyPopper className="w-5 h-5 text-emerald-500" />
                          <p className="font-bold text-emerald-600">Chúc mừng! Bạn đã trúng mã giảm giá</p>
                        </div>
                        <button
                          onClick={() => copy(result.code)}
                          className="w-full flex items-center justify-between gap-3 bg-[var(--color-bg-card)] border-2 border-dashed border-emerald-400 rounded-xl px-4 py-3 mb-3 hover:bg-emerald-500/5 transition-colors"
                        >
                          <span className="font-black tracking-wider text-lg text-primary-500">{result.code}</span>
                          <span className={`flex items-center gap-1 text-xs font-semibold ${copied === result.code ? 'text-emerald-500' : 'text-[var(--color-text-tertiary)]'}`}>
                            {copied === result.code ? <><Check className="w-4 h-4" /> Đã sao chép</> : <><Copy className="w-4 h-4" /> Sao chép</>}
                          </span>
                        </button>
                        <p className="text-xs text-[var(--color-text-secondary)] mb-1">
                          {result.description || `Giảm ${result.discountPercent}% cho đơn hàng của bạn`}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-tertiary)]">
                          {result.discountPercent != null && <>Giảm {result.discountPercent}%{result.maxDiscount ? ` (tối đa ${formatCurrencyVnd(result.maxDiscount)})` : ''} • </>}
                          {result.minOrderValue ? <>Áp dụng cho đơn từ {formatCurrencyVnd(result.minOrderValue)} • </> : ''}
                          Dán mã vào ô "Mã giảm giá" khi thanh toán
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-[var(--color-text-tertiary)] shrink-0" />
                        <p className="text-sm text-[var(--color-text-secondary)]">
                          <strong className="text-[var(--color-text-primary)]">Chúc may mắn lần sau!</strong> Bạn còn {result.spinsLeft} lượt quay trong 3 giờ tới.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5">
                <h3 className="font-semibold text-[var(--color-text-primary)] text-sm mb-3 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-primary-500" />
                  Mã đã nhận ({history.length})
                </h3>
                {history.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-tertiary)]">Chưa có mã nào — hãy thử vận may ngay!</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((h, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Gift className="w-3.5 h-3.5 text-accent-500 shrink-0" />
                          <span className="font-bold text-primary-500 text-sm truncate">{h.code}</span>
                        </div>
                        <button
                          onClick={() => copy(h.code)}
                          className={`flex items-center gap-1 text-[11px] font-semibold shrink-0 ${copied === h.code ? 'text-emerald-500' : 'text-[var(--color-text-tertiary)] hover:text-primary-500'}`}
                        >
                          {copied === h.code ? <><Check className="w-3.5 h-3.5" /> Đã sao chép</> : <><Copy className="w-3.5 h-3.5" /> Sao chép</>}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
