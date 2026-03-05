import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const ref = searchParams.get('ref')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (ref) {
        await supabase.auth.updateUser({
          data: { referred_by_fanflet_id: ref },
        })
      }

      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: sponsor } = await supabase
          .from('sponsor_accounts')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()
        if (sponsor) {
          return NextResponse.redirect(`${origin}/sponsor/dashboard`)
        }

        const signupRole = user.user_metadata?.signup_role
        if (signupRole === 'sponsor') {
          return NextResponse.redirect(`${origin}/sponsor/onboarding`)
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
