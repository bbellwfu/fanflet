'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/config'
import { blockImpersonationWrites, logImpersonationAction } from '@/lib/impersonation'

export async function sponsorSignup(formData: FormData) {
  await blockImpersonationWrites()
  const supabase = await createClient()
  const siteUrl = getSiteUrl()

  const { data, error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm`,
      data: { signup_role: 'sponsor' },
    },
  })

  if (error) return { error: error.message }
  await logImpersonationAction('mutation', '/sponsor/signup', { action: 'sponsorSignup', userId: data.user?.id })

  if (data.user && !data.session) {
    return { success: 'Check your email for a confirmation link to finish setting up your account.' }
  }

  redirect('/sponsor/onboarding')
}

export async function sponsorSignInWithGoogle() {
  const supabase = await createClient()
  const siteUrl = getSiteUrl()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${siteUrl}/auth/callback?role=sponsor`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect(data.url)
}
