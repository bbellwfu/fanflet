import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@fanflet/db/service'
import { z } from 'zod'

const SaveBodySchema = z.object({
  fanfletId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = SaveBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid fanfletId' }, { status: 400 })
  }

  const { fanfletId } = parsed.data

  const { data: existingAudience, error: audienceLookupError } = await supabase
    .from('audience_accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (audienceLookupError) {
    console.error('[audience/save] lookup error:', audienceLookupError.code, audienceLookupError.message)
    return NextResponse.json({ error: 'Failed to look up account' }, { status: 500 })
  }

  let audience = existingAudience

  if (!audience) {
    const service = createServiceClient()
    const { data: { user: adminUser } } = await service.auth.admin.getUserById(user.id)
    if (!adminUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 500 })
    }

    const { data: newAudience } = await service
      .from('audience_accounts')
      .insert({
        auth_user_id: user.id,
        email: adminUser.email ?? '',
        display_name: (adminUser.user_metadata?.full_name ?? adminUser.user_metadata?.name ?? '') as string,
      })
      .select('id')
      .single()

    if (!newAudience) {
      return NextResponse.json({ error: 'Failed to create audience account' }, { status: 500 })
    }
    audience = newAudience

    const existingRoles = Array.isArray(adminUser.app_metadata?.roles)
      ? (adminUser.app_metadata.roles as string[])
      : []
    if (!existingRoles.includes('audience')) {
      await service.auth.admin.updateUserById(user.id, {
        app_metadata: { roles: [...existingRoles, 'audience'] },
      })
    }
  }

  const { error } = await supabase
    .from('audience_saved_fanflets')
    .upsert(
      {
        audience_account_id: audience.id,
        fanflet_id: fanfletId,
        save_source: 'manual',
      },
      { onConflict: 'audience_account_id,fanflet_id' },
    )

  if (error) {
    console.error('[audience/save] upsert error:', error.code, error.message)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ saved: true })
}
