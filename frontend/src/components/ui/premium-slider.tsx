import React from 'react'
import { cn } from '@/lib/utils'

interface TickMark {
  value: number
  label?: string
}

interface PremiumSliderProps {
  min: number
  max: number
  value: number[]
  onChange: (value: number[]) => void
  step?: number
  tickMarks?: TickMark[]
  formatValue?: (value: number) => string
  className?: string
  disabled?: boolean
}

export const PremiumSlider: React.FC<PremiumSliderProps> = ({
  min,
  max,
  value,
  onChange,
  step = 1,
  tickMarks = [],
  formatValue = (current) => current.toString(),
  className,
  disabled = false,
}) => {
  const sliderRef = React.useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const currentValue = value[0] ?? min
  const percentage = ((currentValue - min) / (max - min)) * 100

  const setValueFromClientX = React.useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return
      const rect = sliderRef.current.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const next = min + ratio * (max - min)
      const rounded = Math.round(next / step) * step
      onChange([Math.max(min, Math.min(max, rounded))])
    },
    [max, min, onChange, step]
  )

  React.useEffect(() => {
    if (!isDragging) return

    const handleMove = (event: MouseEvent) => setValueFromClientX(event.clientX)
    const handleUp = () => setIsDragging(false)

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)

    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [isDragging, setValueFromClientX])

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    let next = currentValue

    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next -= step
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next += step
    if (event.key === 'Home') next = min
    if (event.key === 'End') next = max

    if (next !== currentValue) {
      event.preventDefault()
      onChange([Math.max(min, Math.min(max, next))])
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <div
        ref={sliderRef}
        className={cn(
          'relative h-2.5 rounded-full bg-bg-overlay',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        )}
        onMouseDown={(event) => {
          if (disabled) return
          setIsDragging(true)
          setValueFromClientX(event.clientX)
        }}
      >
        <div
          className='absolute inset-y-0 left-0 rounded-full bg-accent-primary'
          style={{ width: `${percentage}%` }}
        />

        {tickMarks.map((tick) => {
          const tickPercent = ((tick.value - min) / (max - min)) * 100
          return (
            <span
              key={tick.value}
              className='absolute top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-border-strong'
              style={{ left: `${tickPercent}%` }}
            />
          )
        })}

        <div
          role='slider'
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={currentValue}
          aria-valuetext={formatValue(currentValue)}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={onKeyDown}
          className={cn(
            'absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent-primary ring-2 ring-accent-primary/20 transition-transform',
            isDragging && 'scale-110'
          )}
          style={{ left: `${percentage}%` }}
        />
      </div>

      {tickMarks.length ? (
        <div className='relative mt-3 h-4'>
          {tickMarks.map((tick) => {
            const tickPercent = ((tick.value - min) / (max - min)) * 100
            return (
              <span
                key={`${tick.value}-label`}
                className='absolute -translate-x-1/2 font-mono text-[10px] text-text-muted'
                style={{ left: `${tickPercent}%` }}
              >
                {tick.label ?? formatValue(tick.value)}
              </span>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default PremiumSlider
