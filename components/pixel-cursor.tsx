'use client'

import { useEffect, useRef } from 'react'

const PIXELS = [
  { size: 9, color: '#60a5fa', ease: 0.25 },
  { size: 7, color: '#3b82f6', ease: 0.18 },
  { size: 6, color: '#2563eb', ease: 0.13 },
  { size: 5, color: '#1d4ed8', ease: 0.09 },
]

export function PixelCursor() {
  const refs = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const pos = PIXELS.map(() => ({ x: target.x, y: target.y }))
    let raf = 0

    const onMove = (e: MouseEvent) => { target.x = e.clientX; target.y = e.clientY }
    window.addEventListener('mousemove', onMove)

    const tick = () => {
      let leadX = target.x, leadY = target.y
      PIXELS.forEach((p, i) => {
        pos[i].x += (leadX - pos[i].x) * p.ease
        pos[i].y += (leadY - pos[i].y) * p.ease
        const el = refs.current[i]
        if (el) el.style.transform = `translate(${pos[i].x - p.size / 2}px, ${pos[i].y - p.size / 2}px)`
        leadX = pos[i].x; leadY = pos[i].y
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('mousemove', onMove) }
  }, [])

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 40 }}>
      {PIXELS.map((p, i) => (
        <span
          key={i}
          ref={(el) => { refs.current[i] = el }}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: p.size, height: p.size, background: p.color,
            borderRadius: 2, opacity: 0.9 - i * 0.15, willChange: 'transform',
          }}
        />
      ))}
    </div>
  )
}
