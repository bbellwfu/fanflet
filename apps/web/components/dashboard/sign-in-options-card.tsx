'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

/** Shape we need for display and for unlinkIdentity (matches Supabase UserIdentity). */
type IdentityRow = {
  provider: string
  id?: string
  identity_id?: string
  user_id?: string
}

const PROVIDER_LABELS: Record<string, string> = {
  email: 'Email and password',
  google: 'Google',
}

function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider
}

/** Build the object Supabase auth.unlinkIdentity() expects (UserIdentity). */
function toUserIdentity(row: IdentityRow): { identity_id: string; user_id: string; provider: string } | null {
  const id = row.identity_id ?? row.id
  if (!id || !row.user_id) return null
  return { identity_id: id, user_id: row.user_id, provider: row.provider }
}

export function SignInOptionsCard({ initialProviders }: { initialProviders: string[] }) {
  const router = useRouter()
  const [identities, setIdentities] = useState<IdentityRow[]>(
    initialProviders.map((p) => ({ provider: p })),
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isLinking, setIsLinking] = useState(false)
  const [unlinkTarget, setUnlinkTarget] = useState<IdentityRow | null>(null)
  const [isUnlinking, setIsUnlinking] = useState(false)

  const refreshIdentities = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.identities && Array.isArray(user.identities)) {
      const list = user.identities as Array<Record<string, unknown>>
      setIdentities(
        list.map((i) => {
          const id = (i.identity_id ?? i.id) as string | undefined
          return {
            provider: (i.provider as string) ?? '',
            id,
            identity_id: id,
            user_id: i.user_id as string | undefined,
          }
        }),
      )
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void (async () => {
      await refreshIdentities()
    })()
  }, [refreshIdentities])

  const hasGoogle = identities.some((i) => i.provider === 'google')
  const hasEmail = identities.some((i) => i.provider === 'email')
  const canUnlink = identities.length >= 2

  async function handleLinkGoogle() {
    const supabase = createClient()
    const origin =
      typeof window !== 'undefined' ? window.location.origin : ''
    const redirectTo = `${origin}/auth/callback?next=/dashboard/settings`
    setIsLinking(true)
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) {
      toast.error(error.message)
      setIsLinking(false)
      return
    }
    if (data?.url) {
      window.location.href = data.url
      return
    }
    setIsLinking(false)
  }

  async function handleUnlink(identity: IdentityRow) {
    const payload = toUserIdentity(identity)
    if (!payload || identities.length < 2) return
    const supabase = createClient()
    setIsUnlinking(true)
    const { error } = await supabase.auth.unlinkIdentity(payload)
    setUnlinkTarget(null)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Sign-in method removed.')
      await refreshIdentities()
      router.refresh()
    }
    setIsUnlinking(false)
  }

  return (
    <>
      <Card id="sign-in-options" className="border-[#e2e8f0]">
        <CardHeader>
          <CardTitle className="text-[#1B365D]">Sign-in options</CardTitle>
          <CardDescription>
            Manage how you sign in to your account. You can link Google to sign in with either
            email/password or Google.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#1B365D]">Linked sign-in methods</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {hasEmail && <li>{providerLabel('email')}</li>}
                  {hasGoogle && <li>{providerLabel('google')}</li>}
                  {identities.length === 0 && (
                    <li className="text-muted-foreground">None detected</li>
                  )}
                </ul>
              </div>
              {!hasGoogle && (
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#e2e8f0] text-[#1B365D] hover:bg-[#1B365D]/5"
                  disabled={isLinking}
                  onClick={handleLinkGoogle}
                >
                  {isLinking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    'Link Google account'
                  )}
                </Button>
              )}
              {canUnlink && (
                <div className="pt-2 border-t border-[#e2e8f0]">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Remove a sign-in method (you must keep at least one)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {identities
                      .filter((i) => toUserIdentity(i) != null)
                      .map((identity) => (
                        <Button
                          key={identity.provider}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-destructive/30 text-destructive hover:bg-destructive/10"
                          disabled={identities.length < 2 || isUnlinking}
                          onClick={() => setUnlinkTarget(identity)}
                        >
                          Remove {providerLabel(identity.provider)}
                        </Button>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!unlinkTarget} onOpenChange={() => setUnlinkTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove sign-in method?</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer be able to sign in with{' '}
              {unlinkTarget ? providerLabel(unlinkTarget.provider) : ''}. You must keep at least
              one sign-in method.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => unlinkTarget && handleUnlink(unlinkTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
