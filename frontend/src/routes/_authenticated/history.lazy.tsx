import { createLazyFileRoute } from '@tanstack/react-router'
import History from '@/pages/history'

export const Route = createLazyFileRoute('/_authenticated/history')({
    component: History,
})
