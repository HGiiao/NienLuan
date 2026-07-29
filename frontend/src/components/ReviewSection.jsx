import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Star, MessageSquare, User, ThumbsUp, Send, X } from 'lucide-react'
import { getReviews, getReviewSummary, createReview } from '../services/api'

function StarRating({ value, onChange, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" onClick={() => onChange?.(s)}
          className={`${sizeClass} ${s <= value ? 'text-amber-400' : 'text-[var(--color-border)]'} transition-colors ${onChange ? 'hover:scale-110' : ''}`}>
          <Star className={`${sizeClass} ${s <= value ? 'fill-amber-400' : ''}`} />
        </button>
      ))}
    </div>
  )
}

export default function ReviewSection({ flightId, trainId }) {
  const [reviews, setReviews] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ rating: 5, comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const params = flightId ? { flightId } : { trainId }
        const [revRes, sumRes] = await Promise.all([
          getReviews(params),
          getReviewSummary(params),
        ])
        setReviews(revRes.data.items || [])
        setSummary(sumRes.data)
      } catch {} finally { setLoading(false) }
    }
    load()
  }, [flightId, trainId])

  const handleSubmit = async () => {
    if (!form.comment.trim()) return
    const stored = (() => { try { return JSON.parse(localStorage.getItem('user')) } catch { return null } })()
    setSubmitting(true)
    try {
      const res = await createReview({
        flightId: flightId || null,
        trainId: trainId || null,
        email: stored?.email || 'guest@ve247.vn',
        authorName: stored?.fullName || 'Người dùng',
        rating: form.rating,
        comment: form.comment.trim(),
      })
      setReviews(prev => [res.data, ...prev])
      setForm({ rating: 5, comment: '' })
      setShowForm(false)
      setSuccess('Cảm ơn bạn đã đánh giá!')
      setTimeout(() => setSuccess(''), 3000)
    } catch {} finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="flex items-center gap-4 p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)]">
          <div className="text-center">
            <div className="text-3xl font-black text-primary-500">{summary.averageRating}</div>
            <StarRating value={Math.round(summary.averageRating)} size="sm" />
            <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">{summary.totalReviews} đánh giá</div>
          </div>
          <div className="flex-1 space-y-1">
            {summary.distribution?.slice().reverse().map(d => (
              <div key={d.rating} className="flex items-center gap-2 text-[11px]">
                <span className="text-[var(--color-text-tertiary)] min-w-[12px]">{d.rating}</span>
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <div className="flex-1 h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${summary.totalReviews > 0 ? (d.count / summary.totalReviews) * 100 : 0}%` }} />
                </div>
                <span className="text-[var(--color-text-tertiary)] min-w-[20px] text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {success && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-200">
          <ThumbsUp className="w-4 h-4" />{success}
        </motion.div>
      )}

      {showForm ? (
        <div className="p-4 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">Đánh giá của bạn</span>
            <button onClick={() => setShowForm(false)} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-tertiary)]">Chất lượng:</span>
            <StarRating value={form.rating} onChange={v => setForm(p => ({ ...p, rating: v }))} />
          </div>
          <textarea value={form.comment} onChange={e => setForm(p => ({ ...p, comment: e.target.value }))}
            placeholder="Chia sẻ trải nghiệm của bạn..."
            className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 h-24 resize-none outline-none focus:ring-2 focus:ring-primary-500 text-[var(--color-text-primary)]"
          />
          <div className="flex justify-end">
            <button onClick={handleSubmit} disabled={submitting || !form.comment.trim()}
              className="flex items-center gap-1.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 shadow-md">
              <Send className="w-4 h-4" />{submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-sm font-semibold text-primary-500 hover:text-primary-600 transition-colors">
          <MessageSquare className="w-4 h-4" />Viết đánh giá
        </button>
      )}

      <div className="space-y-3">
        {reviews.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}
            className="p-4 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-500/10 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary-500" />
                </div>
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">{r.authorName}</span>
                <StarRating value={r.rating} size="sm" />
              </div>
              <span className="text-[11px] text-[var(--color-text-tertiary)]">
                {new Date(r.createdAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{r.comment}</p>
          </motion.div>
        ))}
        {!loading && reviews.length === 0 && (
          <p className="text-sm text-[var(--color-text-tertiary)] text-center py-4">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
        )}
      </div>
    </div>
  )
}
