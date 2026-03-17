import { clsx } from 'clsx'
import { CardProps } from '@/types'

const Card = ({ children, className, variant = 'default' }: CardProps) => {
  const variantClasses = {
    default: 'bg-zinc-900 border-zinc-800',
    glass:   'bg-zinc-900/80 backdrop-blur-sm border-zinc-800',
    solid:   'bg-zinc-950 border-zinc-800',
  }

  return (
    <div className={clsx('card', variantClasses[variant], className)}>
      {children}
    </div>
  )
}

export default Card
