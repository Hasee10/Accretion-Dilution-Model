/**
 * emailApi.ts
 * Thin client-side helpers that POST to the FastAPI backend email endpoints.
 * Resend is NEVER called from the browser — all secret handling is server-side.
 *
 * Failures are non-fatal: they log a warning but won't disrupt the user flow.
 */

async function post(path: string, body: unknown): Promise<void> {
    try {
        const res = await fetch(apiUrl(path), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        if (!res.ok) {
            const text = await res.text()
            console.warn(`[emailApi] ${path} failed (${res.status}):`, text)
        }
    } catch (err) {
        console.warn(`[emailApi] ${path} network error:`, err)
    }
}

/** Send after successful sign-up profile creation. */
export function sendWelcomeEmail(email: string, firstName: string): void {
    void post('/api/v1/email/welcome', { email, firstName })
}

/** Send after user saves a deal to saved_deals. */
export function sendDealSavedEmail(params: {
    email: string
    firstName: string
    dealName: string
    dealId: string
    adResult: string
}): void {
    void post('/api/v1/email/deal-saved', params)
}

/** Send a password reset email (called from forgot-password flow). */
export function sendPasswordResetEmail(
    email: string,
    resetLink: string,
): void {
    void post('/api/v1/email/password-reset', { email, resetLink })
}

export function sendFirmInviteEmail(params: {
    email: string
    inviterName: string
    firmName: string
    inviteLink: string
    role: string
}): void {
    void post('/api/v1/email/firm-invite', params)
}
import { apiUrl } from '@/lib/api'
