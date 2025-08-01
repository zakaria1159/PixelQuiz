import { Player } from '@/types/player'
import { clsx } from 'clsx'

interface PlayerCardProps {
  player: Player
  rank?: number
  showScore?: boolean
  showStatus?: boolean
  variant?: 'default' | 'compact' | 'detailed'
  onRemove?: () => void
}

const PlayerCard = ({ 
  player, 
  rank, 
  showScore = true, 
  showStatus = true, 
  variant = 'default',
  onRemove 
}: PlayerCardProps) => {
  const variantClasses = {
    default: 'p-4 bg-white/20 rounded-lg',
    compact: 'p-2 bg-white/10 rounded-md',
    detailed: 'p-6 bg-white/20 rounded-xl border border-white/10'
  }

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
  }

  return (
    <div className={clsx(
      'flex items-center justify-between transition-all duration-200',
      variantClasses[variant],
      !player.connected && 'opacity-50'
    )}>
      <div className="flex items-center space-x-3">
        {rank && (
          <div className="text-xl font-bold text-white min-w-[2rem]">
            {getRankEmoji(rank)}
          </div>
        )}
        <div className="text-2xl">{player.avatar}</div>
        <div>
          <div className={clsx(
            'font-medium',
            player.connected ? 'text-white' : 'text-gray-400'
          )}>
            {player.name}
            {player.isHost && (
              <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                HOST
              </span>
            )}
          </div>
          {showStatus && (
            <div className="text-sm text-gray-400">
              {player.connected ? (
                <span className="text-green-400">● Online</span>
              ) : (
                <span className="text-gray-500">● Offline</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {showScore && (
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {player.score.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">points</div>
          </div>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            ❌
          </button>
        )}
      </div>
    </div>
  )
}

export default PlayerCard