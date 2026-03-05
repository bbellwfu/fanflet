'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/config'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }
  const { data: authData, error } = await supabase.auth.signInWithPassword(data)
  if (error) {
    return { error: error.message }
  }

  const userId = authData.user?.id
  if (userId) {
    const { data: sponsor } = await supabase
      .from('sponsor_accounts')
      .select('id')
      .eq('auth_user_id', userId)
      .single()
    if (sponsor) {
      revalidatePath('/', 'layout')
      redirect('/sponsor/dashboard')
    }

    const signupRole = authData.user?.user_metadata?.signup_role
    if (signupRole === 'sponsor') {
      revalidatePath('/', 'layout')
      redirect('/sponsor/onboarding')
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
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
