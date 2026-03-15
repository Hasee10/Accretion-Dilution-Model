import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOrgStore } from '@/stores/org-store'

interface FeatureGateProps {
  feature: 'white_label' | 'shared_library' | 'excel_export' | 'advanced_roles'
  children: ReactNode
  fallback?: ReactNode
}

const PLAN_FEATURES = {
  white_label: ['pro', 'enterprise'],
  shared_library: ['pro', 'enterprise'],
  excel_export: ['pro', 'enterprise'],
  advanced_roles: ['pro', 'enterprise'],
} as const

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const currentOrg = useOrgStore((state) => state.currentOrg)
  const hasAccess = PLAN_FEATURES[feature].includes((currentOrg?.plan ?? 'free') as 'free' | 'pro' | 'enterprise')

  if (hasAccess) return <>{children}</>

  return (
    <>
      {fallback ?? (
        <div className='flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-elevated p-4'>
          <div className='flex items-center gap-3'>
            <div className='rounded-full border border-border-subtle bg-bg-surface p-2'>
              <Lock className='h-4 w-4 text-text-secondary' />
            </div>
            <div>
              <p className='font-ui text-sm text-text-primary'>Pro feature</p>
              <p className='font-ui text-xs text-text-muted'>Upgrade your workspace to unlock this capability.</p>
            </div>
          </div>
          <Button size='sm' onClick={() => window.location.assign('/admin?tab=billing')}>
            Upgrade
          </Button>
        </div>
      )}
    </>
  )
}
