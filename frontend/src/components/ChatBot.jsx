import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle, X, Send, Plane, Bus, Train, Sparkles, ChevronRight, Bot,
} from 'lucide-react'
import { chatRecommend } from '../services/api'
import { formatCurrencyVnd } from '../utils/formatters'

const modeIcon = {
  flight: <Plane className="w-4 h-4" />,
  bus: <Bus className="w-4 h-4" />,
  train: <Train className="w-4 h-4" />,
}

const modeColor = {
  flight: 'bg-primary-500/10 text-primary-500',
  bus: 'bg-primary-500/10 text-primary-500',
  train: 'bg-primary-500/10 text-primary-500',
}

function fmtDuration(ts) {
  const h = Math.floor(ts / 3600000)
  const m = Math.round((ts % 3600000) / 60000)
  if (h <= 0) return `~${m}p`
  return `~${h}h${m > 0 ? ` ${m}p` : ''}`
}

let msgId = 0

export default function ChatBot() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState(false)
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (open && !initialized.current) {
      initialized.current = true
      pushUserAndAsk('')
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, typing, open])

  const pushBot = (data, extra = {}) => {
    setMessages(prev => [
      ...prev,
      { id: ++msgId, role: 'bot', text: data.reply || '', options: data.options || [], quickReplies: data.quickReplies || [], ...extra },
    ])
  }

  const ask = async (text) => {
    setTyping(true)
    try {
      const res = await chatRecommend({ message: text })
      pushBot(res.data)
    } catch {
      pushBot({ reply: 'Mình gặp lỗi kết nối. Bạn thử lại sau nhé! 🙏' })
    } finally {
      setTyping(false)
    }
  }

  const pushUserAndAsk = (text) => {
    if (text) setMessages(prev => [...prev, { id: ++msgId, role: 'user', text }])
    ask(text)
  }

  const handleSend = (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    pushUserAndAsk(text)
  }

  const handleOption = (opt) => {
    navigate(opt.nav)
    setOpen(false)
  }

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 300, damping: 20 }}
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-xl shadow-primary-500/30 hover:scale-105 hover:shadow-primary-500/50 active:scale-95 transition-all flex items-center justify-center"
        aria-label="Trợ lý Vé247"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="fixed bottom-24 right-5 z-40 w-[min(24rem,calc(100vw-2rem))] h-[min(34rem,calc(100vh-10rem))] flex flex-col rounded-3xl bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white shrink-0">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-tight">Trợ lý Vé247</p>
                <p className="text-[11px] text-white/80 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Gợi ý phương tiện phù hợp cho bạn
                </p>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full bg-white/20 font-semibold">AI</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3 bg-[var(--color-bg)]">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${m.role === 'user' ? '' : 'w-full'}`}>
                    {m.role === 'user' ? (
                      <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-md shadow-sm whitespace-pre-line">
                        {m.text}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm px-4 py-3 rounded-2xl rounded-bl-md shadow-sm whitespace-pre-line">
                          {m.text}
                        </div>

                        {/* Option cards */}
                        {m.options?.length > 0 && (
                          <div className="space-y-2">
                            {m.options.map((opt, i) => (
                              <motion.button
                                key={opt.mode}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 + i * 0.08 }}
                                onClick={() => handleOption(opt)}
                                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-primary-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all text-left group"
                              >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${modeColor[opt.mode]}`}>
                                  {modeIcon[opt.mode]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-[var(--color-text-primary)]">{opt.label}</p>
                                  <p className="text-[11px] text-[var(--color-text-tertiary)]">
                                    {opt.count} chuyến · {fmtDuration((opt.minDurationMinutes || 0) * 60000)}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-black text-primary-500">{formatCurrencyVnd(opt.minPrice)}</p>
                                  <p className="text-[10px] text-[var(--color-text-tertiary)] group-hover:text-primary-500 transition-colors flex items-center gap-0.5 justify-end">
                                    Xem ngay <ChevronRight className="w-3 h-3" />
                                  </p>
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        )}

                        {/* Quick replies */}
                        {m.quickReplies?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {m.quickReplies.map(qr => (
                              <button
                                key={qr}
                                onClick={() => pushUserAndAsk(qr)}
                                className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-primary-500/30 bg-primary-500/5 text-primary-500 hover:bg-primary-500/10 hover:border-primary-500 transition-all"
                              >
                                {qr}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {typing && (
                <div className="flex justify-start">
                  <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] px-4 py-3 rounded-2xl rounded-bl-md shadow-sm flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="shrink-0 p-3 border-t border-[var(--color-border)] bg-[var(--color-bg-card)]">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="VD: Tôi muốn đi Hà Nội - Đà Nẵng ngày mai..."
                  className="flex-1 min-w-0 border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none bg-[var(--color-bg)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || typing}
                  className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white flex items-center justify-center hover:shadow-md hover:shadow-primary-500/30 disabled:opacity-40 transition-all shrink-0"
                  aria-label="Gửi"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
