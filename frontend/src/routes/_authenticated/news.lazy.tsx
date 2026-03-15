import { createLazyFileRoute } from '@tanstack/react-router'
import NewsPage from '@/pages/news'

export const Route = createLazyFileRoute('/_authenticated/news')({
  component: NewsPage,
})
