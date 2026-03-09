import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@fanflet/db/service'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const ROLE_HOME: Record<string, string> = {
  speaker: '/dashboard',
  sponsor: '/sponsor/dashboard',
  audience: '/my',
}

/** Allow relative path only; reject protocol-relative or absolute URLs (open redirect safety). */
function isSafeNext(next: string | null): next is string {
  if (!next || typeof next !== 'string') return false
  const trimmed = next.trim()
  return trimmed.startsWith('/') && !trimmed.startsWith('//')
}

/** Supabase may return this when OAuth email matches an existing user (same-email / multiple accounts). */
function isLinkRelatedOAuthError(errorDescription: string | null): boolean {
  if (!errorDescription) return false
  const lower = errorDescription.toLowerCase()
  return (
    lower.includes('multiple accounts') ||
    lower.includes('same email') ||
    lower.includes('same email address')
  )
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const ref = searchParams.get('ref')
  const role = searchParams.get('role')
  const next = searchParams.get('next')

  // Handle OAuth error params first; never put error_description in redirect (no user enumeration).
  if (errorParam) {
    const isLinkRelated = isLinkRelatedOAuthError(errorDescription)
    const q = new URLSearchParams({ error: isLinkRelated ? 'link_required' : 'auth_callback_failed' })
    if (isSafeNext(next)) q.set('next', next)
    return NextResponse.redirect(`${origin}/login?${q.toString()}`)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const q = new URLSearchParams({ error: 'auth_callback_failed' })
      if (isSafeNext(next)) q.set('next', next)
      return NextResponse.redirect(`${origin}/login?${q.toString()}`)
    }

    const metadataUpdates: Record<string, string> = {}
    if (ref) metadataUpdates.referred_by_fanflet_id = ref
    if (role === 'sponsor') metadataUpdates.signup_role = 'sponsor'
    if (role === 'audience') metadataUpdates.signup_role = 'audience'

    if (Object.keys(metadataUpdates).length > 0) {
      await supabase.auth.updateUser({ data: metadataUpdates })
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (user && role === 'audience') {
      await handleAudiencePostSignup(supabase, user.id, ref)
    }

    if (isSafeNext(next)) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    if (user) {
      const appRoles = Array.isArray(user.app_metadata?.roles)
        ? (user.app_metadata.roles as string[])
        : []

      if (appRoles.length > 0) {
        const cookieStore = await cookies()
        const activeRoleCookie = cookieStore.get('active_role')?.value
        const activeRole = activeRoleCookie && appRoles.includes(activeRoleCookie)
          ? activeRoleCookie
          : appRoles[0]
        const destination = ROLE_HOME[activeRole] ?? '/dashboard'
        return NextResponse.redirect(`${origin}${destination}`)
      }

      const signupRole = user.user_metadata?.signup_role
      if (signupRole === 'sponsor') {
        const { data: sponsor } = await supabase
          .from('sponsor_accounts')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        const destination = sponsor ? '/sponsor/dashboard' : '/sponsor/onboarding'
        return NextResponse.redirect(`${origin}${destination}`)
      }

      if (signupRole === 'audience') {
        return NextResponse.redirect(`${origin}/my`)
      }
    }

    return NextResponse.redirect(`${origin}/dashboard`)
  }
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}

async function handleAudiencePostSignup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  fanfletId: string | null,
) {
  let { data: audience } = await supabase
    .from('audience_accounts')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  // Existing user without audience_accounts row — provision one
  if (!audience) {
    const service = createServiceClient()
    const { data: { user } } = await service.auth.admin.getUserById(userId)
    if (!user) return

    const { data: newAudience } = await service
      .from('audience_accounts')
      .insert({
        auth_user_id: userId,
        email: user.email ?? '',
        display_name: (user.user_metadata?.full_name ?? user.user_metadata?.name ?? '') as string,
      })
      .select('id')
      .single()

    if (!newAudience) return
    audience = newAudience

    const existingRoles = Array.isArray(user.app_metadata?.roles)
      ? (user.app_metadata.roles as string[])
      : []
    if (!existingRoles.includes('audience')) {
      await service.auth.admin.updateUserById(userId, {
        app_metadata: { roles: [...existingRoles, 'audience'] },
      })
    }
  }

  if (!fanfletId) return

  await supabase
    .from('audience_saved_fanflets')
    .upsert(
      {
        audience_account_id: audience.id,
        fanflet_id: fanfletId,
        save_source: 'auto_signup',
      },
      { onConflict: 'audience_account_id,fanflet_id' },
    )

  const { data: fanflet } = await supabase
    .from('fanflets')
    .select('speaker_id')
    .eq('id', fanfletId)
    .maybeSingle()

  if (fanflet?.speaker_id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      const { error: subError } = await supabase
        .from('subscribers')
        .insert({
          email: user.email.toLowerCase().trim(),
          speaker_id: fanflet.speaker_id,
          source_fanflet_id: fanfletId,
        })
      if (subError && subError.code !== '23505') {
        console.error('[audience-signup] subscriber insert error:', subError.code, subError.message)
      }
    }
  }
}
