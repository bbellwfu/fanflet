import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const SwitchRoleSchema = z.object({
  role: z.enum(['speaker', 'sponsor']),
})

const ROLE_HOME: Record<string, string> = {
  speaker: '/dashboard',
  sponsor: '/sponsor/dashboard',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = SwitchRoleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const { role } = parsed.data
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const roles = (user.app_metadata as Record<string, unknown>)?.roles
    if (!Array.isArray(roles) || !roles.includes(role)) {
      return NextResponse.json({ error: 'Role not available' }, { status: 403 })
    }

    const redirectUrl = ROLE_HOME[role] ?? '/dashboard'
    const response = NextResponse.json({ redirect: redirectUrl })

    response.cookies.set('active_role', role, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
