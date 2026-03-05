'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/config'

export async function sponsorSignup(formData: FormData) {
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

  if (data.user && !data.session) {
    return { success: 'Check your email for a confirmation link to finish setting up your account.' }
  }

  redirect('/sponsor/onboarding')
}
