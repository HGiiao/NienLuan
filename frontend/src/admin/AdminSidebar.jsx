import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  TrendingUp, Plane, Train, Ticket, Users, BarChart3,
  ChevronLeft, Shield,
} from 'lucide-react'

const navItems = [
  { id: 'overview', label: 'Tổng quan', icon: TrendingUp, shortcut: '⌘1' },
  { id: 'flights', label: 'Chuyến bay', icon: Plane, shortcut: '⌘2' },
  { id: 'trains', label: 'Tàu hỏa', icon: Train, shortcut: '⌘3' },
  { id: 'bookings', label: 'Đặt chỗ', icon: Ticket, shortcut: '⌘4' },
  { id: 'users', label: 'Người dùng', icon: Users, shortcut: '⌘5' },
  { id: 'stats', label: 'Thống kê', icon: BarChart3, shortcut: '⌘6' },
]

export default function AdminSidebar({ activeTab, onTabChange, collapsed, onToggle }) {
  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative h-full bg-[var(--color-sidebar)] border-r border-[var(--color-border)] flex flex-col shrink-0 overflow-hidden"
    >
      <div className="flex items-center gap-3 h-16 px-4 border-b border-[var(--color-border)] shrink-0">
        <motion.div
          whileHover={{ scale: 1.05, rotate: -5 }}
          className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center shadow-sm shrink-0"
        >
          <Shield className="w-5 h-5 text-white" />
        </motion.div>
        <motion.span
          animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto' }}
          className="text-base font-bold text-[var(--color-text-primary)] whitespace-nowrap overflow-hidden"
        >
          Vé<span className="text-primary-500">247</span>
        </motion.span>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <motion.button
              key={item.id}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onTabChange(item.id)}
              className={`relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'text-primary-500 bg-[var(--color-sidebar-active)]'
                  : 'text-[var(--color-sidebar-text)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-sidebar-hover)]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 w-[3px] h-5 bg-primary-500 rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className={`w-[18px] h-[18px] shrink-0 transition-all ${isActive ? 'text-primary-500' : ''}`} />
              <motion.span
                animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto' }}
                className="whitespace-nowrap overflow-hidden text-left flex-1"
              >
                {item.label}
              </motion.span>
              {!collapsed && item.shortcut && (
                <span className="text-[10px] text-[var(--color-text-tertiary)] font-mono">{item.shortcut}</span>
              )}
            </motion.button>
          )
        })}
      </nav>

      <div className="p-2 border-t border-[var(--color-border)] shrink-0">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggle}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-sidebar-hover)] transition-colors text-xs font-medium"
        >
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.div>
          {!collapsed && <span>Thu gọn</span>}
        </motion.button>
      </div>
    </motion.aside>
  )
}
