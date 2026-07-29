import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AdminThemeToggle() {
  const [theme, setTheme] = useState(() => localStorage.getItem('ve247-theme') || 'dark')

  useEffect(() => {
    localStorage.setItem('ve247-theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggle}
      className="relative w-9 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-center hover:bg-[var(--color-border)] transition-colors"
      title={theme === 'dark' ? 'Sáng' : 'Tối'}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.2 }}
      >
        {theme === 'dark' ? (
          <Sun className="w-4 h-4 text-primary-500" />
        ) : (
          <Moon className="w-4 h-4 text-[var(--color-text-secondary)]" />
        )}
      </motion.div>
    </motion.button>
  )
}
