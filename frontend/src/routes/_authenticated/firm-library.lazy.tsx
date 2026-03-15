import { createLazyFileRoute } from '@tanstack/react-router'
import FirmLibraryPage from '@/pages/firm-library'

export const Route = createLazyFileRoute('/_authenticated/firm-library')({
  component: FirmLibraryPage,
})
