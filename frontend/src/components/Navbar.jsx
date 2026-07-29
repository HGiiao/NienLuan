import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useUser, UserButton } from '@clerk/clerk-react'
import { Plane, User, LogIn, LogOut, Menu, X, Home, BarChart4, Shield, Ticket, Route, Crown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import NotificationBell from './NotificationBell'

const navLinks = [
  { to: '/', label: 'Trang chủ' },
  { to: '/flights', label: 'Chuyến bay' },
  { to: '/trains', label: 'Tàu hỏa' },
  { to: '/compare', label: 'So sánh' },
  { to: '/optimal-route', label: 'Lộ trình & Cảnh báo' },
]

const dropdownItems = (role) => [
  { icon: User, label: 'Hồ sơ', to: '/profile' },
  { icon: Ticket, label: 'Đặt chỗ của tôi', to: '/bookings' },
  ...(role === 'Admin' ? [{ icon: Shield, label: 'Quản trị', to: '/admin' }] : []),
  { icon: Crown, label: 'VIP', to: '/vip' },
]

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { isSignedIn, user } = useUser()
  const localUser = getStoredUser()
  const dropdownRef = useRef(null)

  const isAuth = isSignedIn || !!localUser
  const displayName = isSignedIn ? user?.fullName : localUser?.fullName
  const initials = displayName ? displayName.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : 'U'

  const handleClickOutside = useCallback((e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  const handleLogout = () => { localStorage.removeItem('user'); setDropdownOpen(false); navigate('/auth') }

  const handleNav = (to) => { setDropdownOpen(false); navigate(to) }

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg-card)] backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/30 transition-all">
            <BarChart4 className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Vé<span className="text-primary-500">247</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center justify-center flex-1 gap-1 mx-4">
          {navLinks.map(l => (
            <Link key={l.to} to={l.to}
              className={`px-3 py-1.5 text-sm font-medium transition-all duration-200 border-b-2 ${
                (l.to === '/' ? pathname === '/' : pathname === l.to || pathname.startsWith(l.to + '/'))
                  ? 'text-primary-500 border-primary-500'
                  : 'text-[var(--color-text-secondary)] border-transparent hover:text-primary-500 hover:border-primary-500/30'
              }`}
            >{l.label}</Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <NotificationBell />

          {isAuth ? (
            <div className="relative" ref={dropdownRef}>
              {isSignedIn ? (
                <div className="flex items-center gap-2 pl-2 border-l border-[var(--color-border)]">
                  <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-8 h-8 rounded-lg ring-2 ring-primary-500/30', userButtonTrigger: 'focus:shadow-none' }}} />
                  <button onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="text-sm font-semibold text-[var(--color-text-secondary)] max-w-[120px] truncate hover:text-primary-500 transition-colors"
                  >{displayName}</button>
                </div>
              ) : (
                <button onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 pl-2 border-l border-[var(--color-border)] group"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 group-hover:bg-primary-500/20 transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--color-text-secondary)] max-w-[100px] truncate group-hover:text-primary-500 transition-colors">{displayName}</span>
                </button>
              )}

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-xl rounded-2xl py-2 z-50"
                  >
                    {dropdownItems(localUser?.role).map((item, i) => {
                      const Icon = item.icon
                      return (
                        <button key={i} onClick={() => handleNav(item.to)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors text-left"
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          {item.label}
                        </button>
                      )
                    })}
                    <div className="border-t border-[var(--color-border)] my-1" />
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-danger)] hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      Đăng xuất
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link to="/auth"
              className="flex items-center gap-1.5 bg-primary-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-600 transition-all duration-200 shadow-md active:scale-[0.97]"
            ><LogIn className="w-4 h-4" />Đăng nhập</Link>
          )}
        </div>

        <button className="md:hidden p-2 rounded-xl text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors" onClick={() => setOpen(!open)} aria-label={open ? 'Đóng menu' : 'Mở menu'}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 space-y-1 shadow-xl">
          {[...navLinks, { to: '/bookings', label: 'Đặt chỗ' }, { to: '/optimal-route', label: 'Lộ trình' }, { to: '/profile', label: 'Hồ sơ' }].map(l => (
            <Link key={l.to} to={l.to}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                pathname === l.to || (l.to !== '/' && pathname.startsWith(l.to + '/'))
                  ? 'text-primary-500 bg-primary-500/10' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]'
              }`}
              onClick={() => setOpen(false)}
            >{l.label}</Link>
          ))}
          {localUser?.role === 'Admin' && (
            <Link to="/admin" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]" onClick={() => setOpen(false)}>
              <Shield className="w-4 h-4" />Quản trị
            </Link>
          )}
          <div className="pt-3 border-t border-[var(--color-border)] mt-2">
            {isAuth ? (
              <button onClick={() => { handleLogout(); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-border)]"
              ><LogOut className="w-4 h-4" />Đăng xuất</button>
            ) : (
              <Link to="/auth" className="flex items-center justify-center gap-2 bg-primary-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold" onClick={() => setOpen(false)}>
                <LogIn className="w-4 h-4" />Đăng nhập
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
