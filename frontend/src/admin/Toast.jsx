import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useAdmin } from './AdminContext'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors = {
  success: 'border-[var(--color-success)]/20 bg-[var(--color-success)]/10 text-[var(--color-success)]',
  error: 'border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
  warning: 'border-primary-200 bg-primary-50 text-primary-700',
  info: 'border-primary-200 bg-primary-50 text-primary-700',
}

const barColors = {
  success: 'bg-[var(--color-success)]',
  error: 'bg-[var(--color-danger)]',
  warning: 'bg-primary-400',
  info: 'bg-primary-400',
}

export default function ToastContainer() {
  const { toasts } = useAdmin()

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ toast: t }) {
  const [progress, setProgress] = useState(100)
  const Icon = icons[t.type] || icons.info

  useEffect(() => {
    const start = Date.now()
    const dur = 4000
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      setProgress(Math.max(0, 100 - (elapsed / dur) * 100))
      if (elapsed >= dur) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`pointer-events-auto relative overflow-hidden rounded-xl border ${colors[t.type] || colors.info} shadow-lg min-w-[320px] max-w-[420px]`}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
        <p className="text-sm font-medium flex-1">{t.message}</p>
      </div>
      <motion.div
        className={`absolute bottom-0 left-0 right-0 h-0.5 ${barColors[t.type] || barColors.info}`}
        style={{ width: `${progress}%` }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.1 }}
      />
    </motion.div>
  )
}
