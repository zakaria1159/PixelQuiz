'use client'

import { useEffect, useRef } from 'react'

interface PixelRevealImageProps {
  src: string
  pixelSize: number  // 1 = full resolution, 32 = very blocky
  className?: string
}

export default function PixelRevealImage({ src, pixelSize, className }: PixelRevealImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const pixelSizeRef = useRef(pixelSize)

  // Keep ref in sync so draw() always uses the latest value
  pixelSizeRef.current = pixelSize

  const draw = () => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const size = Math.max(1, Math.round(pixelSizeRef.current))

    // "Contain" fit — preserve aspect ratio, center image, no cropping
    const imgAspect = img.naturalWidth / img.naturalHeight
    const canvasAspect = W / H
    let drawW: number, drawH: number, drawX: number, drawY: number
    if (imgAspect > canvasAspect) {
      drawW = W
      drawH = W / imgAspect
      drawX = 0
      drawY = (H - drawH) / 2
    } else {
      drawH = H
      drawW = H * imgAspect
      drawX = (W - drawW) / 2
      drawY = 0
    }

    ctx.clearRect(0, 0, W, H)

    if (size === 1) {
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(img, drawX, drawY, drawW, drawH)
      return
    }

    // Pixelate: render at reduced size then scale back up with no smoothing
    const smallW = Math.max(1, Math.floor(drawW / size))
    const smallH = Math.max(1, Math.floor(drawH / size))

    const offscreen = document.createElement('canvas')
    offscreen.width = smallW
    offscreen.height = smallH
    const offCtx = offscreen.getContext('2d')!
    offCtx.drawImage(img, 0, 0, smallW, smallH)

    ctx.imageSmoothingEnabled = false
    ctx.drawImage(offscreen, 0, 0, smallW, smallH, drawX, drawY, drawW, drawH)
  }

  // Load image once
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src
    img.onload = () => {
      imgRef.current = img
      draw()
    }
    return () => { img.onload = null }
  }, [src])

  // Redraw whenever pixelSize changes
  useEffect(() => {
    draw()
  }, [pixelSize])

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={320}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
