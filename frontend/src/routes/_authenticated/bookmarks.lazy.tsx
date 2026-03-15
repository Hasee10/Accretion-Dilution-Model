import { createLazyFileRoute } from '@tanstack/react-router'
import BookmarksPage from '@/pages/bookmarks'

export const Route = createLazyFileRoute('/_authenticated/bookmarks')({
  component: BookmarksPage,
})
