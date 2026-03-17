import { ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'
import { ButtonVariant, ButtonSize } from '@/types'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-purple-600 hover:bg-purple-500 text-white border border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]',
  secondary: 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700',
  success:   'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/50',
  danger:    'bg-red-600 hover:bg-red-500 text-white border border-red-500/50',
  warning:   'bg-amber-500 hover:bg-amber-400 text-black border border-amber-400/50',
  ghost:     'bg-transparent hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-sm',
  xl: 'px-8 py-4 text-base',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'btn font-semibold',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading && <span className="mr-2 animate-spin inline-block">↻</span>}
      {icon && !loading && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  )
)

Button.displayName = 'Button'
export default Button
