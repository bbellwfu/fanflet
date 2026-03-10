'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type IdentityRow = {
  provider: string
  id?: string
  identity_id?: string
  user_id?: string
}

interface SignInOptionsCardProps {
  initialProviders: string[]
  userEmail: string
}

const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 72

const PROVIDER_LABELS: Record<string, string> = {
  email: 'Email and password',
  google: 'Google',
}

function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider
}

function toUserIdentity(row: IdentityRow): { identity_id: string; user_id: string; provider: string } | null {
  const id = row.identity_id ?? row.id
  if (!id || !row.user_id) return null
  return { identity_id: id, user_id: row.user_id, provider: row.provider }
}

export function SignInOptionsCard({ initialProviders, userEmail }: SignInOptionsCardProps) {
  const router = useRouter()
  const [identities, setIdentities] = useState<IdentityRow[]>(
    initialProviders.map((p) => ({ provider: p })),
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isLinking, setIsLinking] = useState(false)
  const [unlinkTarget, setUnlinkTarget] = useState<IdentityRow | null>(null)
  const [isUnlinking, setIsUnlinking] = useState(false)

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSettingPassword, setIsSettingPassword] = useState(false)

  const refreshIdentities = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.identities && Array.isArray(user.identities)) {
      setIdentities(
        user.identities.map((i) => ({
          provider: i.provider ?? '',
          id: i.id,
          identity_id: i.identity_id ?? i.id,
          user_id: i.user_id,
        })),
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

  function resetPasswordForm() {
    setShowPasswordForm(false)
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setPasswordError(null)
  }

  async function handleSetPassword() {
    setPasswordError(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      setPasswordError(`Password must be at most ${MAX_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    const supabase = createClient()
    setIsSettingPassword(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setPasswordError(error.message)
      setIsSettingPassword(false)
      return
    }

    toast.success('Password set. You can now sign in with email and password.')
    resetPasswordForm()
    await refreshIdentities()
    router.refresh()
    setIsSettingPassword(false)
  }

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
    const { error } = await supabase.auth.unlinkIdentity(payload as unknown as Parameters<typeof supabase.auth.unlinkIdentity>[0])
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
            Manage how you sign in to your account.
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

              {/* Link Google — for email-only users */}
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

              {/* Set up password — for OAuth-only users */}
              {!hasEmail && (
                <div className="rounded-md border border-[#e2e8f0] bg-slate-50/50 p-4 space-y-3">
                  {!showPasswordForm ? (
                    <>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-[#1B365D]">
                          Set up email &amp; password
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Add a password so you can also sign in with your email ({userEmail}).
                          This lets you disconnect Google later if you choose.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-[#e2e8f0] text-[#1B365D] hover:bg-[#1B365D]/5"
                        onClick={() => setShowPasswordForm(true)}
                      >
                        Set up password
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-[#1B365D]">
                          Set up email &amp; password
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Your email: <span className="font-medium text-[#1B365D]">{userEmail}</span>
                        </p>
                      </div>

                      <div className="space-y-3 max-w-sm">
                        <div className="space-y-1.5">
                          <Label htmlFor="new-password" className="text-xs">
                            New password
                          </Label>
                          <div className="relative">
                            <Input
                              id="new-password"
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => {
                                setPassword(e.target.value)
                                setPasswordError(null)
                              }}
                              autoComplete="new-password"
                              disabled={isSettingPassword}
                              className="border-[#e2e8f0] focus-visible:ring-[#3BA5D9] pr-10"
                            />
                            <button
                              type="button"
                              tabIndex={-1}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#1B365D] transition-colors"
                              onClick={() => setShowPassword((v) => !v)}
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="confirm-password" className="text-xs">
                            Confirm password
                          </Label>
                          <div className="relative">
                            <Input
                              id="confirm-password"
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value)
                                setPasswordError(null)
                              }}
                              autoComplete="new-password"
                              disabled={isSettingPassword}
                              className="border-[#e2e8f0] focus-visible:ring-[#3BA5D9] pr-10"
                            />
                            <button
                              type="button"
                              tabIndex={-1}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#1B365D] transition-colors"
                              onClick={() => setShowConfirmPassword((v) => !v)}
                              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                          Must be at least {MIN_PASSWORD_LENGTH} characters.
                        </p>

                        {passwordError && (
                          <p className="text-sm text-destructive" role="alert">
                            {passwordError}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-[#e2e8f0] text-muted-foreground hover:bg-slate-100"
                            disabled={isSettingPassword}
                            onClick={resetPasswordForm}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="bg-[#1B365D] hover:bg-[#1B365D]/90"
                            disabled={isSettingPassword || !password || !confirmPassword}
                            onClick={handleSetPassword}
                          >
                            {isSettingPassword ? (
                              <>
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save password'
                            )}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
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
