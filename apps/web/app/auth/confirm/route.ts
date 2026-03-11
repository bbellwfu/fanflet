import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyAdmins } from '@/lib/admin-notifications'

const ROLE_HOME: Record<string, string> = {
  speaker: '/dashboard',
  sponsor: '/sponsor/dashboard',
  audience: '/my',
}

function isSafeNext(next: string | null): next is string {
  if (!next || typeof next !== 'string') return false
  const trimmed = next.trim()
  return trimmed.startsWith('/') && !trimmed.startsWith('//')
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next')

  const redirectTo = request.nextUrl.clone()
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')
  redirectTo.searchParams.delete('next')

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      // ── Magic link sign-in: route by role ──
      if (type === 'magiclink') {
        const destination = resolveRoleDestination(user, next)
        redirectTo.pathname = destination
        return NextResponse.redirect(redirectTo)
      }

      // ── Password recovery: send to reset page ──
      if (type === 'recovery') {
        redirectTo.pathname = isSafeNext(next) ? next : '/login/reset-password'
        return NextResponse.redirect(redirectTo)
      }

      // ── Email confirmation (signup): existing behavior ──
      if (isSafeNext(next)) {
        redirectTo.pathname = next
        return NextResponse.redirect(redirectTo)
      }

      const signupRole = user?.user_metadata?.signup_role

      if (signupRole === 'sponsor') {
        redirectTo.pathname = '/sponsor/onboarding'
      } else {
        redirectTo.pathname = '/dashboard'
        if (user?.id) {
          const { data: speaker } = await supabase
            .from('speakers')
            .select('id, name, email')
            .eq('auth_user_id', user.id)
            .maybeSingle()
          if (speaker) {
            after(async () => {
              await notifyAdmins('speaker_signup', {
                speakerId: speaker.id,
                email: speaker.email ?? user.email ?? '',
                name: speaker.name ?? '',
              })
            })
          }
        }
      }
      return NextResponse.redirect(redirectTo)
    }
  }

  redirectTo.pathname = '/login'
  redirectTo.searchParams.set('error', 'confirmation_failed')
  return NextResponse.redirect(redirectTo)
}

/**
 * Determine the right destination based on the user's roles,
 * falling back to the explicit `next` param or `/dashboard`.
 */
function resolveRoleDestination(
  user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null,
  next: string | null,
): string {
  if (isSafeNext(next)) return next

  if (!user) return '/dashboard'

  const appRoles = Array.isArray(user.app_metadata?.roles)
    ? (user.app_metadata.roles as string[])
    : []

  if (appRoles.length > 0) {
    return ROLE_HOME[appRoles[0]] ?? '/dashboard'
  }

  const signupRole = user.user_metadata?.signup_role
  if (signupRole === 'sponsor') return '/sponsor/dashboard'
  if (signupRole === 'audience') return '/my'

  return '/dashboard'
}
