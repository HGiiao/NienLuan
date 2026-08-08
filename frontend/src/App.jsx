import { useEffect, createContext, useContext, useState } from 'react'
import { useLocation, BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ClerkProvider, useUser, AuthenticateWithRedirectCallback } from '@clerk/clerk-react'
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

function ClerkSync() {
  const { isSignedIn, user } = useUser()

  useEffect(() => {
    const tabAuth = sessionStorage.getItem('ve247-auth')

    if (isSignedIn && user) {
      if (!tabAuth) return
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/clerk-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.primaryEmailAddress?.emailAddress || '',
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
  }, [isSignedIn, user])

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
          <Route path="/auth/sso-callback" element={<AuthenticateWithRedirectCallback />} />
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
