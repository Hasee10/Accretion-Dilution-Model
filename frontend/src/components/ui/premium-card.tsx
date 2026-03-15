import React from 'react'
import { cn } from '@/lib/utils'

export type AccentColor = 'primary' | 'cyan' | 'violet' | 'emerald' | 'rose' | 'amber'

interface PremiumCardProps {
  children: React.ReactNode
  accentColor?: AccentColor
  className?: string
  onClick?: () => void
}

interface PremiumCardSectionProps {
  children: React.ReactNode
  className?: string
}

const accentBarClass: Record<AccentColor, string> = {
  primary: 'bg-accent-primary',
  cyan: 'bg-accent-cyan',
  violet: 'bg-accent-violet',
  emerald: 'bg-accent-emerald',
  rose: 'bg-accent-rose',
  amber: 'bg-accent-amber',
}

type PremiumCardComponent = React.FC<PremiumCardProps> & {
  Header: typeof PremiumCardHeader
  Content: typeof PremiumCardContent
  Divider: typeof PremiumCardDivider
  Title: typeof PremiumCardTitle
  Description: typeof PremiumCardDescription
}

export const PremiumCard: PremiumCardComponent = ({
  children,
  accentColor = 'primary',
  className,
  onClick,
}) => {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-lg border border-border-subtle bg-bg-surface p-5 transition-colors duration-200',
        'hover:border-border-default',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <span
        aria-hidden='true'
        className={cn('absolute left-0 top-5 h-6 w-px rounded-r', accentBarClass[accentColor])}
      />
      {children}
    </section>
  )
}

export const PremiumCardHeader: React.FC<PremiumCardSectionProps> = ({ children, className }) => (
  <div className={cn('mb-4 flex items-start justify-between gap-4', className)}>{children}</div>
)

export const PremiumCardContent: React.FC<PremiumCardSectionProps> = ({ children, className }) => (
  <div className={cn('', className)}>{children}</div>
)

export const PremiumCardDivider: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('my-4 border-t border-border-subtle', className)} />
)

export const PremiumCardTitle: React.FC<PremiumCardSectionProps> = ({ children, className }) => (
  <h3 className={cn('font-display text-[14px] font-medium tracking-[0.01em] text-text-primary', className)}>
    {children}
  </h3>
)

export const PremiumCardDescription: React.FC<PremiumCardSectionProps> = ({ children, className }) => (
  <p className={cn('font-ui text-[12px] text-text-secondary', className)}>{children}</p>
)

PremiumCard.Header = PremiumCardHeader
PremiumCard.Content = PremiumCardContent
PremiumCard.Divider = PremiumCardDivider
PremiumCard.Title = PremiumCardTitle
PremiumCard.Description = PremiumCardDescription

export default PremiumCard
