import { ResetPasswordForm } from '@/features/auth/reset-password/components/reset-password-form'
import { AuthLayout } from '@/features/auth/auth-layout'


export default function ResetPasswordPage() {
    return (
        <AuthLayout>
            <div className='flex flex-col space-y-2 text-left'>
                <h1 className='text-2xl font-semibold tracking-tight'>Set new password</h1>
                <p className='text-sm text-muted-foreground'>
                    Enter your new password below to update your account.
                </p>
            </div>
            <ResetPasswordForm />
        </AuthLayout>
    )
}
