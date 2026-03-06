import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const ref = searchParams.get('ref')
  const role = searchParams.get('role')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const metadataUpdates: Record<string, string> = {}
      if (ref) metadataUpdates.referred_by_fanflet_id = ref
      if (role === 'sponsor') metadataUpdates.signup_role = 'sponsor'

      if (Object.keys(metadataUpdates).length > 0) {
        await supabase.auth.updateUser({ data: metadataUpdates })
      }

      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      const { data: { user } } = await supabase.auth.getUser()
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
          const destination = activeRole === 'sponsor' ? '/sponsor/dashboard' : '/dashboard'
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
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
