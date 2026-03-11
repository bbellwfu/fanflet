'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updatePassword(
  formData: FormData,
): Promise<{ error?: string }> {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters.' }
  }
  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    if (error.message.includes('same password')) {
      return { error: 'New password must be different from your current password.' }
    }
    return { error: 'Failed to update password. Your reset link may have expired — try requesting a new one.' }
  }

  redirect('/login?message=password_updated')
}
