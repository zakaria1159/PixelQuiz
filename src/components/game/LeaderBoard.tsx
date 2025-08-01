import { Player } from '@/types/player'
import PlayerCard from './PlayerCard'
import Card from '@/components/ui/Card'

interface LeaderboardProps {
  players: Player[]
  title?: string
  showRanks?: boolean
  maxPlayers?: number
  variant?: 'default' | 'compact' | 'detailed'
}

const Leaderboard = ({ 
  players, 
  title = 'Leaderboard', 
  showRanks = true, 
  maxPlayers,
  variant = 'default'
}: LeaderboardProps) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
  const displayPlayers = maxPlayers ? sortedPlayers.slice(0, maxPlayers) : sortedPlayers

  return (
    <Card variant="glass">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <div className="text-gray-300">
          {players.length} player{players.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="space-y-3">
        {displayPlayers.map((player, index) => (
          <PlayerCard
            key={player.id}
            player={player}
            rank={showRanks ? index + 1 : undefined}
            variant={variant}
            showScore={true}
            showStatus={false}
          />
        ))}
      </div>

      {maxPlayers && sortedPlayers.length > maxPlayers && (
        <div className="text-center mt-4 text-gray-400">
          ... and {sortedPlayers.length - maxPlayers} more players
        </div>
      )}
    </Card>
  )
}

export default Leaderboard