'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createSpeakerProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: existingSpeaker } = await supabase
    .from('speakers')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (existingSpeaker) {
    redirect('/dashboard')
  }

  const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? ''
  const { error } = await supabase.from('speakers').insert({
    auth_user_id: user.id,
    email: user.email ?? '',
    name: typeof fullName === 'string' ? fullName : '',
  })

  if (error) return { error: 'Failed to create speaker profile. Please try again.' }

  // Append "speaker" to the user's roles in app_metadata
  await supabase.rpc('append_user_role', {
    target_user_id: user.id,
    new_role: 'speaker',
  })

  redirect('/dashboard')
}
