import React from 'react'
import { cn } from '@/lib/utils'

export type DataValueType = 'currency' | 'percentage' | 'number' | 'basis-points'
export type DataValueSize = 'sm' | 'md' | 'lg' | 'xl'
export type DataValueColorMode = 'auto' | 'positive' | 'negative' | 'neutral' | 'default'

interface DataValueProps {
  value: number
  type?: DataValueType
  size?: DataValueSize
  colorMode?: DataValueColorMode
  precision?: number
  prefix?: string
  suffix?: string
  className?: string
  showSign?: boolean
}

const formatValue = (
  value: number,
  type: DataValueType,
  precision?: number,
  showSign?: boolean
): string => {
  const sign = showSign && value > 0 ? '+' : ''

  switch (type) {
    case 'currency':
      return `${sign}${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: precision ?? 2,
        maximumFractionDigits: precision ?? 2,
      }).format(value)}`
    case 'percentage':
      return `${sign}${new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: precision ?? 1,
        maximumFractionDigits: precision ?? 1,
      }).format(value)}`
    case 'basis-points':
      return `${sign}${(value * 10000).toFixed(precision ?? 0)}bp`
    case 'number':
    default:
      return `${sign}${new Intl.NumberFormat('en-US', {
        minimumFractionDigits: precision ?? 0,
        maximumFractionDigits: precision ?? 2,
      }).format(value)}`
  }
}

const getColorClass = (value: number, colorMode: DataValueColorMode): string => {
  if (colorMode === 'auto') {
    if (value > 0) return 'text-positive'
    if (value < 0) return 'text-negative'
    return 'text-neutral'
  }

  switch (colorMode) {
    case 'positive':
      return 'text-positive'
    case 'negative':
      return 'text-negative'
    case 'neutral':
      return 'text-neutral'
    default:
      return 'text-text-primary'
  }
}

const sizeClassMap: Record<DataValueSize, string> = {
  sm: 'text-[12px] leading-4',
  md: 'text-[14px] leading-5',
  lg: 'text-[36px] leading-none tracking-[-0.04em]',
  xl: 'text-[48px] leading-none tracking-[-0.05em]',
}

export const DataValue: React.FC<DataValueProps> = ({
  value,
  type = 'number',
  size = 'md',
  colorMode = 'default',
  precision,
  prefix = '',
  suffix = '',
  className,
  showSign = false,
}) => {
  const formattedValue = formatValue(value, type, precision, showSign)

  return (
    <span
      className={cn(
        'font-mono tabular-nums font-medium',
        sizeClassMap[size],
        getColorClass(value, colorMode),
        className
      )}
    >
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  )
}

export default DataValue
