import { createLazyFileRoute } from '@tanstack/react-router'
import MergerAnalysis from '@/pages/merger-analysis-premium'

export const Route = createLazyFileRoute('/_authenticated/merger-analysis')({
    component: MergerAnalysis,
})
