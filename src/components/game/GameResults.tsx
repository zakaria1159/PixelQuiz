'use client'

import Card from '@/components/ui/Card'

interface GameResultsProps {
  gameState: any
  currentPlayer: any
  isHost: boolean
}

export function GameResults({ gameState, currentPlayer, isHost }: GameResultsProps) {
  if (!gameState?.finalResults) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-blue-900 to-black">
        <Card className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <h2 className="text-xl font-bold mb-4 text-white">Loading Results...</h2>
          <p className="text-gray-300">Please wait while we calculate the final scores</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-blue-900 to-black">
      <Card className="w-full max-w-7xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-white mb-2">🏆 Game Results</h2>
          <p className="text-gray-300">
            {isHost ? 'Final standings and detailed analysis' : 'Final standings and your performance'}
          </p>
        </div>

        {/* Enhanced Leaderboard */}
        <div className="mb-8">
          <h3 className="text-2xl font-semibold mb-6 text-white">🏅 Leaderboard</h3>
          <div className="space-y-4">
            {gameState.finalResults.map((result: any, index: number) => (
              <div key={result.playerId} className={`flex justify-between items-center p-6 border-2 rounded-lg ${
                result.playerId === currentPlayer?.id ? 'bg-blue-900/30 border-blue-400' :
                index === 0 ? 'bg-yellow-900/30 border-yellow-400' :
                index === 1 ? 'bg-gray-700/30 border-gray-400' :
                index === 2 ? 'bg-orange-900/30 border-orange-400' :
                'bg-gray-700 border-gray-600'
              }`}>
                <div className="flex items-center">
                  <span className="text-3xl mr-4">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                  </span>
                  <div>
                    <span className="font-bold text-white text-lg">{result.playerName}</span>
                    {result.playerId === currentPlayer?.id && (
                      <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 border border-blue-400">YOU</span>
                    )}
                    <div className="text-sm text-gray-300">
                      Total time: {(result.totalTime / 1000).toFixed(1)}s
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{result.score} pts</div>
                  <div className="text-sm text-gray-300">
                    {result.questionResults.filter((q: any) => q.isCorrect).length}/{result.questionResults.length} correct
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Question Analysis - Show all players for host, only current player for others */}
        <div className="mb-8">
          <h3 className="text-2xl font-semibold mb-6 text-white">
            {isHost ? '📊 Detailed Question Analysis' : '📊 Your Performance'}
          </h3>
          <div className="space-y-6">
            {gameState.finalResults
              .filter((result: any) => isHost || result.playerId === currentPlayer?.id)
              .map((result: any) => (
                <div key={result.playerId} className={`border-2 rounded-lg p-6 ${
                  result.playerId === currentPlayer?.id 
                    ? 'border-blue-400 bg-blue-900/20' 
                    : 'border-gray-600 bg-gray-700'
                }`}>
                  <h4 className="font-bold text-xl mb-4 text-white">
                    {result.playerName} {result.playerId === currentPlayer?.id ? '(You)' : ''}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {result.questionResults.map((qResult: any) => {
                      const questionScore = gameState.questionScores?.[qResult.questionIndex]?.[result.playerId] || 0
                      const wasChallenged = gameState.challenges?.some((c: any) => c.questionIndex === qResult.questionIndex)
                      const challengeResult = wasChallenged ? gameState.challenges?.find((c: any) => c.questionIndex === qResult.questionIndex) : null
                      
                      // Only show challenge info to the challenger on their specific question
                      const isChallenger = challengeResult?.challengerId === currentPlayer?.id
                      const shouldShowChallenge = wasChallenged && isChallenger && challengeResult?.challengerId === currentPlayer?.id
                      
                      return (
                        <div key={qResult.questionIndex} className={`text-sm p-4 border-2 rounded-lg h-40 flex flex-col justify-between ${
                          qResult.isCorrect ? 'border-green-400 bg-green-900/20' : 'border-red-400 bg-red-900/20'
                        }`}>
                          <div className="font-bold text-white">Q{qResult.questionIndex + 1}</div>
                          <div className={`text-xs font-bold ${qResult.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                            {qResult.isCorrect ? '✅ Correct' : '❌ Wrong'}
                          </div>
                          <div className="text-xs text-gray-300">
                            Time: {(qResult.time / 1000).toFixed(1)}s
                          </div>
                          <div className="text-xs text-gray-300">
                            Points: <span className="font-bold text-white">{questionScore}</span>
                          </div>
                          <div className="text-xs text-gray-300">
                            Answer: <span className="font-bold">{qResult.playerAnswerText}</span>
                          </div>
                          {shouldShowChallenge && (
                            <div className="text-xs text-yellow-400 font-bold">
                              🏛️ Challenge: {challengeResult?.passed ? 'Accepted' : 'Rejected'}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Challenge Summary - Only show challenges where current player was challenger */}
        {gameState.challenges && gameState.challenges.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-6 text-white">🏛️ Challenge Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gameState.challenges
                .filter((challenge: any) => challenge.challengerId === currentPlayer?.id)
                .map((challenge: any, index: number) => (
                <div key={challenge.id} className="p-4 border-2 border-yellow-400 rounded-lg bg-yellow-900/20">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-yellow-400 font-bold">Q{challenge.questionIndex + 1}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      challenge.passed ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                      {challenge.passed ? 'Accepted' : 'Rejected'}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">{challenge.explanation}</p>
                  <div className="text-xs text-gray-400">
                    Votes: {challenge.votes?.approve || 0} approve, {challenge.votes?.reject || 0} reject
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="text-center">
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            🏠 Back to Home
          </button>
        </div>
      </Card>
    </div>
  )
} 