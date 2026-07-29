import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { useAdmin } from './AdminContext'

export default function ConfirmDialog() {
  const { confirm, closeConfirm } = useAdmin()

  const handleConfirm = () => {
    if (confirm?.onConfirm) confirm.onConfirm()
    closeConfirm()
  }

  return (
    <AnimatePresence>
      {confirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={closeConfirm}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-sm bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-danger)]/10 flex items-center justify-center text-[var(--color-danger)] shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--color-text-primary)] text-sm">{confirm.title}</h3>
                  {confirm.message && (
                    <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{confirm.message}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 bg-[var(--color-bg)] border-t border-[var(--color-border)]">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={closeConfirm}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors"
              >
                Huỷ
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleConfirm}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[var(--color-danger)] hover:brightness-110 transition-all shadow-sm"
              >
                Xác nhận
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
