'use server'

import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyAdmins } from '@/lib/admin-notifications'
import { blockImpersonationWrites, logImpersonationAction } from '@/lib/impersonation'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function createSponsorProfile(formData: FormData) {
  await blockImpersonationWrites()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const companyName = (formData.get('company_name') as string)?.trim()
  let slug = (formData.get('slug') as string)?.trim() || slugify(companyName || '')
  const contactEmail = (formData.get('contact_email') as string)?.trim()
  const industry = (formData.get('industry') as string)?.trim() || null
  const logoUrl = (formData.get('logo_url') as string)?.trim() || null

  if (!companyName || !contactEmail) return { error: 'Company name and contact email are required.' }

  if (!slug) slug = `sponsor-${Date.now().toString(36)}`

  const { data: existing } = await supabase
    .from('sponsor_accounts')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) return { error: 'That URL slug is already taken. Please choose another.' }

  const { data: inserted, error } = await supabase.from('sponsor_accounts').insert({
    auth_user_id: user.id,
    company_name: companyName,
    slug,
    contact_email: contactEmail,
    industry: industry || null,
    logo_url: logoUrl || null,
  }).select('id').single()

  if (error) return { error: error.message }
  await logImpersonationAction('mutation', '/sponsor/onboarding', { action: 'createSponsorProfile', sponsorId: inserted?.id })

  // Append "sponsor" to the user's roles in app_metadata (supports dual-role)
  await supabase.rpc('append_user_role', {
    target_user_id: user.id,
    new_role: 'sponsor',
  })

  if (inserted?.id) {
    const sponsorId = inserted.id
    after(async () => {
      await notifyAdmins('sponsor_signup', {
        sponsorId,
        companyName,
        contactEmail,
      })
    })
  }

  redirect('/sponsor/dashboard')
}
