import React from 'react'
import { cn } from '@/lib/utils'
import { PremiumCard, AccentColor } from './premium-card'
import { DataValue, DataValueColorMode, DataValueType } from './data-value'

interface SparklinePoint {
  value: number
}

interface MetricCardProps {
  label: string
  value: number
  valueType?: DataValueType
  colorMode?: DataValueColorMode
  secondaryInfo?: string
  badge?: string
  badgeColor?: AccentColor
  sparkline?: SparklinePoint[]
  accentColor?: AccentColor
  className?: string
  precision?: number
}

const badgeClassMap: Record<AccentColor, string> = {
  primary: 'border-accent-primary/30 bg-accent-primary/12 text-accent-primary',
  cyan: 'border-accent-cyan/30 bg-accent-cyan/12 text-accent-cyan',
  violet: 'border-accent-violet/30 bg-accent-violet/12 text-accent-violet',
  emerald: 'border-accent-emerald/30 bg-accent-emerald/12 text-accent-emerald',
  rose: 'border-accent-rose/30 bg-accent-rose/12 text-accent-rose',
  amber: 'border-accent-amber/30 bg-accent-amber/12 text-accent-amber',
}

function Sparkline({ data }: { data: SparklinePoint[] }) {
  if (!data.length) return null

  const max = Math.max(...data.map((point) => point.value))
  const min = Math.min(...data.map((point) => point.value))
  const range = max - min || 1

  return (
    <div className='flex items-end gap-0.5'>
      {data.map((point, index) => {
        const height = ((point.value - min) / range) * 18 + 4
        return (
          <span
            key={`${point.value}-${index}`}
            className='w-1 rounded-full bg-text-secondary/70'
            style={{ height }}
          />
        )
      })}
    </div>
  )
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  valueType = 'number',
  colorMode = 'default',
  secondaryInfo,
  badge,
  badgeColor = 'primary',
  sparkline,
  accentColor = 'primary',
  className,
  precision,
}) => {
  return (
    <PremiumCard accentColor={accentColor} className={cn('min-h-[174px]', className)}>
      <div className='flex h-full flex-col justify-between gap-4'>
        <div className='flex items-start justify-between gap-3'>
          <p className='font-ui text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted'>
            {label}
          </p>
          {badge ? (
            <span
              className={cn(
                'inline-flex items-center rounded border px-2 py-1 font-ui text-[10px] font-semibold uppercase tracking-[0.08em]',
                badgeClassMap[badgeColor]
              )}
            >
              {badge}
            </span>
          ) : null}
        </div>

        <div className='space-y-2'>
          <DataValue
            value={value}
            type={valueType}
            size='lg'
            colorMode={colorMode}
            precision={precision}
          />
          {secondaryInfo ? (
            <p className='font-ui text-[13px] text-text-secondary'>{secondaryInfo}</p>
          ) : null}
        </div>

        {sparkline?.length ? (
          <div className='flex items-center justify-between border-t border-border-subtle pt-3'>
            <Sparkline data={sparkline} />
            <span className='font-ui text-[11px] text-text-muted'>vs prev</span>
          </div>
        ) : null}
      </div>
    </PremiumCard>
  )
}

export default MetricCard
