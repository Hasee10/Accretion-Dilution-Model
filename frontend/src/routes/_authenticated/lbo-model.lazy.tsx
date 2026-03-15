import { createLazyFileRoute } from '@tanstack/react-router'
import LBOModelPage from '@/pages/lbo-model'

export const Route = createLazyFileRoute('/_authenticated/lbo-model')({
  component: LBOModelPage,
})
