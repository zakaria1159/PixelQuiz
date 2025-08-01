import { clsx } from 'clsx'

interface AnswerOptionsProps {
  options: string[]
  selectedAnswer?: number | undefined 
  correctAnswer?: number
  showResults?: boolean
  onAnswerSelect?: (index: number) => void
  disabled?: boolean
  timeLeft?: number
}

const AnswerOptions = ({
  options,
  selectedAnswer,
  correctAnswer,
  showResults = false,
  onAnswerSelect,
  disabled = false,
  timeLeft
}: AnswerOptionsProps) => {
  const getOptionStyle = (index: number) => {
    if (showResults) {
      if (index === correctAnswer) {
        return 'bg-green-600/30 border-green-400 text-green-100'
      }
      if (index === selectedAnswer && index !== correctAnswer) {
        return 'bg-red-600/30 border-red-400 text-red-100'
      }
      return 'bg-gray-600/20 border-gray-500 text-gray-400'
    }
    
    if (selectedAnswer === index) {
      return 'bg-blue-600/30 border-blue-400 text-blue-100 transform scale-[1.02]'
    }
    
    return 'bg-white/20 hover:bg-white/30 border-white/30 cursor-pointer transform hover:scale-[1.02]'
  }

  const isDisabled = disabled || showResults || timeLeft === 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => !isDisabled && onAnswerSelect?.(index)}
          disabled={isDisabled}
          className={clsx(
            'p-6 rounded-lg border-2 transition-all duration-200 text-left',
            getOptionStyle(index),
            isDisabled && 'cursor-not-allowed'
          )}
        >
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold bg-white/20 rounded-full w-12 h-12 flex items-center justify-center">
              {String.fromCharCode(65 + index)}
            </div>
            <div className="text-lg font-medium flex-1">
              {option}
            </div>
            {showResults && index === correctAnswer && (
              <div className="text-green-400 text-2xl">✓</div>
            )}
            {showResults && index === selectedAnswer && index !== correctAnswer && (
              <div className="text-red-400 text-2xl">✗</div>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

export default AnswerOptions