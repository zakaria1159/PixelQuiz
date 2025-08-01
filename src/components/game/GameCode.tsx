import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import Button from '@/components/ui/Button'

interface GameCodeProps {
  code: string
  size?: 'sm' | 'md' | 'lg'
}

const GameCode = ({ code, size = 'md' }: GameCodeProps) => {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const sizeClasses = {
    sm: 'text-lg px-4 py-2',
    md: 'text-2xl px-6 py-3',
    lg: 'text-4xl px-8 py-4'
  }

  return (
    <div className="text-center">
      <div className="mb-4">
        <div className={`bg-yellow-400 text-black font-bold rounded-lg inline-flex items-center ${sizeClasses[size]}`}>
          <span className="mr-3">🎮</span>
          <span>{code}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="ml-3 bg-black/20 hover:bg-black/30 text-black"
            icon={copied ? <Check size={16} /> : <Copy size={16} />}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </div>
      <p className="text-gray-300">Share this code with players to join!</p>
    </div>
  )
}

export default GameCode