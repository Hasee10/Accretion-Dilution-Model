import { createFileRoute } from '@tanstack/react-router'
import { LegalShell } from '@/components/legal/legal-shell'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPolicy,
})

const sections = [
  {
    title: 'Information We Collect',
    body: [
      'QuantEdge collects account information such as your name, work email, company affiliation, and profile settings when you register or are invited into a workspace.',
      'We also store financial modeling inputs, saved scenarios, AI chat context, team activity, and operational metadata needed to run the platform for your firm.',
    ],
  },
  {
    title: 'How We Use Information',
    body: [
      'We use collected information to authenticate users, power valuation workflows, improve product reliability, deliver workspace collaboration, and support customer onboarding.',
      'When AI features are used, we process the prompt, current model context, and response history to generate the requested analysis inside QuantEdge.',
    ],
  },
  {
    title: 'Sharing and Disclosure',
    body: [
      'We do not sell personal information. We may share information with infrastructure and service providers that help us operate the product, including hosting, email delivery, payments, file storage, and AI providers.',
      'We may also disclose information when required by law, to enforce our terms, or to protect users, firms, and the platform.',
    ],
  },
  {
    title: 'Data Security and Retention',
    body: [
      'We use industry-standard technical and organizational safeguards to reduce the risk of unauthorized access, misuse, or disclosure.',
      'Data is retained for as long as your account or firm workspace remains active, unless deletion is requested or a longer retention period is required for legal or operational reasons.',
    ],
  },
  {
    title: 'Your Rights and Controls',
    body: [
      'You may request access, correction, export, or deletion of personal information associated with your account, subject to applicable law and any firm administrator controls.',
      'Firm administrators may also control workspace configuration, member access, and shared scenario visibility at the organization level.',
    ],
  },
  {
    title: 'Policy Updates',
    body: [
      'We may revise this Privacy Policy as QuantEdge evolves. Material changes will be reflected on this page with an updated effective date and, where appropriate, in-product notice.',
    ],
  },
]

function PrivacyPolicy() {
  return (
    <LegalShell
      eyebrow='Legal / Privacy'
      title='Privacy Policy'
      summary='How QuantEdge Finance & IT collects, uses, and protects information across personal and firm workspaces.'
      effectiveDate='March 14, 2026'
      sections={sections}
    />
  )
}
