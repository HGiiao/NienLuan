import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSignIn, useSignUp, useUser, useClerk } from '@clerk/clerk-react'
import {
  Plane, Train, Globe, Briefcase, Mail, Lock, Eye, EyeOff,
  Phone, Check, AlertCircle, Loader, MailCheck, User, LogOut,
} from 'lucide-react'
import { login, register, verifyEmail, forgotPassword, resetPassword } from '../services/api'

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
  // Forgot password flow: 'email' | 'otp' | 'done'
  const [forgotStep, setForgotStep] = useState(null)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotOtp, setForgotOtp] = useState('')
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showForgotConfirm, setShowForgotConfirm] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState('')
  const [forgotResendCooldown, setForgotResendCooldown] = useState(0)
  // Overlay ăn mừng khi đăng nhập / đăng ký thành công
  const [celebration, setCelebration] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const isContinueSignUp = params.get('mode') === 'continue-signup'
  const redirectTo = params.get('redirect') || (isContinueSignUp ? sessionStorage.getItem('ve247-auth-redirect') : null) || '/'

  const { isSignedIn, isLoaded, user } = useUser()
  const { signIn, setActive } = useSignIn()
  const { signUp, setActive: setActiveSignUp } = useSignUp()
  const { signOut: clerkSignOut } = useClerk()

  // Cổng chọn khi Clerk khôi phục phiên đăng nhập (tránh bị "hút" thẳng vào tài khoản)
  const [signedInGate, setSignedInGate] = useState(false)

  // Trạng thái cho bước "hoàn tất đăng ký OAuth" (bổ sung SĐT + OTP)
  const [continueStep, setContinueStep] = useState('phone') // 'phone' | 'otp'
  const [continuePhone, setContinuePhone] = useState('')
  const [continueOtp, setContinueOtp] = useState('')
  const [continueLoading, setContinueLoading] = useState(false)
  const [continueError, setContinueError] = useState('')
  const [continueSuccess, setContinueSuccess] = useState('')

  const normalizePhone = (p) => {
    const d = p.replace(/[^\d+]/g, '')
    if (d.startsWith('+')) return d
    if (d.startsWith('84')) return '+' + d
    if (d.startsWith('0')) return '+84' + d.slice(1)
    return '+84' + d
  }

  // Chuyển lỗi SMS của Clerk sang thông báo tiếng Việt dễ hiểu + hướng dẫn khắc phục
  const clerkPhoneError = (err, fallback) => {
    const raw = err?.errors?.[0]?.message || err?.errors?.[0]?.longMessage || err?.message || ''
    if (/unsupported country|country code|not supported|cannot send sms/i.test(raw)) {
      return 'Clerk chưa cho phép gửi SMS tới số Việt Nam (+84). Vào Clerk Dashboard → SMS → Settings → bật quốc gia "Việt Nam (+84)" trong danh sách cho phép (hoặc cấu hình Twilio riêng). Có thể test nhanh bằng số Mỹ +1 555-01xx với mã 424242.'
    }
    return raw || fallback
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

  const handleContinuePhone = async (e) => {
    e.preventDefault()
    setContinueError('')
    if (!continuePhone.trim()) return setContinueError('Vui lòng nhập số điện thoại')
    if (!/^(0|\+84|84)[3-9]\d{8}$/.test(continuePhone.replace(/[\s-]/g, ''))) {
      return setContinueError('Số điện thoại không hợp lệ (vd: 0912345678)')
    }
    setContinueLoading(true)
    try {
      const res = await signUp.update({ phoneNumber: normalizePhone(continuePhone) })
      if (res.status === 'missing_requirements' && (res.unverifiedFields || []).includes('phone_number')) {
        await signUp.preparePhoneNumberVerification({ strategy: 'phone_code' })
        setContinueStep('otp')
        setContinueSuccess('Mã xác thực đã gửi đến ' + continuePhone)
      } else if (res.status === 'complete') {
        await setActiveSignUp({ session: res.createdSessionId })
        sessionStorage.setItem('ve247-auth', 'true')
        completeAuth('Hoàn tất đăng ký!')
      } else {
        setContinueError('Cần bổ sung thêm thông tin. Vui lòng thử lại.')
      }
    } catch (err) {
      setContinueError(clerkPhoneError(err, 'Không thể cập nhật số điện thoại'))
    } finally {
      setContinueLoading(false)
    }
  }

  const handleContinueOtp = async (e) => {
    e.preventDefault()
    setContinueError('')
    if (!continueOtp) return setContinueError('Vui lòng nhập mã xác thực')
    setContinueLoading(true)
    try {
      const res = await signUp.attemptPhoneNumberVerification({ code: continueOtp })
      if (res.status === 'complete') {
        await setActiveSignUp({ session: res.createdSessionId })
        sessionStorage.setItem('ve247-auth', 'true')
        completeAuth('Hoàn tất đăng ký!')
      } else {
        setContinueError('Xác thực chưa hoàn tất. Vui lòng thử lại.')
      }
    } catch (err) {
      setContinueError(clerkPhoneError(err, 'Mã xác thực không đúng'))
    } finally {
      setContinueLoading(false)
    }
  }

  const handleResendContinueOtp = async () => {
    setContinueError('')
    setContinueLoading(true)
    try {
      await signUp.preparePhoneNumberVerification({ strategy: 'phone_code' })
      setContinueSuccess('Mã xác thực mới đã được gửi đến ' + continuePhone)
    } catch (err) {
      setContinueError(clerkPhoneError(err, 'Không thể gửi lại mã'))
    } finally {
      setContinueLoading(false)
    }
  }

  useEffect(() => {
    if (isLoaded && isSignedIn && !sessionStorage.getItem('ve247-auth')) {
      // Vừa quay về từ Google OAuth (?redirect=...) → vào ứng dụng luôn
      if (location.search.includes('redirect=')) {
        sessionStorage.setItem('ve247-auth', 'true')
        sessionStorage.removeItem('ve247-auth-redirect')
        navigate(redirectTo, { replace: true })
      } else {
        // Phiên Clerk được khôi phục khi bấm "Đăng nhập" → hiện cổng xác nhận, không tự nhảy
        setSignedInGate(true)
      }
    }
  }, [isLoaded, isSignedIn, location.search])

  const handleContinueAsSignedIn = () => {
    sessionStorage.setItem('ve247-auth', 'true')
    sessionStorage.removeItem('ve247-auth-redirect')
    navigate(redirectTo, { replace: true })
  }

  const handleSwitchAccount = async () => {
    setSignedInGate(false)
    sessionStorage.removeItem('ve247-auth')
    sessionStorage.removeItem('user')
    try { await clerkSignOut() } catch (e) { /* bỏ qua */ }
    setTab('login')
  }

  // Hiện overlay chúc mừng rồi mới chuyển trang sau ~2.2s
  const completeAuth = (msg) => {
    sessionStorage.removeItem('ve247-auth-redirect')
    setCelebration(msg)
    window.setTimeout(() => navigate(redirectTo, { replace: true }), 2200)
  }

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const triggerShake = () => setShakeKey(k => k + 1)

  const handleSocialLogin = async (provider) => {
    if (!signIn) return
    try {
      sessionStorage.setItem('ve247-auth-redirect', redirectTo)
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
        completeAuth('Đăng nhập thành công!')
      }
    } catch (err) {
      setError(clerkPhoneError(err, 'Đăng nhập bằng SĐT thất bại'))
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
        completeAuth('Đăng nhập thành công!')
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
      completeAuth('Đăng ký thành công!')
    } catch (err) {
      setError(err.response?.data?.message || 'Mã xác thực không đúng')
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  // --- Forgot password handlers ---
  const handleForgotSubmitEmail = async (e) => {
    e.preventDefault()
    setForgotError('')
    setForgotSuccess('')
    if (!forgotEmail.trim()) { setForgotError('Vui lòng nhập email'); return }
    setForgotLoading(true)
    try {
      await forgotPassword({ email: forgotEmail })
      setForgotStep('otp')
      setForgotSuccess('Mã xác thực đã được gửi đến ' + forgotEmail)
      setForgotResendCooldown(60)
      const timer = setInterval(() => {
        setForgotResendCooldown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0 }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Không thể gửi mã xác thực. Vui lòng thử lại.')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleForgotResetPassword = async (e) => {
    e.preventDefault()
    setForgotError('')
    if (!forgotOtp) { setForgotError('Vui lòng nhập mã xác thực'); return }
    if (!forgotNewPassword) { setForgotError('Vui lòng nhập mật khẩu mới'); return }
    if (forgotNewPassword.length < 6) { setForgotError('Mật khẩu mới phải có ít nhất 6 ký tự'); return }
    if (forgotNewPassword !== forgotConfirmPassword) { setForgotError('Mật khẩu xác nhận không khớp'); return }
    setForgotLoading(true)
    try {
      await resetPassword({ email: forgotEmail, code: forgotOtp, newPassword: forgotNewPassword })
      setForgotStep('done')
      setForgotSuccess('Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.')
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleForgotResendOtp = async () => {
    if (forgotResendCooldown > 0) return
    setForgotError('')
    setForgotLoading(true)
    try {
      await forgotPassword({ email: forgotEmail })
      setForgotSuccess('Mã xác thực mới đã được gửi đến ' + forgotEmail)
      setForgotResendCooldown(60)
      const timer = setInterval(() => {
        setForgotResendCooldown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0 }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Không thể gửi lại mã')
    } finally {
      setForgotLoading(false)
    }
  }

  const resetForgotState = () => {
    setForgotStep(null)
    setForgotEmail('')
    setForgotOtp('')
    setForgotNewPassword('')
    setForgotConfirmPassword('')
    setShowForgotPassword(false)
    setShowForgotConfirm(false)
    setForgotError('')
    setForgotSuccess('')
    setForgotResendCooldown(0)
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
            {isContinueSignUp ? (
              !signUp ? (
                <div className="p-6 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-7 h-7 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-text-primary)]">Phiên đăng ký không còn hiệu lực</h3>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">Vui lòng đăng nhập lại bằng Google để bắt đầu lại.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/auth')}
                    className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 rounded-xl font-semibold"
                  >
                    Quay lại đăng nhập
                  </button>
                </div>
              ) : (
              <div className="p-6 space-y-4">
                <div className="text-center mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-3">
                    <Phone className="w-7 h-7 text-primary-500" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Hoàn tất đăng ký</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                    {continueStep === 'otp'
                      ? 'Nhập mã xác thực được gửi đến số điện thoại của bạn'
                      : 'Tài khoản Google của bạn cần bổ sung số điện thoại để hoàn tất đăng ký'}
                  </p>
                </div>

                {continueStep === 'phone' ? (
                  <form onSubmit={handleContinuePhone} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-tertiary)] mb-1.5 uppercase tracking-wider">Số điện thoại</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                        <input
                          className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 py-3 text-sm text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] placeholder:text-[var(--color-text-tertiary)]"
                          placeholder="0912345678"
                          value={continuePhone}
                          onChange={e => setContinuePhone(e.target.value.replace(/[^\d+]/g, '').slice(0, 15))}
                        />
                      </div>
                    </div>
                    {continueError && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/10 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /><span>{continueError}</span>
                      </motion.p>
                    )}
                    <motion.button
                      type="submit"
                      disabled={continueLoading}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-primary-500/20 disabled:opacity-60"
                    >
                      {continueLoading ? <span className="flex items-center justify-center gap-2"><Loader className="w-4 h-4 animate-spin" />Đang gửi mã...</span> : 'Gửi mã xác thực'}
                    </motion.button>
                  </form>
                ) : (
                  <form onSubmit={handleContinueOtp} className="space-y-4">
                    {continueSuccess && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-[var(--color-success)] bg-[var(--color-success)]/10 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                        <Check className="w-4 h-4" /><span>{continueSuccess}</span>
                      </motion.p>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-tertiary)] mb-1.5 uppercase tracking-wider">Mã xác thực</label>
                      <input
                        className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3.5 text-center text-2xl tracking-[0.5em] font-bold text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)]"
                        placeholder="000000"
                        maxLength={6}
                        value={continueOtp}
                        onChange={e => setContinueOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        autoFocus
                      />
                    </div>
                    {continueError && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/10 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /><span>{continueError}</span>
                      </motion.p>
                    )}
                    <motion.button
                      type="submit"
                      disabled={continueLoading || continueOtp.length < 6}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-primary-500/20 disabled:opacity-60"
                    >
                      {continueLoading ? <span className="flex items-center justify-center gap-2"><Loader className="w-4 h-4 animate-spin" />Đang xác thực...</span> : 'Hoàn tất đăng ký'}
                    </motion.button>

                    <div className="text-center">
                      <button type="button" onClick={handleResendContinueOtp} disabled={continueLoading} className="text-xs text-primary-500 font-semibold hover:underline disabled:opacity-50">
                        Gửi lại mã xác thực
                      </button>
                    </div>
                  </form>
                )}

                <p className="text-xs text-[var(--color-text-tertiary)] text-center">
                  <button type="button" onClick={() => { sessionStorage.removeItem('ve247-auth-redirect'); navigate('/auth') }} className="text-primary-500 font-semibold hover:underline">
                    Quay lại đăng nhập
                  </button>
                </p>
              </div>
              )
            ) : signedInGate ? (
              <div className="p-6 space-y-4">
                <div className="text-center mb-2">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                    <User className="w-7 h-7 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Bạn đã đăng nhập</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1 break-all">
                    Phiên đăng nhập đang hoạt động với tài khoản{' '}
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {user?.primaryEmailAddress?.emailAddress || user?.fullName || 'của bạn'}
                    </span>
                  </p>
                </div>
                <motion.button
                  type="button"
                  onClick={handleContinueAsSignedIn}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-primary-500/20"
                >
                  Vào ứng dụng ngay
                </motion.button>
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="w-full flex items-center justify-center gap-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] py-3 rounded-xl font-semibold transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Đăng xuất &amp; đăng nhập tài khoản khác
                </button>
                <p className="text-xs text-[var(--color-text-tertiary)] text-center">
                  Bấm "Đăng xuất" nếu bạn muốn dùng tài khoản Gmail khác
                </p>
              </div>
            ) : (
              <>
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
              {forgotStep ? (
                <motion.div
                  key="forgot"
                  variants={formVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="p-6 space-y-4"
                >
                  <div className="text-center mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                      <Lock className="w-7 h-7 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{forgotStep === 'done' ? 'Hoàn tất!' : forgotStep === 'otp' ? 'Đặt lại mật khẩu' : 'Quên mật khẩu?'}</h3>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                      {forgotStep === 'done'
                        ? 'Mật khẩu của bạn đã được đặt lại thành công'
                        : forgotStep === 'otp'
                          ? 'Nhập mã xác thực và mật khẩu mới'
                          : 'Nhập email để nhận mã xác thực đặt lại mật khẩu'}
                    </p>
                  </div>

                  {forgotStep === 'email' && (
                    <form onSubmit={handleForgotSubmitEmail} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-tertiary)] mb-1.5 uppercase tracking-wider">Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                          <input
                            className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-3.5 py-3 text-sm text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] placeholder:text-[var(--color-text-tertiary)]"
                            type="email"
                            placeholder="user@example.com"
                            value={forgotEmail}
                            onChange={e => setForgotEmail(e.target.value)}
                            autoFocus
                          />
                        </div>
                      </div>

                      {forgotError && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/10 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /><span>{forgotError}</span>
                        </motion.p>
                      )}

                      <motion.button
                        type="submit"
                        disabled={forgotLoading}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-primary-500/20 disabled:opacity-60"
                      >
                        {forgotLoading ? <span className="flex items-center justify-center gap-2"><Loader className="w-4 h-4 animate-spin" />Đang gửi mã...</span> : 'Gửi mã xác thực'}
                      </motion.button>
                    </form>
                  )}

                  {forgotStep === 'otp' && (
                    <form onSubmit={handleForgotResetPassword} className="space-y-4">
                      {forgotSuccess && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-[var(--color-success)] bg-[var(--color-success)]/10 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                          <Check className="w-4 h-4" /><span>{forgotSuccess}</span>
                        </motion.p>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-tertiary)] mb-1.5 uppercase tracking-wider">Mã xác thực</label>
                        <input
                          className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3.5 text-center text-2xl tracking-[0.5em] font-bold text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)]"
                          placeholder="000000"
                          maxLength={6}
                          value={forgotOtp}
                          onChange={e => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-tertiary)] mb-1.5 uppercase tracking-wider">Mật khẩu mới</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                          <input
                            className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-10 py-3 text-sm text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] placeholder:text-[var(--color-text-tertiary)]"
                            type={showForgotPassword ? 'text' : 'password'}
                            placeholder="Ít nhất 6 ký tự"
                            value={forgotNewPassword}
                            onChange={e => setForgotNewPassword(e.target.value)}
                          />
                          <button type="button" onClick={() => setShowForgotPassword(!showForgotPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] p-0.5">
                            {showForgotPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-tertiary)] mb-1.5 uppercase tracking-wider">Xác nhận mật khẩu mới</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                          <input
                            className="w-full border border-[var(--color-border)] rounded-xl pl-10 pr-10 py-3 text-sm text-[var(--color-text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-[var(--color-bg)] placeholder:text-[var(--color-text-tertiary)]"
                            type={showForgotConfirm ? 'text' : 'password'}
                            placeholder="Nhập lại mật khẩu mới"
                            value={forgotConfirmPassword}
                            onChange={e => setForgotConfirmPassword(e.target.value)}
                          />
                          <button type="button" onClick={() => setShowForgotConfirm(!showForgotConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] p-0.5">
                            {showForgotConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="text-center">
                        {forgotResendCooldown > 0 ? (
                          <p className="text-xs text-[var(--color-text-tertiary)]">
                            Gửi lại sau {forgotResendCooldown}s
                          </p>
                        ) : (
                          <button type="button" onClick={handleForgotResendOtp} disabled={forgotLoading}
                            className="text-xs text-primary-500 font-semibold hover:underline disabled:opacity-50">
                            Gửi lại mã xác thực
                          </button>
                        )}
                      </div>

                      {forgotError && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/10 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /><span>{forgotError}</span>
                        </motion.p>
                      )}

                      <motion.button
                        type="submit"
                        disabled={forgotLoading || forgotOtp.length < 6 || !forgotNewPassword || !forgotConfirmPassword}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-primary-500/20 disabled:opacity-60"
                      >
                        {forgotLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader className="w-4 h-4 animate-spin" />
                            Đang xử lý...
                          </span>
                        ) : 'Đặt lại mật khẩu'}
                      </motion.button>
                    </form>
                  )}

                  {forgotStep === 'done' && (
                    <div className="space-y-4">
                      {forgotSuccess && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-[var(--color-success)] bg-[var(--color-success)]/10 px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                          <Check className="w-4 h-4" /><span>{forgotSuccess}</span>
                        </motion.p>
                      )}
                      <motion.button
                        type="button"
                        onClick={() => { resetForgotState(); setTab('login') }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-primary-500/20"
                      >
                        Đăng nhập ngay
                      </motion.button>
                    </div>
                  )}

                  <p className="text-xs text-[var(--color-text-tertiary)] text-center">
                    <button type="button" onClick={() => { resetForgotState(); setTab('login') }} className="text-primary-500 font-semibold hover:underline">
                      Quay lại đăng nhập
                    </button>
                  </p>
                </motion.div>
              ) : otpStep ? (
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

                  {tab === 'login' && (
                    <motion.div custom={2} initial="hidden" animate="visible" variants={fieldVariants} className="flex justify-end">
                      <button type="button" onClick={() => { resetForgotState(); setForgotStep('email'); setForgotEmail(form.email) }} className="text-xs text-primary-500 font-semibold hover:underline">
                        Quên mật khẩu?
                      </button>
                    </motion.div>
                  )}

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
              </>
            )}
          </div>
        </motion.div>
      </div>

      {celebration && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-6 right-6 z-[9999]"
        >
          <div className="flex items-center gap-2.5 bg-[var(--color-bg-card)] border border-emerald-500/40 text-[var(--color-text-primary)] rounded-xl px-4 py-3 shadow-xl">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-sm font-semibold">{celebration}</p>
          </div>
        </motion.div>
      )}
    </section>
  )
}
