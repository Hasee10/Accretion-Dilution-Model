import { createFileRoute } from '@tanstack/react-router'
import { LegalShell } from '@/components/legal/legal-shell'

export const Route = createFileRoute('/documentation')({
  component: DocumentationPage,
})

const sections = [
  {
    title: 'What QuantEdge Covers',
    body: [
      'QuantEdge is a finance intelligence workspace for front-office teams. It brings DCF valuation, merger accretion and dilution analysis, LBO screening, market news, watchlists, and team collaboration into one operating layer.',
      'The platform is designed so a user can move from market context to model assumptions to shared team output without switching between disconnected tools.',
    ],
  },
  {
    title: 'Core Workflows',
    body: [
      'Teams can build and save DCF, M&A, and LBO models, review related ticker context, monitor market-moving news, and collaborate through shared workspaces, tasks, and analyst chat.',
      'Saved deals, shared model libraries, bookmarks, and workspace history are intended to keep firms aligned on the same operating picture.',
    ],
  },
  {
    title: 'Account and Workspace Flow',
    body: [
      'Visitors first land on the public introductory page, then move into sign in or sign up. After authentication and email confirmation, users can enter the platform and continue in a personal workspace or create and join a firm workspace.',
      'Firm administrators can invite additional team members and manage shared access through organization roles and workspace settings.',
    ],
  },
  {
    title: 'Research and AI Context',
    body: [
      'QuantEdge includes market intelligence, ticker-linked news, watchlists, and AI-assisted context so research stays tied to the deal or valuation page being worked on.',
      'AI outputs and market data should always be reviewed before they are used in live business or investment decisions.',
    ],
  },
  {
    title: 'Operational Notes',
    body: [
      'The platform relies on external market, news, email, and AI providers. Before deployment, production teams should verify key rotation, email confirmation flow, workspace creation, role-based permissions, and RLS behavior in Supabase.',
      'For legal and privacy commitments, refer to the Terms of Service and Privacy Policy pages.',
    ],
  },
]

function DocumentationPage() {
  return (
    <LegalShell
      eyebrow='Public / Documentation'
      title='Documentation'
      summary='An overview of what QuantEdge does, how the product is structured, and how users move from the public intro page into the platform.'
      effectiveDate='March 15, 2026'
      sections={sections}
    />
  )
}
