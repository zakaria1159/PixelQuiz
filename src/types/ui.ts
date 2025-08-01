export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

export interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'glass' | 'solid'
}

export interface TimerProps {
  timeLeft: number
  totalTime: number
  onTimeUp: () => void
  variant?: 'circular' | 'linear'
  size?: 'sm' | 'md' | 'lg'
}