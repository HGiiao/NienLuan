import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Lightbulb, ThumbsUp, Plus, Send, X, AlertCircle, Plane, Train, Sparkles } from 'lucide-react'
import { getCommunityTips, createCommunityTip, upvoteTip } from '../services/api'

const categories = [
  { value: 'thoi-gian', label: 'Thời gian tốt nhất' },
  { value: 'gia', label: 'Mẹo săn giá rẻ' },
  { value: 'di-chuyen', label: 'Di chuyển & lưu ý' },
  { value: 'an-uong', label: 'Ăn uống & nghỉ ngơi' },
  { value: 'khac', label: 'Kinh nghiệm khác' },
]

const categoryIcons = {
  'thoi-gian': Sparkles,
  'gia': AlertCircle,
  'di-chuyen': Train,
  'an-uong': Plane,
  'khac': Lightbulb,
}

export default function CommunityTips({ from, to }) {
  const [tips, setTips] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category: 'thoi-gian', tip: '' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!from || !to) return
    const load = async () => {
      setLoading(true)
      try {
        const res = await getCommunityTips({ from, to })
        setTips(res.data || [])
      } catch {} finally { setLoading(false) }
    }
    load()
  }, [from, to])

  const handleSubmit = async () => {
    if (!form.tip.trim()) return
    const stored = (() => { try { return JSON.parse(sessionStorage.getItem('user')) } catch { return null } })()
    setSubmitting(true)
    try {
      const res = await createCommunityTip({
        routeFrom: from,
        routeTo: to,
        tip: form.tip.trim(),
        category: form.category,
        authorName: stored?.fullName || 'Người dùng',
        email: stored?.email || 'guest@ve247.vn',
      })
      setTips(prev => [res.data, ...prev])
      setForm({ category: 'thoi-gian', tip: '' })
      setShowForm(false)
      setSuccess('Đã thêm mẹo! Cảm ơn bạn đã đóng góp.')
      setTimeout(() => setSuccess(''), 3000)
    } catch {} finally { setSubmitting(false) }
  }

  const handleUpvote = async (id) => {
    try {
      const res = await upvoteTip(id)
      setTips(prev => prev.map(t => t.id === id ? { ...t, upvotes: res.data.upvotes } : t))
    } catch {}
  }

  if (!from || !to) return null

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-[var(--color-text-primary)]">Mẹo đi lại</h3>
          <span className="text-[11px] text-[var(--color-text-tertiary)] font-mono">{from} → {to}</span>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors">
            <Plus className="w-3.5 h-3.5" />Thêm mẹo
          </button>
        )}
      </div>

      {success && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-200 mb-4">
          <ThumbsUp className="w-4 h-4" />{success}
        </motion.div>
      )}

      {showForm && (
        <div className="p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">Thêm mẹo mới</span>
            <button onClick={() => setShowForm(false)} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary-500 text-[var(--color-text-primary)]">
            {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <textarea value={form.tip} onChange={e => setForm(p => ({ ...p, tip: e.target.value }))}
            placeholder="Chia sẻ kinh nghiệm của bạn về tuyến này..."
            className="w-full text-sm bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 h-24 resize-none outline-none focus:ring-2 focus:ring-primary-500 text-[var(--color-text-primary)]"
          />
          <div className="flex justify-end">
            <button onClick={handleSubmit} disabled={submitting || !form.tip.trim()}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 shadow-md">
              <Send className="w-4 h-4" />{submitting ? 'Đang gửi...' : 'Đăng mẹo'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {tips.map((t, i) => {
          const CatIcon = categoryIcons[t.category] || Lightbulb
          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
              className="p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)]">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <CatIcon className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      {categories.find(c => c.value === t.category)?.label || t.category}
                    </span>
                    <span className="text-[11px] text-[var(--color-text-tertiary)]">
                      {t.authorName} · {new Date(t.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{t.tip}</p>
                </div>
                <button onClick={() => handleUpvote(t.id)}
                  className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-amber-500/10 transition-colors shrink-0">
                  <ThumbsUp className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] hover:text-amber-500" />
                  <span className="text-[10px] font-semibold text-[var(--color-text-tertiary)]">{t.upvotes}</span>
                </button>
              </div>
            </motion.div>
          )
        })}
        {!loading && tips.length === 0 && (
          <div className="text-center py-8">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 text-[var(--color-text-tertiary)] opacity-50" />
            <p className="text-sm text-[var(--color-text-tertiary)]">Chưa có mẹo nào cho tuyến này</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1 opacity-70">Hãy là người đầu tiên chia sẻ kinh nghiệm!</p>
          </div>
        )}
      </div>
    </div>
  )
}
