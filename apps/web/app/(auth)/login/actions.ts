'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/config'

/** Allow relative path redirects only (e.g. /brianbell/test-message). Reject protocol-relative or absolute URLs. */
function isSafeNext(next: string | null): next is string {
  if (!next || typeof next !== 'string') return false
  const trimmed = next.trim()
  return trimmed.startsWith('/') && !trimmed.startsWith('//')
}

/** Redirect to our MCP callback with state only; never use client-provided callback URL. */
function getMcpCallbackRedirect(mcpState: string): string {
  const siteUrl = getSiteUrl().replace(/\/$/, '')
  return `${siteUrl}/api/mcp/callback?state=${encodeURIComponent(mcpState)}`
}

function resolveLoginDestination(
  roles: string[],
  activeRoleCookie: string | undefined,
  next: string | null,
): string {
  if (isSafeNext(next)) return next
  if (roles.length === 0) return '/dashboard'

  const activeRole = activeRoleCookie && roles.includes(activeRoleCookie)
    ? activeRoleCookie
    : roles[0]

  if (activeRole === 'sponsor') return '/sponsor/dashboard'
  if (activeRole === 'audience') return '/my'
  return '/dashboard'
}

export async function login(formData: FormData) {
  const supabase = await createClient()
  const next = formData.get('next') as string | null
  const mcpState = formData.get('mcp_state') as string | null
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }
  const { data: authData, error } = await supabase.auth.signInWithPassword(data)
  if (error) {
    return { error: error.message }
  }

  if (mcpState && typeof mcpState === 'string' && mcpState.trim()) {
    revalidatePath('/', 'layout')
    redirect(getMcpCallbackRedirect(mcpState.trim()))
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
      redirect(resolveLoginDestination(appRoles, activeRoleCookie, next))
    }

    const signupRole = user.user_metadata?.signup_role
    if (signupRole === 'sponsor') {
      const { data: sponsor } = await supabase
        .from('sponsor_accounts')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      revalidatePath('/', 'layout')
      redirect(isSafeNext(next) ? next : (sponsor ? '/sponsor/dashboard' : '/sponsor/onboarding'))
    }
  }

  revalidatePath('/', 'layout')
  redirect(isSafeNext(next) ? next : '/dashboard')
}

export async function signInWithGoogle(opts?: { next?: string; mcp_state?: string }) {
  const supabase = await createClient()
  const siteUrl = getSiteUrl().replace(/\/$/, '')
  const params = new URLSearchParams()
  if (opts?.mcp_state && typeof opts.mcp_state === 'string' && opts.mcp_state.trim()) {
    params.set('next', `/api/mcp/callback?state=${encodeURIComponent(opts.mcp_state.trim())}`)
  } else if (opts?.next && isSafeNext(opts.next)) {
    params.set('next', opts.next)
  }
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
