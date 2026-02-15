'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/config'

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const siteUrl = getSiteUrl()
  const referredByFanfletId = formData.get('ref') as string | null

  const metadata: Record<string, string> = {
    full_name: formData.get('name') as string,
  }
  if (referredByFanfletId) {
    metadata.referred_by_fanflet_id = referredByFanfletId
  }

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: metadata,
      emailRedirectTo: `${siteUrl}/auth/confirm`,
    },
  }
  const { data: authData, error } = await supabase.auth.signUp(data)
  if (error) {
    return { error: error.message }
  }

  // If email confirmation is required, the user won't have a session yet
  // Check if the user's email is confirmed (i.e. auto-confirm is on)
  if (authData.user && !authData.session) {
    return { success: 'Check your email for a confirmation link to finish setting up your account.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard/settings')
}

export async function signInWithGoogle(referredByFanfletId?: string) {
  const supabase = await createClient()
  const siteUrl = getSiteUrl()

  // Build the callback URL, appending the referral param so the
  // auth callback can persist it in user metadata after OAuth completes
  const callbackUrl = referredByFanfletId
    ? `${siteUrl}/auth/callback?ref=${encodeURIComponent(referredByFanfletId)}`
    : `${siteUrl}/auth/callback`

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
