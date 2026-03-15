import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/invite/$token')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/sign-up', search: { invite: params.token } })
  },
  component: () => null,
})
