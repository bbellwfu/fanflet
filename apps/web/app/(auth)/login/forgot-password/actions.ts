'use server'

import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/config'

export async function requestPasswordReset(
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  if (!email) return { error: 'Please enter your email address.' }

  const supabase = await createClient()
  const siteUrl = getSiteUrl()

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent('/login/reset-password')}`,
  })

  // Always return success to prevent user enumeration
  return {
    success:
      'If an account exists with that email, you\u2019ll receive a password reset link shortly. Check your inbox (and spam folder).',
  }
}
