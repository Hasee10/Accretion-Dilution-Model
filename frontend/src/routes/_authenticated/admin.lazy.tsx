import { createLazyFileRoute } from '@tanstack/react-router'
import AdminPage from '@/pages/admin'

export const Route = createLazyFileRoute('/_authenticated/admin')({
  component: AdminPage,
})
