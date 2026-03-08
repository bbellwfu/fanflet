'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/config'

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const siteUrl = getSiteUrl()
  const referredByFanfletId = formData.get('ref') as string | null
  const signupRole = formData.get('role') as string | null
  const next = formData.get('next') as string | null

  const metadata: Record<string, string> = {
    full_name: formData.get('name') as string,
  }
  if (referredByFanfletId) {
    metadata.referred_by_fanflet_id = referredByFanfletId
  }
  if (signupRole === 'audience' || signupRole === 'sponsor') {
    metadata.signup_role = signupRole
  }

  const confirmUrl = next
    ? `${siteUrl}/auth/confirm?next=${encodeURIComponent(next)}`
    : `${siteUrl}/auth/confirm`

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: metadata,
      emailRedirectTo: confirmUrl,
    },
  }
  const { data: authData, error } = await supabase.auth.signUp(data)
  if (error) {
    return { error: error.message }
  }

  if (authData.user && !authData.session) {
    return { success: 'Check your email for a confirmation link to finish setting up your account.' }
  }

  revalidatePath('/', 'layout')
  const destination = signupRole === 'audience' && next ? next : '/dashboard/settings'
  redirect(destination)
}

interface GoogleSignInOptions {
  referredByFanfletId?: string;
  role?: string;
  next?: string;
}

export async function signInWithGoogle(opts?: GoogleSignInOptions | string) {
  const supabase = await createClient()
  const siteUrl = getSiteUrl()

  // Backwards-compatible: accept a plain string (referral ID) or options object
  const options: GoogleSignInOptions = typeof opts === 'string'
    ? { referredByFanfletId: opts }
    : (opts ?? {})

  const params = new URLSearchParams()
  if (options.referredByFanfletId) params.set('ref', options.referredByFanfletId)
  if (options.role) params.set('role', options.role)
  if (options.next) params.set('next', options.next)

  const qs = params.toString()
  const callbackUrl = qs ? `${siteUrl}/auth/callback?${qs}` : `${siteUrl}/auth/callback`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
    },
  })
  if (error) {
    return { error: error.message }
  }
  redirect(data.url)
}
