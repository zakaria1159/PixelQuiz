// src/components/ui/Button.tsx - True Pixel Art Version
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'
import { ButtonVariant, ButtonSize } from '@/types'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => {
    const baseClasses = 'pixel-button inline-flex items-center justify-center font-bold relative transition-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variantClasses = {
      primary: 'bg-blue-600 text-white border-blue-400 hover:bg-blue-500',
      secondary: 'bg-purple-600 text-white border-purple-400 hover:bg-purple-500',
      success: 'bg-green-600 text-white border-green-400 hover:bg-green-500',
      danger: 'bg-red-600 text-white border-red-400 hover:bg-red-500',
      warning: 'bg-yellow-600 text-black border-yellow-400 hover:bg-yellow-500',
      ghost: 'bg-gray-700 text-gray-100 border-gray-500 hover:bg-gray-600'
    }
    
    const sizeClasses = {
      sm: 'px-4 py-2 text-[12px]',
      md: 'px-6 py-3 text-[16px]',
      lg: 'px-8 py-4 text-[18px]',
      xl: 'px-12 py-6 text-[20px]'
    }

    return (
      <button
        className={clsx(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && (
          <div className="mr-3 text-[16px]">⟳</div>
        )}
        {icon && !loading && <span className="mr-3">{icon}</span>}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button