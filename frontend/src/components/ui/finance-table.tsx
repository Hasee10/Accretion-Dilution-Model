import React, { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Database } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DataValue } from './data-value'
import { FinanceTableSkeleton } from './skeleton'

export type ColumnType = 'text' | 'number' | 'currency' | 'percentage' | 'date'

export interface FinanceColumn<T = object> {
  id?: string
  key: keyof T
  title: string
  type?: ColumnType
  sortable?: boolean
  precision?: number
  className?: string
  render?: (value: unknown, row: T) => React.ReactNode
}

export interface FinanceTableProps<T = object> {
  data: T[]
  columns: FinanceColumn<T>[]
  loading?: boolean
  emptyMessage?: string
  className?: string
  onRowClick?: (row: T) => void
}

type SortDirection = 'asc' | 'desc' | null

function EmptyState({ message }: { message: string }) {
  return (
    <div className='flex min-h-[280px] flex-col items-center justify-center gap-3 text-center'>
      <div className='rounded-full border border-border-subtle bg-bg-elevated p-4'>
        <Database className='h-6 w-6 text-text-muted' />
      </div>
      <div>
        <p className='font-display text-lg text-text-primary'>Nothing here yet</p>
        <p className='font-ui text-sm text-text-secondary'>{message}</p>
      </div>
    </div>
  )
}

function renderValue(value: unknown, type: ColumnType, precision?: number) {
  if (value === null || value === undefined) {
    return <span className='font-ui text-sm text-text-muted'>-</span>
  }

  if (type === 'currency' || type === 'percentage' || type === 'number') {
    return (
      <DataValue
        value={Number(value)}
        type={type}
        precision={precision}
        colorMode={type === 'number' ? 'auto' : 'auto'}
        size='sm'
      />
    )
  }

  if (type === 'date') {
    return <span className='font-ui text-sm text-text-secondary'>{new Date(String(value)).toLocaleDateString()}</span>
  }

  return <span className='font-ui text-sm text-text-primary'>{String(value)}</span>
}

export const FinanceTable = <T extends object>({
  data,
  columns,
  loading = false,
  emptyMessage = 'Saved scenarios will appear here.',
  className,
  onRowClick,
}: FinanceTableProps<T>) => {
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const sortedRows = useMemo(() => {
    if (!sortColumn || !sortDirection) return data

    return [...data].sort((left, right) => {
      const a = left[sortColumn as keyof T] as unknown
      const b = right[sortColumn as keyof T] as unknown
      if (a === b) return 0
      const comparison = a! < b! ? -1 : 1
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, sortColumn, sortDirection])

  const toggleSort = (column: FinanceColumn<T>) => {
    if (!column.sortable) return
    if (sortColumn !== column.key) {
      setSortColumn(column.key)
      setSortDirection('asc')
      return
    }
    if (sortDirection === 'asc') {
      setSortDirection('desc')
      return
    }
    setSortColumn(null)
    setSortDirection(null)
  }

  if (loading) {
    return <FinanceTableSkeleton className={className} columns={columns.length} rows={6} />
  }

  if (!data.length) {
    return (
      <div className={cn('overflow-hidden rounded-lg border border-border-subtle bg-bg-surface', className)}>
        <EmptyState message={emptyMessage} />
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border-subtle bg-bg-surface', className)}>
      <div className='overflow-x-auto'>
        <table className='w-full min-w-[720px] border-collapse'>
          <thead className='sticky top-0 z-10 bg-bg-base/95 backdrop-blur'>
            <tr className='border-b border-border-subtle'>
              {columns.map((column) => {
                const columnId = column.id ?? String(column.key)
                const isNumeric = ['number', 'currency', 'percentage'].includes(column.type ?? 'text')
                const isActive = sortColumn === column.key
                return (
                  <th
                    key={columnId}
                    className={cn(
                      'px-4 py-3 text-left font-ui text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary',
                      isNumeric && 'text-right',
                      column.sortable && 'group cursor-pointer select-none',
                      column.className
                    )}
                    onClick={() => toggleSort(column)}
                  >
                    <div className={cn('flex items-center gap-1', isNumeric && 'justify-end')}>
                      <span>{column.title}</span>
                      {column.sortable ? (
                        isActive ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className='h-3.5 w-3.5 text-text-primary' />
                          ) : (
                            <ArrowDown className='h-3.5 w-3.5 text-text-primary' />
                          )
                        ) : (
                          <ArrowUpDown className='h-3.5 w-3.5 text-text-muted opacity-0 transition-opacity group-hover:opacity-100' />
                        )
                      ) : null}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, index) => (
              <tr
                key={index}
                className={cn(
                  'border-b border-border-subtle transition-colors last:border-b-0',
                  index % 2 === 0 ? 'bg-bg-surface' : 'bg-bg-elevated',
                  'hover:bg-white/[0.03]',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => {
                  const columnId = column.id ?? String(column.key)
                  const isNumeric = ['number', 'currency', 'percentage'].includes(column.type ?? 'text')
                  const value = row[column.key as keyof T]
                  return (
                    <td
                      key={columnId}
                      className={cn('px-4 py-4 align-middle', isNumeric && 'text-right', column.className)}
                    >
                      {column.render ? column.render(value, row) : renderValue(value, column.type ?? 'text', column.precision)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default FinanceTable
