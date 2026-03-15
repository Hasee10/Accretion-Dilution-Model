import { createLazyFileRoute } from '@tanstack/react-router'
import DCFValuation from '@/pages/dcf'

export const Route = createLazyFileRoute('/_authenticated/dcf')({
    component: DCFValuation,
})
