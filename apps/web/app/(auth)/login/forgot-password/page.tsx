'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordReset } from './actions'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const result = await requestPasswordReset(formData)
      if (result.error) {
        setError(result.error)
      } else if (result.success) {
        setSuccess(result.success)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
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
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-[#3BA5D9]/10 flex items-center justify-center">
              <Mail className="h-7 w-7 text-[#3BA5D9]" strokeWidth={1.75} />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-[#1B365D]">Check your email</CardTitle>
            <CardDescription className="text-muted-foreground">{success}</CardDescription>
          </div>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to sign in
            </Link>
          </Button>
        </CardFooter>
      </Card>
    )
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
            Forgot your password?
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter the email address associated with your account and we&apos;ll send you a link to
            reset your password.
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoFocus
              autoComplete="email"
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
                Sending reset link...
              </>
            ) : (
              'Send reset link'
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link
          href="/login"
          className="text-sm font-medium text-[#3BA5D9] hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  )
}
