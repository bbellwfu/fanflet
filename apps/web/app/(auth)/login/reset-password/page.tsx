'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePassword } from './actions'

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const result = await updatePassword(formData)
      if (result?.error) {
        setError(result.error)
        setIsLoading(false)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-[#e2e8f0] bg-white shadow-xl shadow-[#1B365D]/5">
      <CardHeader className="space-y-4 text-center">
        <Link
          href="/"
          className="flex items-center justify-center gap-2.5 hover:opacity-90 transition-opacity"
          aria-label="Fanflet - home"
        >
          <Image src="/logo.png" alt="" width={48} height={48} priority className="h-12 w-12" />
          <span className="text-2xl font-bold tracking-tight text-[#1B365D]">Fanflet</span>
        </Link>
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold text-[#1B365D]">
            Set a new password
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Choose a new password for your Fanflet account.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div
            className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive mb-4"
            role="alert"
          >
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              autoComplete="new-password"
              minLength={6}
              disabled={isLoading}
              className="border-[#e2e8f0] focus-visible:ring-[#3BA5D9]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm password</Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              disabled={isLoading}
              className="border-[#e2e8f0] focus-visible:ring-[#3BA5D9]"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#1B365D] hover:bg-[#1B365D]/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating password...
              </>
            ) : (
              'Update password'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
