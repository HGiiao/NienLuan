import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSignIn, useUser } from '@clerk/clerk-react'
import {
  Plane, Train, Globe, Briefcase, Mail, Lock, Eye, EyeOff,
  Phone, Check, AlertCircle, Loader, MailCheck, User,
} from 'lucide-react'
import { login, register, verifyEmail } from '../services/api'

const features = [
  'So sánh giá vé máy bay & tàu hỏa',
  'Đặt vé nhanh chóng trong 2 phút',
  'Theo dõi xu hướng giá theo ngày',
  'Lộ trình tối ưu tiết kiệm nhất',
]

const formVariants = {
  enter: { opacity: 0, x: 16 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
}

  const shakeVariants = {
    shake: { x: [0, -8, 8, -8, 8, 0], transition: { duration: 0.35 } },
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    try {
      await register({
        email: registeredEmail,
        password: form.password,
        fullName: form.fullName,
        phone: form.phone || undefined,
      })
      setSuccess('Mã xác thực mới đã được gửi đến ' + registeredEmail)
      setResendCooldown(60)
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0 }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi lại mã')
    }
  }

const fieldVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
}

export default function LoginRegister() {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', fullName: '', phone: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  const [otpStep, setOtpStep] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const redirectTo = params.get('redirect') || '/'

  const { isSignedIn, isLoaded } = useUser()
  const { signIn, setActive } = useSignIn()

  useEffect(() => {
    if (isLoaded && isSignedIn && !sessionStorage.getItem('ve247-auth')) {
      sessionStorage.setItem('ve247-auth', 'true')
      navigate(redirectTo, { replace: true })
    }
  }, [isLoaded, isSignedIn])

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const triggerShake = () => setShakeKey(k => k + 1)

  const handleSocialLogin = async (provider) => {
    if (!signIn) return
    try {
      await signIn.authenticateWithRedirect({
        strategy: `oauth_${provider}`,
        redirectUrl: window.location.origin + '/auth/sso-callback',
        redirectUrlComplete: window.location.origin + '/auth?redirect=' + encodeURIComponent(redirectTo),
      })
    } catch (err) {
      setError(err.errors?.[0]?.message || 'Đăng nhập thất bại')
      triggerShake()
    }
  }

  const handlePhoneLogin = async () => {
    if (!form.phone) return setError('Vui lòng nhập số điện thoại')
    try {
      await signIn.create({ identifier: form.phone })
      await signIn.prepareFirstFactor({ strategy: 'phone_code' })
      const code = prompt('Nhập mã OTP gửi đến ' + form.phone)
      if (!code) return
      const result = await signIn.attemptFirstFactor({ strategy: 'phone_code', code })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        sessionStorage.setItem('ve247-auth', 'true')
        navigate(redirectTo)
      }
    } catch (err) {
      setError(err.errors?.[0]?.message || 'Đăng nhập bằng SĐT thất bại')
      triggerShake()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (tab === 'register') {
      if (!form.fullName.trim()) { setError('Vui lòng nhập họ tên'); triggerShake(); return }
      if (form.password.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự'); triggerShake(); return }
      if (form.password !== form.confirmPassword) { setError('Mật khẩu xác nhận không khớp'); triggerShake(); return }
    }

    setLoading(true)
    try {
      if (tab === 'login') {
        const res = await login({ email: form.email, password: form.password })
        localStorage.removeItem('user')
        sessionStorage.setItem('user', JSON.stringify({ ...res.data, loginMethod: 'backend' }))
        sessionStorage.setItem('ve247-auth', 'true')
        navigate(redirectTo)
      } else {
        const res = await register({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          phone: form.phone || undefined,
        })
        setRegisteredEmail(res.data.email)
        setOtpStep(true)
        setSuccess('Mã xác thực đã được gửi đến email ' + res.data.email)
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại'
      setError(msg)
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    if (!otpCode) { setError('Vui lòng nhập mã xác thực'); return }
    setLoading(true)
    try {
      await verifyEmail({ email: registeredEmail, code: otpCode })
      // Auto-login after successful verification
      const loginRes = await login({ email: registeredEmail, password: form.password })
      localStorage.removeItem('user')
      sessionStorage.setItem('user', JSON.stringify({ ...loginRes.data, loginMethod: 'backend' }))
      sessionStorage.setItem('ve247-auth', 'true')
      navigate(redirectTo)
    } catch (err) {
      setError(err.response?.data?.message || 'Mã xác thực không đúng')
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  const fields = tab === 'login'
    ? ['email', 'password']
    : ['fullName', 'email', 'password', 'confirmPassword', 'phone']

  return (
    <section className="min-h-[100dvh] flex bg-gradient-to-br from-primary-50 via-white to-primary-50">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center" style={{ backgroundImage: 'url(/images/DangNhap.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-primary-500/20" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(14,165,233,0.15) 0%, transparent 60%), radial-gradient(circle at 70% 80%, rgba(37,99,235,0.2) 0%, transparent 50%)' }} />

        <motion.div
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-16 left-[10%] text-5xl opacity-15"
        >
          <Plane className="w-12 h-12 text-white" />
        </motion.div>
        <motion.div
          animate={{ y: [10, -10, 10] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-24 right-[12%] text-5xl opacity-15"
        >
          <Train className="w-12 h-12 text-white" />
        </motion.div>
        <motion.div
          animate={{ y: [-12, 12, -12] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-1/3 right-[20%] text-4xl opacity-15"
        >
          <Globe className="w-10 h-10 text-white" />
        </motion.div>
        <motion.div
          animate={{ y: [12, -12, 12] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="absolute bottom-1/3 left-[15%] text-4xl opacity-15"
        >
          <Briefcase className="w-10 h-10 text-white" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.8 } }}
          className="relative z-10 text-center px-12"
        >
          <motion.div
            animate={{ rotate: [0, -6, 6, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="mb-6"
          >
            <Plane className="w-16 h-16 text-white drop-shadow-2xl mx-auto" />
          </motion.div>
          <h1 className="text-5xl font-bold text-white mb-3 drop-shadow-lg">Vé247</h1>
          <div className="w-16 h-1 bg-primary-500 mx-auto rounded-full mb-4" />
          <p className="text-white/80 text-lg mb-10 font-medium drop-shadow">
            Nền tảng so sánh giá vé máy bay & tàu hỏa hàng đầu Việt Nam
          </p>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 space-y-3 text-left shadow-xl">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 text-white"
              >
                <span className="w-7 h-7 rounded-full bg-primary-500/80 flex items-center justify-center shrink-0 shadow-lg">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span className="text-base font-medium">{f}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center py-12 px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.6 } }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary-500/20">
              <Plane className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Vé247</h1>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-3xl shadow-xl shadow-black/20 border border-[var(--color-border)] overflow-hidden">
            <div className="relative bg-[var(--color-border)]/30 p-1.5 mx-5 mt-5 rounded-2xl">
              <motion.div
                className="absolute top-1.5 bottom-1.5 w-[calc(50%-3px)] bg-[var(--color-bg-card)] rounded-xl shadow-sm border border-[var(--color-border)]"
                animate={{ x: tab === 'login' ? '0%' : 'calc(100% + 6px)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
              <div className="relative flex">
                {['login', 'register'].map(t => (
                  <button
                    key={t}
                    disabled={otpStep}
                    onClick={() => { setTab(t); setError(''); setSuccess('') }}
                    className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-colors relative z-10 ${
                      tab === t ? 'text-primary-400' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                    } ${otpStep ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {t === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {otpStep ? (
                <motion.form
                  key="otp"
                  variants={formVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  onSubmit={handleVerifyOtp}
                  className="p-6 space-y-4"
                >
                  <div className="text-center mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-3">
                      <MailCheck className="w-7 h-7 text-primary-500" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Xác thực email</h3>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">Nhập mã xác thực được gửi đến</p>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{registeredEmail}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-tertiary)] mb-1.5 uppercase tracking-wider">Mã xác thực</label>
                    <input
                      className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3.5 text-center text-2xl tracking-[0.5em] font-bold text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)]"
                      placeholder="000000"
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      autoFocus
                    />
                  </div>

                  <div className="text-center">
                    {resendCooldown > 0 ? (
                      <p className="text-xs text-[var(--color-text-tertiary)]">
                        Gửi lại sau {resendCooldown}s
                      </p>
                    ) : (
                      <button type="button" onClick={handleResendOtp}
                        className="text-xs text-primary-500 font-semibold hover:underline">
                        Gửi lại mã xác thực
                      </button>
                    )}
                  </div>

                  {success && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-[var(--color-success)] bg-[var(--color-success)]/10 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                      <Check className="w-4 h-4" /><span>{success}</span>
                    </motion.p>
                  )}
                  {error && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/10 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /><span>{error}</span>
                    </motion.p>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading || otpCode.length < 6}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-all disabled:opacity-60"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader className="w-4 h-4 animate-spin" />
                        Đang xác thực...
                      </span>
                    ) : 'Xác thực'}
                  </motion.button>

                  <p className="text-xs text-[var(--color-text-tertiary)] text-center">
                    <button type="button" onClick={() => { setOtpStep(false); setTab('login'); setError('') }} className="text-primary-500 font-semibold hover:underline">
                      Quay lại đăng nhập
                    </button>
                  </p>
                </motion.form>
              ) : (
              <motion.form
                key={tab}
                variants={formVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                onSubmit={handleSubmit}
                className="p-6 space-y-4"
              >
                <motion.div
                  key={shakeKey}
                  variants={shakeVariants}
                  animate={error ? 'shake' : undefined}
                  className="space-y-4"
                >
                  {tab === 'register' && (
                    <motion.div custom={0} initial="hidden" animate="visible" variants={fieldVariants}>
                      <label className="block text-xs font-semibold text-[var(--color-text-tertiary)] mb-1.5 uppercase tracking-wider">Họ tên</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                        <input className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 py-3 text-sm text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] placeholder:text-[var(--color-text-tertiary)]" placeholder="Nguyễn Văn A" value={form.fullName} onChange={e => update('fullName', e.target.value)} />
                      </div>
                    </motion.div>
                  )}

                  <motion.div custom={tab === 'register' ? 1 : 0} initial="hidden" animate="visible" variants={fieldVariants}>
                    <label className="block text-xs font-semibold text-[var(--color-text-tertiary)] mb-1.5 uppercase tracking-wider">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                      <input className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 py-3 text-sm text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] placeholder:text-[var(--color-text-tertiary)]" type="email" placeholder="user@example.com" value={form.email} onChange={e => update('email', e.target.value)} required />
                    </div>
                  </motion.div>

                  <motion.div custom={tab === 'register' ? 2 : 1} initial="hidden" animate="visible" variants={fieldVariants}>
                    <label className="block text-xs font-semibold text-[var(--color-text-tertiary)] mb-1.5 uppercase tracking-wider">Mật khẩu</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                      <input className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-10 py-3 text-sm text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] placeholder:text-[var(--color-text-tertiary)]" type={showPassword ? 'text' : 'password'} placeholder="password" value={form.password} onChange={e => update('password', e.target.value)} required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] p-0.5">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>

                  {tab === 'register' && (
                    <>
                      <motion.div custom={3} initial="hidden" animate="visible" variants={fieldVariants}>
                        <label className="block text-xs font-semibold text-[var(--color-text-tertiary)] mb-1.5 uppercase tracking-wider">Xác nhận mật khẩu</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                          <input className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-10 py-3 text-sm text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] placeholder:text-[var(--color-text-tertiary)]" type={showConfirm ? 'text' : 'password'} placeholder="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} required />
                          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] p-0.5">
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </motion.div>

                      <motion.div custom={4} initial="hidden" animate="visible" variants={fieldVariants}>
                        <label className="block text-xs font-semibold text-[var(--color-text-tertiary)] mb-1.5 uppercase tracking-wider">Số điện thoại</label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                          <input className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 py-3 text-sm text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] placeholder:text-[var(--color-text-tertiary)]" placeholder="0901234567" value={form.phone} onChange={e => update('phone', e.target.value)} />
                        </div>
                      </motion.div>
                    </>
                  )}
                </motion.div>

                {success && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-[var(--color-success)] bg-[var(--color-success)]/10 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4" /><span>{success}</span>
                  </motion.p>
                )}
                {error && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/10 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /><span>{error}</span>
                  </motion.p>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </span>
                  ) : tab === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
                </motion.button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--color-border)]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[var(--color-bg-card)] px-3 text-[var(--color-text-tertiary)] font-medium">Hoặc tiếp tục với</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('google')}
                    className="flex items-center justify-center gap-2 border border-[var(--color-border)] rounded-xl py-3 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/30 transition-all"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('facebook')}
                    className="flex items-center justify-center gap-2 border border-[var(--color-border)] rounded-xl py-3 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/30 transition-all"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Facebook
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handlePhoneLogin}
                  className="w-full flex items-center justify-center gap-2 border border-[var(--color-border)] rounded-xl py-3 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/30 transition-all"
                >
                  <Phone className="w-4 h-4" />
                  Đăng nhập bằng số điện thoại
                </button>

                <p className="text-xs text-[var(--color-text-tertiary)] text-center mt-4">
                  {tab === 'login' ? (
                    <>Chưa có tài khoản? <button type="button" onClick={() => { setTab('register'); setError('') }} className="text-primary-500 font-semibold hover:underline">Đăng ký ngay</button></>
                  ) : (
                    <>Đã có tài khoản? <button type="button" onClick={() => { setTab('login'); setError('') }} className="text-primary-500 font-semibold hover:underline">Đăng nhập</button></>
                  )}
                </p>
              </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
