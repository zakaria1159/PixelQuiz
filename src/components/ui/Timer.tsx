import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { TimerProps } from '@/types'

const Timer = ({ timeLeft, totalTime, onTimeUp, variant = 'circular', size = 'md' }: TimerProps) => {
  const [prevTimeLeft, setPrevTimeLeft] = useState(timeLeft)

  useEffect(() => {
    if (timeLeft === 0 && prevTimeLeft > 0) onTimeUp()
    setPrevTimeLeft(timeLeft)
  }, [timeLeft, prevTimeLeft, onTimeUp])

  const percentage = (timeLeft / totalTime) * 100
  const isWarning  = timeLeft <= 5
  const isCritical = timeLeft <= 3

  const colorClass = isCritical ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-blue-400'
  const barClass   = isCritical ? 'bg-red-500'   : isWarning ? 'bg-yellow-500'   : 'bg-blue-500'

  const sizeClasses = { sm: 'w-16 h-16 text-xs', md: 'w-24 h-24 text-sm', lg: 'w-32 h-32 text-base' }

  if (variant === 'circular') {
    return (
      <div className={clsx('relative bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden flex items-center justify-center', sizeClasses[size])}>
        <div className={clsx('absolute bottom-0 left-0 right-0 transition-all duration-1000', barClass)} style={{ height: `${percentage}%` }} />
        <span className={clsx('relative z-10 font-bold tabular-nums', colorClass)}>{timeLeft}</span>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex justify-center mb-2">
        <span className={clsx('text-3xl font-black tabular-nums', colorClass)}>{timeLeft}</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={clsx('h-full transition-all duration-1000 rounded-full', barClass)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

export default Timer
