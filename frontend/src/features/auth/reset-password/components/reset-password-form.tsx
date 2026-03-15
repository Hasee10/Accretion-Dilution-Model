import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { PasswordInput } from '@/components/password-input'

const formSchema = z
    .object({
        password: z
            .string()
            .min(8, 'Password must be at least 8 characters'),
        confirmPassword: z.string().min(1, 'Please confirm your password'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match.",
        path: ['confirmPassword'],
    })

export function ResetPasswordForm({
    className,
    ...props
}: React.HTMLAttributes<HTMLFormElement>) {
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { password: '', confirmPassword: '' },
    })

    async function onSubmit(data: z.infer<typeof formSchema>) {
        setIsLoading(true)

        const { error } = await supabase.auth.updateUser({
            password: data.password,
        })

        setIsLoading(false)

        if (error) {
            toast.error(error.message)
            return
        }

        toast.success('Password updated successfully!')
        navigate({ to: '/sign-in', replace: true })
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className={cn('grid gap-3', className)}
                {...props}
            >
                <FormField
                    control={form.control}
                    name='password'
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                                <PasswordInput placeholder='Min. 8 characters' {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name='confirmPassword'
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                                <PasswordInput placeholder='Repeat password' {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button className='mt-2' disabled={isLoading}>
                    {isLoading ? <Loader2 className='animate-spin' /> : <ShieldCheck />}
                    Update Password
                </Button>
            </form>
        </Form>
    )
}
