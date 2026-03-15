import React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'default' | 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  style?: React.CSSProperties
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'default',
  width,
  height,
  style,
}) => {
  const computedStyle: React.CSSProperties = { ...style }
  if (width) computedStyle.width = typeof width === 'number' ? `${width}px` : width
  if (height) computedStyle.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={cn(
        'shimmer bg-bg-overlay',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-md',
        variant === 'text' && 'rounded-sm',
        variant === 'default' && 'rounded-md',
        className
      )}
      style={computedStyle}
    />
  )
}

export const MetricCardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('rounded-lg border border-border-subtle bg-bg-surface p-5', className)}>
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <Skeleton width={88} height={10} variant='text' />
        <Skeleton width={68} height={22} />
      </div>
      <Skeleton width={140} height={38} />
      <Skeleton width={110} height={13} variant='text' />
      <div className='border-t border-border-subtle pt-3'>
        <Skeleton width='100%' height={18} />
      </div>
    </div>
  </div>
)

export const FinanceTableSkeleton: React.FC<{
  rows?: number
  columns?: number
  className?: string
}> = ({ rows = 5, columns = 4, className }) => (
  <div className={cn('overflow-hidden rounded-lg border border-border-subtle bg-bg-surface', className)}>
    <div className='border-b border-border-subtle bg-bg-base px-4 py-3'>
      <div className='flex gap-4'>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} width={index === 0 ? 120 : 84} height={10} variant='text' />
        ))}
      </div>
    </div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div
        key={rowIndex}
        className={cn(
          'border-b border-border-subtle px-4 py-4 last:border-b-0',
          rowIndex % 2 === 0 ? 'bg-bg-surface' : 'bg-bg-elevated'
        )}
      >
        <div className='flex gap-4'>
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <Skeleton key={columnIndex} width={columnIndex === 0 ? 140 : 88} height={16} />
          ))}
        </div>
      </div>
    ))}
  </div>
)

export const ChartSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('rounded-lg border border-border-subtle bg-bg-surface p-5', className)}>
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <Skeleton width={180} height={14} variant='text' />
        <Skeleton width={74} height={22} />
      </div>
      <Skeleton width='100%' height={280} variant='rectangular' />
      <Skeleton width={180} height={10} variant='text' />
    </div>
  </div>
)

export const HeatmapSkeleton: React.FC<{ rows?: number; columns?: number; className?: string }> = ({
  rows = 5,
  columns = 5,
  className,
}) => (
  <div className={cn('rounded-lg border border-border-subtle bg-bg-surface p-5', className)}>
    <div className='space-y-4'>
      <Skeleton width={160} height={14} variant='text' />
      <div className='grid gap-1' style={{ gridTemplateColumns: `repeat(${columns + 1}, minmax(64px, 1fr))` }}>
        {Array.from({ length: (rows + 1) * (columns + 1) }).map((_, index) => (
          <Skeleton key={index} height={36} variant='rectangular' />
        ))}
      </div>
    </div>
  </div>
)

export default Skeleton
