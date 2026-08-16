import { useState } from 'react'
import { motion } from 'framer-motion'
import { Megaphone, Send, CheckCircle2, AlertCircle, Link2, Bell, Sparkles, BadgePercent, Wrench } from 'lucide-react'
import { useAdmin } from '../AdminContext'
import { broadcastNotification } from '../../services/api'

const typeOptions = [
  { value: 'announcement', label: 'Thông báo chung', desc: 'Khuyến mãi, tính năng mới...', icon: Sparkles },
  { value: 'promo', label: 'Khuyến mãi', desc: 'Giảm giá, sự kiện đặc biệt', icon: BadgePercent },
  { value: 'maintenance', label: 'Bảo trì', desc: 'Bảo trì hệ thống, tạm ngừng dịch vụ', icon: Wrench },
]

export default function NotificationsPage() {
  const { toast } = useAdmin()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [type, setType] = useState('announcement')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('Vui lòng nhập tiêu đề thông báo'); return }
    setError('')
    setSending(true)
    setResult(null)
    try {
      const res = await broadcastNotification({ title: title.trim(), message: message.trim(), link: link.trim() || null, type })
      setResult(res.data)
      toast(res.data?.message || 'Đã gửi thông báo', 'success')
      setTitle(''); setMessage(''); setLink('')
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi thông báo')
    } finally { setSending(false) }
  }

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
  const labelCls = "block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase mb-1.5"

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div>
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Gửi thông báo cho khách hàng</h2>
        <p className="text-sm text-[var(--color-text-tertiary)] mt-0.5">Thông báo sẽ xuất hiện trong chuông thông báo của tất cả người dùng đã đăng ký</p>
      </div>

      <div className="mt-6 grid lg:grid-cols-5 gap-6 items-start">
      <form onSubmit={handleSubmit} className="lg:col-span-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
        <div>
          <label className={labelCls}>Loại thông báo</label>
          <div className="grid sm:grid-cols-3 gap-2">
            {typeOptions.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  type === t.value
                    ? 'border-primary-500 bg-primary-500/5'
                    : 'border-[var(--color-border)] hover:border-primary-500/30'
                }`}
              >
                <p className={`text-sm font-bold ${type === t.value ? 'text-primary-500' : 'text-[var(--color-text-primary)]'}`}>{t.label}</p>
                <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Tiêu đề</label>
          <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Khuyến mãi hè — giảm 20% mọi chuyến bay" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Nội dung</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Ví dụ: Áp dụng từ hôm nay đến hết tháng, nhập mã SUMMER20 khi thanh toán..." className={`${inputCls} resize-none`} />
        </div>

        <div>
          <label className={labelCls}>Đường dẫn (tùy chọn — bấm thông báo sẽ mở trang này)</label>
          <div className="relative">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input value={link} onChange={e => setLink(e.target.value)} placeholder="/flights hoặc /compare" className={`${inputCls} pl-10`} />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20">
            <AlertCircle className="w-4 h-4 text-[var(--color-danger)] shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--color-danger)]">{error}</p>
          </div>
        )}

        {result && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--color-success)]/10 border border-[var(--color-success)]/20">
            <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--color-success)] font-medium">{result.message}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={sending}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:shadow-lg hover:shadow-primary-500/20 transition-all shadow-md disabled:opacity-60"
        >
          {sending ? <Send className="w-4 h-4 animate-pulse" /> : <Megaphone className="w-4 h-4" />}
          {sending ? 'Đang gửi...' : 'Gửi cho tất cả khách hàng'}
        </button>

        <p className="text-[11px] text-[var(--color-text-tertiary)] flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Thông báo sẽ được gửi đến email của từng người dùng đã đăng ký. Kiểm tra kỹ nội dung trước khi gửi — không thể thu hồi.
        </p>
      </form>

      {/* Xem trước — lấp khoảng trống bên phải + kiểm tra nội dung trước khi gửi */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Xem trước</h3>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0">
              {(() => {
                const Icon = typeOptions.find(t => t.value === type)?.icon || Sparkles
                return <Icon className="w-5 h-5 text-primary-500" />
              })()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[var(--color-text-primary)] leading-snug">
                {title.trim() || 'Tiêu đề thông báo của bạn'}
              </p>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-1 leading-relaxed line-clamp-3">
                {message.trim() || 'Nội dung thông báo sẽ hiển thị ở đây.'}
              </p>
              {link.trim() && (
                <p className="text-[10px] text-primary-500 font-medium mt-1.5 break-all">{link.trim()}</p>
              )}
              <p className="text-[10px] text-[var(--color-text-tertiary)] mt-2">
                {new Date().toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })} • Chưa đọc
              </p>
            </div>
          </div>

          <p className="text-[11px] text-[var(--color-text-tertiary)] mt-3 leading-relaxed">
            Đây là cách thông báo xuất hiện trong chuông của khách hàng. Gõ tiêu đề và nội dung để xem trước trực tiếp.
          </p>
        </div>

        <div className="bg-primary-500/5 border border-primary-500/15 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-500" />
            Mẹo viết thông báo hiệu quả
          </h3>
          <ul className="space-y-2.5">
            {[
              'Tiêu đề ngắn gọn dưới 60 ký tự, nêu rõ lợi ích (VD: “Giảm 20% mọi chuyến bay”).',
              'Nội dung 2–3 câu: ưu đãi là gì, áp dụng khi nào, mã giảm giá (nếu có).',
              'Luôn kèm đường dẫn để khách bấm vào xem ngay (VD: /flights).',
              'Chọn đúng loại để khách dễ nhận biết — đừng lạm dụng gửi quá nhiều trong ngày.',
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary-500 shrink-0 mt-0.5" />
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{tip}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      </div>
    </motion.div>
  )
}
