import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import type { Profile, UserRole } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const profileFormSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  company: z.string().optional(),
  role: z.enum(['analyst', 'associate', 'vp', 'director', 'md']),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'analyst', label: 'Analyst' },
  { value: 'associate', label: 'Associate' },
  { value: 'vp', label: 'VP' },
  { value: 'director', label: 'Director' },
  { value: 'md', label: 'Managing Director' },
]

export function ProfileForm() {
  const { auth } = useAuthStore()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: '',
      company: '',
      role: 'analyst',
    },
  })

  // Load profile data on mount
  useEffect(() => {
    async function loadProfile() {
      if (!auth.user) return
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', auth.user.id)
        .single()

      if (data) {
        setProfile(data as Profile)
        setAvatarUrl(data.avatar_url ?? null)
        form.reset({
          full_name: data.full_name,
          company: data.company ?? '',
          role: (data.role as UserRole) ?? 'analyst',
        })
      }
    }

    loadProfile()
  }, [auth.user, form])

  async function onSubmit(values: ProfileFormValues) {
    if (!auth.user) return
    setIsLoading(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: values.full_name,
        company: values.company || null,
        role: values.role,
      })
      .eq('id', auth.user.id)

    setIsLoading(false)

    if (error) {
      toast.error('Failed to update profile: ' + error.message)
    } else {
      toast.success('Profile updated successfully!')
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !auth.user) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Avatar must be under 2MB')
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed')
      return
    }

    setAvatarUploading(true)

    const filePath = `${auth.user.id}/avatar.${file.name.split('.').pop()}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      toast.error('Avatar upload failed: ' + uploadError.message)
      setAvatarUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const publicUrl = urlData.publicUrl

    await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', auth.user.id)

    setAvatarUrl(publicUrl)
    setAvatarUploading(false)
    toast.success('Avatar updated!')
  }

  return (
    <div className='space-y-6'>
      {/* Avatar Section */}
      <div className='flex items-center gap-4'>
        <div className='relative h-16 w-16 overflow-hidden rounded-full border bg-muted'>
          {avatarUrl ? (
            <img src={avatarUrl} alt='Avatar' className='h-full w-full object-cover' />
          ) : (
            <div className='flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground'>
              {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>
        <div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => fileRef.current?.click()}
            disabled={avatarUploading}
          >
            {avatarUploading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Upload className='mr-2 h-4 w-4' />}
            {avatarUploading ? 'Uploading...' : 'Upload Avatar'}
          </Button>
          <p className='mt-1 text-xs text-muted-foreground'>JPG, PNG, GIF up to 2MB</p>
          <input
            ref={fileRef}
            type='file'
            accept='image/*'
            className='hidden'
            onChange={handleAvatarUpload}
          />
        </div>
      </div>

      {/* Email (read-only) */}
      <div className='space-y-1'>
        <label className='text-sm font-medium'>Email</label>
        <Input value={auth.user?.email ?? ''} readOnly className='bg-muted text-muted-foreground' />
        <p className='text-xs text-muted-foreground'>
          To change your email,{' '}
          <span className='underline cursor-not-allowed opacity-60'>contact support</span>.
        </p>
      </div>

      {/* Profile Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
          <FormField
            control={form.control}
            name='full_name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder='Jane Smith' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='company'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Input placeholder='Goldman Sachs' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='role'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select your role' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type='submit' disabled={isLoading}>
            {isLoading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Save className='mr-2 h-4 w-4' />}
            Save Changes
          </Button>
        </form>
      </Form>
    </div>
  )
}
