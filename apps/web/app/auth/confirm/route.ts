import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyAdmins } from '@/lib/admin-notifications'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  const redirectTo = request.nextUrl.clone()
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')
  redirectTo.searchParams.delete('next')

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
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
