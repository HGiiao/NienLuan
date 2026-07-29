import { motion } from 'framer-motion'

const variants = {
  primary: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30',
  accent: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30',
  ghost: 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white',
  danger: 'bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20',
  success: 'bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 text-[var(--color-success)] hover:bg-[var(--color-success)]/20',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

export default function Button({ children, variant = 'primary', size = 'md', className = '', icon: Icon, disabled, onClick, type = 'button', ...props }) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </motion.button>
  )
}
