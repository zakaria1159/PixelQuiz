'use client'

import { useState, useRef } from 'react'
import clsx from 'clsx'

interface RankingOptionsProps {
  items: string[]
  selectedOrder?: number[]
  correctOrder?: number[]
  showResults?: boolean
  onOrderChange?: (order: number[]) => void
  disabled?: boolean
  timeLeft?: number
}

const RankingOptions = ({
  items,
  selectedOrder,
  correctOrder,
  showResults = false,
  onOrderChange,
  disabled = false,
  timeLeft
}: RankingOptionsProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragRef = useRef<HTMLDivElement>(null)

  // Debug logging
  console.log('RankingOptions rendered with:', { items, selectedOrder, disabled, showResults, timeLeft })
  
  // Early return if no items
  if (!items || items.length === 0) {
    console.log('RankingOptions: No items provided')
    return (
      <div className="border-2 border-yellow-500 p-4">
        <p className="text-yellow-500 font-bold">NO ITEMS PROVIDED TO RANKING OPTIONS</p>
        <p className="text-yellow-500">Items: {JSON.stringify(items)}</p>
      </div>
    )
  }

  // Initialize order if not provided
  const currentOrder = selectedOrder || Array.from({ length: items.length }, (_, i) => i)
  
  // Debug logging for currentOrder
  console.log('RankingOptions: currentOrder =', currentOrder)
  console.log('RankingOptions: items =', items)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (disabled || showResults) return
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (disabled || showResults) return
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (disabled || showResults || draggedIndex === null) return
    
    const newOrder = [...currentOrder]
    const [draggedItem] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(dropIndex, 0, draggedItem)
    
    onOrderChange?.(newOrder)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const getItemStyle = (index: number, itemIndex: number) => {
    const isDragging = draggedIndex === index
    const isDragOver = dragOverIndex === index && draggedIndex !== index
    
    if (showResults) {
      const isCorrect = correctOrder?.[index] === itemIndex
      const isSelected = selectedOrder?.[index] === itemIndex
      
      if (isCorrect) {
        return 'bg-green-600/30 border-green-400 text-green-100'
      }
      if (isSelected && !isCorrect) {
        return 'bg-red-600/30 border-red-400 text-red-100'
      }
      return 'bg-gray-600/20 border-gray-500 text-gray-400'
    }
    
    if (isDragging) {
      return 'bg-blue-600/30 border-blue-400 text-blue-100 opacity-50'
    }
    
    if (isDragOver) {
      return 'bg-blue-600/20 border-blue-300 text-blue-100 border-dashed'
    }
    
    return 'bg-white/20 hover:bg-white/30 border-white/30 cursor-move'
  }

  const isDisabled = disabled || showResults || timeLeft === 0

  return (
    <div className="space-y-3">
      <div className="text-center mb-4">
        <p className="text-gray-300 text-lg">
          {showResults ? 'Correct Order:' : 'Drag to reorder (earliest to latest):'}
        </p>
        <p className="text-red-500 text-sm">DEBUG: Items count: {items?.length || 0}</p>
        <p className="text-red-500 text-sm">DEBUG: Items: {JSON.stringify(items)}</p>
      </div>
      
            {/* REAL DRAG-AND-DROP FUNCTIONALITY */}
      <div className="space-y-2">
        {currentOrder.map((itemIndex, position) => {
          console.log(`Rendering item ${position}: itemIndex=${itemIndex}, item=${items[itemIndex]}`)
          return (
            <div
              key={itemIndex}
              ref={dragRef}
              draggable={!isDisabled}
              onDragStart={(e) => handleDragStart(e, position)}
              onDragOver={(e) => handleDragOver(e, position)}
              onDrop={(e) => handleDrop(e, position)}
              onDragEnd={handleDragEnd}
              className={clsx(
                'p-4 rounded-lg border-2 transition-all duration-200',
                getItemStyle(position, itemIndex),
                isDisabled && 'cursor-not-allowed'
              )}
            >
              <div className="flex items-center space-x-4">
                <div className="text-xl font-bold bg-white/20 rounded-full w-10 h-10 flex items-center justify-center">
                  {position + 1}
                </div>
                <div className="text-lg font-medium flex-1">
                  {items[itemIndex]}
                </div>
                {showResults && correctOrder?.[position] === itemIndex && (
                  <div className="text-green-400 text-2xl">✓</div>
                )}
                {showResults && selectedOrder?.[position] === itemIndex && correctOrder?.[position] !== itemIndex && (
                  <div className="text-red-400 text-2xl">✗</div>
                )}
                {!isDisabled && (
                  <div className="text-gray-400 text-lg">⋮⋮</div>
                )}
              </div>
            </div>
          )
        })}
             </div>
      
      {!showResults && (
        <div className="text-center mt-4">
          <p className="text-gray-400 text-sm">
            Tip: Drag items to reorder them chronologically
          </p>
        </div>
      )}
    </div>
  )
}

export default RankingOptions 