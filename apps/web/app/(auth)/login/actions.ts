'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/config'

function resolveLoginDestination(
  roles: string[],
  activeRoleCookie: string | undefined,
): string {
  if (roles.length === 0) return '/dashboard'

  const activeRole = activeRoleCookie && roles.includes(activeRoleCookie)
    ? activeRoleCookie
    : roles[0]

  return activeRole === 'sponsor' ? '/sponsor/dashboard' : '/dashboard'
}

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

  const user = authData.user
  if (user) {
    const appRoles = Array.isArray(user.app_metadata?.roles)
      ? (user.app_metadata.roles as string[])
      : []

    if (appRoles.length > 0) {
      const cookieStore = await cookies()
      const activeRoleCookie = cookieStore.get('active_role')?.value
      revalidatePath('/', 'layout')
      redirect(resolveLoginDestination(appRoles, activeRoleCookie))
    }

    const signupRole = user.user_metadata?.signup_role
    if (signupRole === 'sponsor') {
      const { data: sponsor } = await supabase
        .from('sponsor_accounts')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      revalidatePath('/', 'layout')
      redirect(sponsor ? '/sponsor/dashboard' : '/sponsor/onboarding')
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
