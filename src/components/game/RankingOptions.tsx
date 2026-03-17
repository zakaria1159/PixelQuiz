'use client'

import { useState, useRef, useEffect } from 'react'

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
  timeLeft,
}: RankingOptionsProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const touchDragFrom = useRef<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  if (!items || items.length === 0) return null

  const currentOrder = selectedOrder ?? Array.from({ length: items.length }, (_, i) => i)
  const isDisabled = disabled || showResults || timeLeft === 0

  // ─── Mouse drag (desktop) ───────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isDisabled) return
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (isDisabled) return
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (isDisabled || draggedIndex === null) return
    reorder(draggedIndex, dropIndex)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // ─── Touch drag (mobile) ────────────────────────────────────────────────────
  const handleTouchStart = (index: number) => {
    if (isDisabled) return
    touchDragFrom.current = index
    setDraggedIndex(index)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDisabled || touchDragFrom.current === null) return
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const itemEl = el?.closest('[data-rank-pos]')
    if (itemEl) {
      const pos = parseInt(itemEl.getAttribute('data-rank-pos') ?? '-1')
      if (pos !== -1) setDragOverIndex(pos)
    }
  }

  const handleTouchEnd = () => {
    if (touchDragFrom.current !== null && dragOverIndex !== null && touchDragFrom.current !== dragOverIndex) {
      reorder(touchDragFrom.current, dragOverIndex)
    }
    touchDragFrom.current = null
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // ─── Up / Down buttons (mobile fallback) ───────────────────────────────────
  const moveItem = (fromPos: number, toPos: number) => {
    if (isDisabled || toPos < 0 || toPos >= currentOrder.length) return
    reorder(fromPos, toPos)
  }

  // ─── Core reorder ──────────────────────────────────────────────────────────
  const reorder = (from: number, to: number) => {
    if (from === to) return
    const next = [...currentOrder]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onOrderChange?.(next)
  }

  // ─── Item styles ───────────────────────────────────────────────────────────
  const getStyle = (position: number, itemIndex: number) => {
    if (showResults) {
      const correct = correctOrder?.[position] === itemIndex
      if (correct) return { bg: 'rgba(22,163,74,0.25)', border: '2px solid rgba(74,222,128,0.6)', color: '#86efac' }
      const selected = selectedOrder?.[position] === itemIndex
      if (selected) return { bg: 'rgba(220,38,38,0.2)', border: '2px solid rgba(248,113,113,0.5)', color: '#fca5a5' }
      return { bg: 'rgba(255,255,255,0.04)', border: '2px solid rgba(255,255,255,0.1)', color: '#52525b' }
    }
    if (draggedIndex === position) return { bg: 'rgba(99,102,241,0.25)', border: '2px solid rgba(99,102,241,0.6)', color: '#a5b4fc', opacity: 0.5 }
    if (dragOverIndex === position && draggedIndex !== position) return { bg: 'rgba(99,102,241,0.15)', border: '2px dashed rgba(165,180,252,0.7)', color: '#c7d2fe' }
    return { bg: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.12)', color: 'white' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', userSelect: 'none' }}>
      <p style={{ fontSize: '12px', color: '#71717a', textAlign: 'center', marginBottom: '4px' }}>
        {showResults ? 'Correct order:' : '↕ Drag or use arrows to reorder'}
      </p>

      <div
        ref={listRef}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        {currentOrder.map((itemIndex, position) => {
          const s = getStyle(position, itemIndex)
          return (
            <div
              key={itemIndex}
              data-rank-pos={position}
              draggable={!isDisabled}
              onDragStart={e => handleDragStart(e, position)}
              onDragOver={e => handleDragOver(e, position)}
              onDrop={e => handleDrop(e, position)}
              onDragEnd={handleDragEnd}
              onTouchStart={() => handleTouchStart(position)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '12px',
                background: s.bg,
                border: s.border,
                color: s.color,
                opacity: draggedIndex === position ? 0.5 : 1,
                transition: 'background 0.15s, border 0.15s',
                cursor: isDisabled ? 'default' : 'grab',
                touchAction: 'none',
              }}
            >
              {/* Position number */}
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 800, flexShrink: 0,
              }}>
                {position + 1}
              </div>

              {/* Item label */}
              <div style={{ flex: 1, fontSize: '14px', fontWeight: 600 }}>
                {items[itemIndex]}
              </div>

              {/* Result icons */}
              {showResults && correctOrder?.[position] === itemIndex && (
                <span style={{ fontSize: '18px' }}>✓</span>
              )}
              {showResults && selectedOrder?.[position] === itemIndex && correctOrder?.[position] !== itemIndex && (
                <span style={{ fontSize: '18px' }}>✗</span>
              )}

              {/* Up / Down buttons (visible, good for mobile) */}
              {!isDisabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                  <button
                    onPointerDown={e => { e.stopPropagation(); moveItem(position, position - 1) }}
                    disabled={position === 0}
                    style={{
                      width: '28px', height: '24px', borderRadius: '6px',
                      background: position === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)',
                      border: 'none', color: position === 0 ? '#3f3f46' : 'white',
                      cursor: position === 0 ? 'default' : 'pointer',
                      fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >▲</button>
                  <button
                    onPointerDown={e => { e.stopPropagation(); moveItem(position, position + 1) }}
                    disabled={position === currentOrder.length - 1}
                    style={{
                      width: '28px', height: '24px', borderRadius: '6px',
                      background: position === currentOrder.length - 1 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)',
                      border: 'none', color: position === currentOrder.length - 1 ? '#3f3f46' : 'white',
                      cursor: position === currentOrder.length - 1 ? 'default' : 'pointer',
                      fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >▼</button>
                </div>
              )}

              {/* Drag handle */}
              {!isDisabled && (
                <div style={{ color: '#52525b', fontSize: '16px', flexShrink: 0, cursor: 'grab' }}>⋮⋮</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default RankingOptions
