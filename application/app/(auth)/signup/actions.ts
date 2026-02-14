'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/config'

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const siteUrl = getSiteUrl()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('name') as string,
      },
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
    return { error: 'Please check your email to confirm your account, then sign in.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard/settings')
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const siteUrl = getSiteUrl()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  })
  if (error) {
    return { error: error.message }
  }
  redirect(data.url)
}
