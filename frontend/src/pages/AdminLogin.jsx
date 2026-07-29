import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, LogIn, Loader, Eye, EyeOff, Shield, CheckSquare, Square, ChevronRight } from 'lucide-react'
import { login } from '../services/api'

export default function AdminLogin() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [remember, setRemember] = useState(true)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await login({ email: email.trim(), password })
      const data = res.data
      if (data.role !== 'Admin') {
        setError('Tài khoản không có quyền truy cập Admin')
        setLoading(false)
        return
      }
      localStorage.setItem('user', JSON.stringify({ ...data, loginMethod: 'backend' }))
      const redirect = searchParams.get('redirect') || '/admin'
      window.location.href = redirect
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[var(--color-bg)] flex relative overflow-hidden">
      {/* Hero side */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex flex-1 flex-col items-center justify-center relative p-12 bg-gradient-to-br from-primary-500/5 via-transparent to-primary-500/5"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center"
        >
          <div className="w-24 h-24 rounded-3xl bg-primary-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-500/20">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-3 tracking-tight">
            Vé<span className="text-primary-500">247</span> Admin
          </h1>
          <p className="text-[var(--color-text-secondary)] text-base max-w-md mx-auto leading-relaxed">
            Hệ thống quản trị tập trung — quản lý chuyến bay, tàu hỏa, đặt chỗ và người dùng.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-12 grid grid-cols-3 gap-4 max-w-lg"
        >
          {[
            { label: 'Chuyến bay', val: '940+' },
            { label: 'Tàu hỏa', val: '235+' },
            { label: 'Người dùng', val: '1k+' },
          ].map((s, i) => (
            <div key={i} className="text-center p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)]">
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{s.val}</p>
              <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="absolute bottom-8 text-xs text-[var(--color-text-tertiary)]"
        >
          © 2026 Vé247. All rights reserved.
        </motion.p>
      </motion.div>

      {/* Form side */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-md"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 to-primary-500/5 rounded-3xl blur-xl" />
            <div className="relative bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-sm p-8 md:p-10">
              <div className="flex flex-col items-center mb-8 lg:hidden">
                <div className="w-14 h-14 rounded-2xl bg-primary-500 flex items-center justify-center text-white shadow-sm mb-3">
                  <Shield className="w-7 h-7" />
                </div>
                <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
                  Vé<span className="text-primary-500">247</span> Admin
                </h1>
              </div>

              <div className="hidden lg:block mb-8">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">Đăng nhập</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">Quản trị hệ thống Vé247</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="admin@ve247.vn"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] text-sm placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1.5">Mật khẩu</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] text-sm placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setRemember(!remember)}
                    className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
                  >
                    {remember ? (
                      <CheckSquare className="w-4 h-4 text-primary-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    Ghi nhớ
                  </button>
                  <button type="button" className="text-xs text-primary-500/60 hover:text-primary-500 transition-colors">
                    Quên mật khẩu?
                  </button>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-[var(--color-danger)] bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 px-3.5 py-2.5 rounded-xl"
                  >
                    {error}
                  </motion.p>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 bg-primary-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-primary-600 transition-all shadow-sm disabled:opacity-60"
                >
                  {loading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </motion.button>
              </form>

              <div className="mt-6 pt-6 border-t border-[var(--color-border)] flex items-center justify-between">
                <p className="text-xs text-[var(--color-text-tertiary)]">Truy cập Quản trị viên</p>
                <motion.a
                  href="/"
                  whileHover={{ x: 2 }}
                  className="flex items-center gap-1 text-xs text-primary-500/60 hover:text-primary-500 transition-colors"
                >
                  Về trang chủ <ChevronRight className="w-3 h-3" />
                </motion.a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
