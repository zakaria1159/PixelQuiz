import { clsx } from 'clsx'
import { CardProps } from '@/types'

const Card = ({ children, className, variant = 'default' }: CardProps) => {
  const variantClasses = {
    default: 'pixel-card bg-gray-800 text-white border-gray-600',
    glass: 'pixel-card bg-gray-800/90 backdrop-blur-sm text-white border-gray-600',
    solid: 'pixel-card bg-gray-900 text-white border-gray-700'
  }

  return (
    <div className={clsx(
      variantClasses[variant],
      'screen-flicker',
      className
    )}>
      {children}
    </div>
  )
}

export default Card