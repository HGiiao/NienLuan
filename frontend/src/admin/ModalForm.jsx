import { motion, AnimatePresence } from 'framer-motion'
import { X, Save } from 'lucide-react'

export default function ModalForm({ open, onClose, title, icon: Icon, children, onSubmit, loading, submitLabel = 'Lưu thay đổi', size = 'md' }) {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-12 pb-8 bg-black/40 backdrop-blur-sm overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={`w-full ${sizeClasses[size]} bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                {Icon && (
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-500">
                    <Icon className="w-4 h-4" />
                  </div>
                )}
                <h2 className="text-sm font-bold text-[var(--color-text-primary)]">{title}</h2>
              </div>
              <motion.button
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-7 h-7 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-border)] flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
              </motion.button>
            </div>

            <form onSubmit={onSubmit} className="p-6 space-y-4">
              {children}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-[var(--color-bg)] hover:bg-[var(--color-border)] transition-colors"
                  disabled={loading}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-all shadow-sm disabled:opacity-50"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {submitLabel}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
