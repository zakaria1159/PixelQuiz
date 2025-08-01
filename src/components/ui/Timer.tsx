import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { TimerProps } from '@/types'

const Timer = ({ 
  timeLeft, 
  totalTime, 
  onTimeUp, 
  variant = 'circular', 
  size = 'md' 
}: TimerProps) => {
  const [prevTimeLeft, setPrevTimeLeft] = useState(timeLeft)

  useEffect(() => {
    if (timeLeft === 0 && prevTimeLeft > 0) {
      onTimeUp()
    }
    setPrevTimeLeft(timeLeft)
  }, [timeLeft, prevTimeLeft, onTimeUp])

  const percentage = (timeLeft / totalTime) * 100
  const isWarning = timeLeft <= 5
  const isCritical = timeLeft <= 3

  const sizeClasses = {
    sm: 'w-16 h-16 text-[10px]',
    md: 'w-24 h-24 text-[14px]',
    lg: 'w-32 h-32 text-[18px]'
  }

  if (variant === 'circular') {
    return (
      <div className={clsx('relative pixel-border', sizeClasses[size])}>
        <div className="w-full h-full bg-gray-900 flex items-center justify-center relative overflow-hidden">
          {/* Pixel-style progress bar */}
          <div 
            className={clsx(
              'absolute bottom-0 left-0 right-0 transition-all duration-1000',
              isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-blue-500'
            )}
            style={{ height: `${percentage}%` }}
          />
          
          {/* Time display */}
          <div className={clsx(
            'relative z-10 font-bold pixel-glow',
            isCritical ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-blue-400'
          )}>
            {timeLeft}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex justify-center mb-2">
        <span className={clsx(
          'text-[32px] font-bold pixel-glow',
          isCritical ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-blue-400'
        )}>
          {timeLeft}
        </span>
      </div>
      <div className="pixel-border h-4 bg-gray-900 overflow-hidden">
        <div 
          className={clsx(
            'h-full transition-all duration-1000',
            isCritical ? 'bg-red-500 pixel-glow' : isWarning ? 'bg-yellow-500 pixel-glow' : 'bg-blue-500 pixel-glow'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default Timer