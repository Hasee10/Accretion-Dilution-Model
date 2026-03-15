import { createLazyFileRoute } from '@tanstack/react-router'
import WatchlistPage from '@/pages/watchlist'

export const Route = createLazyFileRoute('/_authenticated/watchlist')({
  component: WatchlistPage,
})
