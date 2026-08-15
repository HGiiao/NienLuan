import { useEffect, createContext, useContext, useState } from 'react'
import { useLocation, useNavigate, BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ClerkProvider, useUser, useClerk } from '@clerk/clerk-react'
import { Loader, AlertCircle } from 'lucide-react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ChatBot from './components/ChatBot'
import IntroAnimation from './components/IntroAnimation'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './pages/Home'
import SearchFlights from './pages/SearchFlights'
import SearchTrains from './pages/SearchTrains'
import SearchBuses from './pages/SearchBuses'
import PriceComparison from './pages/PriceComparison'
import OptimalRoute from './pages/OptimalRoute'
import Bookings from './pages/Bookings'
import LoginRegister from './pages/LoginRegister'
import Profile from './pages/Profile'
import BookingConfirmation from './pages/BookingConfirmation'
import BookingPage from './pages/BookingPage'
import PaymentPage from './pages/PaymentPage'
import VnPayReturn from './pages/VnPayReturn'
import MoMoReturn from './pages/MoMoReturn'
import ZaloPayReturn from './pages/ZaloPayReturn'
import PayOSReturn from './pages/PayOSReturn'
import VipPlans from './pages/VipPlans'
import SubscriptionPaymentPage from './pages/SubscriptionPaymentPage'
import NotFound from './pages/NotFound'
import AdminDashboard from './pages/AdminDashboard'
import AdminLogin from './pages/AdminLogin'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const ThemeContext = createContext()

export function useTheme() {
  return useContext(ThemeContext)
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ve247-theme') || 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.classList.toggle('light', theme === 'light')
    localStorage.setItem('ve247-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

function SsoCallback() {
  const { handleRedirectCallback } = useClerk()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    handleRedirectCallback({
      // Nếu đăng ký OAuth còn thiếu thông tin (vd: SĐT bắt buộc) → quay về app
      // để bổ sung thay vì bị ném sang trang hosted của Clerk.
      continueSignUpUrl: '/auth?mode=continue-signup',
    })
      .catch((err) => {
        if (cancelled) return
        console.error('[SsoCallback error]', err)
        const isSignUpRelated = (err?.errors || []).some(e =>
          String(e?.code || '').toLowerCase().includes('sign_up') ||
          String(e?.message || '').toLowerCase().includes('sign-up'))
        if (isSignUpRelated) {
          navigate('/auth?mode=continue-signup', { replace: true })
          return
        }
        const msg = err?.errors?.[0]?.message || err?.message || 'Không thể hoàn tất đăng nhập. Vui lòng thử lại.'
        setError(msg)
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-bg)]">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">Đăng nhập không thành công</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">{error}</p>
          <button
            onClick={() => navigate('/auth')}
            className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Quay lại trang đăng nhập
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="text-center">
        <Loader className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-3" />
        <p className="text-sm text-[var(--color-text-secondary)]">Đang xử lý đăng nhập...</p>
      </div>
    </div>
  )
}

function ClerkSync() {
  const { isSignedIn, user } = useUser()
  const tabAuth = sessionStorage.getItem('ve247-auth')

  useEffect(() => {
    if (isSignedIn && user) {
      // Chỉ sync sau khi flow đăng nhập trong app hoàn tất (ve247-auth được set),
      // tránh ghi đè user backend đang đăng nhập bằng session Clerk nền.
      if (!tabAuth) return
      const email = user.primaryEmailAddress?.emailAddress || ''
      if (!email) return
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/clerk-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          fullName: user.fullName || '',
          phone: user.primaryPhoneNumber?.phoneNumber || '',
        }),
      })
        .then(r => r.json())
        .then(d => sessionStorage.setItem('user', JSON.stringify({ ...d, loginMethod: 'clerk' })))
        .catch(() => {})
    } else {
      const stored = sessionStorage.getItem('user')
      if (stored) {
        try {
          const u = JSON.parse(stored)
          if (u?.loginMethod === 'clerk') sessionStorage.removeItem('user')
        } catch {}
      }
    }
  }, [isSignedIn, user, tabAuth])

  return null
}

function AdminGuard({ children }) {
  const stored = (() => { try { return JSON.parse(sessionStorage.getItem('user')) } catch { return null } })()
  if (!stored || stored.role !== 'Admin') return <Navigate to="/admin/login" replace />
  return children
}

function AppLayout() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')
  const [introComplete, setIntroComplete] = useState(() => {
    return sessionStorage.getItem('ve247-intro-seen') === 'true'
  })

  const handleIntroComplete = () => {
    sessionStorage.setItem('ve247-intro-seen', 'true')
    setIntroComplete(true)
  }

  return (
    <div className={`${isAdminRoute ? '' : 'min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-colors duration-300'}`}>
      {!introComplete && <ErrorBoundary><IntroAnimation onComplete={handleIntroComplete} /></ErrorBoundary>}
      {!isAdminRoute && <Navbar />}
      {!isAdminRoute && <ClerkSync />}
      {!isAdminRoute && introComplete && <ChatBot />}
      <main className={isAdminRoute ? '' : 'flex-1'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/flights" element={<SearchFlights />} />
          <Route path="/trains" element={<SearchTrains />} />
          <Route path="/buses" element={<SearchBuses />} />
          <Route path="/compare" element={<PriceComparison />} />
          <Route path="/trends" element={<Navigate to="/compare" replace />} />
          <Route path="/optimal-route" element={<OptimalRoute />} />
          <Route path="/price-alerts" element={<Navigate to="/optimal-route" replace />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/booking/:type/:id" element={<BookingPage />} />
          <Route path="/payment/:bookingId" element={<PaymentPage />} />
          <Route path="/payment/subscription/:planId" element={<SubscriptionPaymentPage />} />
          <Route path="/payment/vnpay-return" element={<VnPayReturn />} />
          <Route path="/payment/momo-return" element={<MoMoReturn />} />
          <Route path="/payment/zalopay-return" element={<ZaloPayReturn />} />
          <Route path="/payment/payos-return" element={<PayOSReturn />} />
          <Route path="/booking-confirmation/:id" element={<BookingConfirmation />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/vip" element={<VipPlans />} />
          <Route path="/auth" element={<LoginRegister />} />
          <Route path="/auth/sso-callback" element={<SsoCallback />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
          <Route path="/admin/*" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
    </div>
  )
}

function App() {
  useEffect(() => {
    window.onerror = (msg, src, line, col, err) => {
      console.error('[Global Error]', msg, err?.stack)
    }
    window.onunhandledrejection = (e) => {
      console.error('[Unhandled Rejection]', e.reason?.message, e.reason?.stack)
    }
    localStorage.removeItem('user')
    localStorage.removeItem('loginMethod')
  }, [])

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
          <Router>
            <AppLayout />
          </Router>
        </ClerkProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
