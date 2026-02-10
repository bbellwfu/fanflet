'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }
  const { error } = await supabase.auth.signInWithPassword(data)
  if (error) {
    return { error: error.message }
  }
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'
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
