'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, Mail, Check } from 'lucide-react'
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
import { signup, signInWithGoogle } from './actions'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)
    try {
      const formData = new FormData(e.currentTarget)
      const result = await signup(formData)
      if (result?.error) {
        setError(result.error)
        setIsLoading(false)
      } else if (result?.success) {
        setSuccess(result.success)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setError(null)
    setIsGoogleLoading(true)
    try {
      const result = await signInWithGoogle()
      if (result?.error) {
        setError(result.error)
      }
    } finally {
      setIsGoogleLoading(false)
    }
  }

  // ── Success state: account created, check email ──
  if (success) {
    return (
      <Card className="w-full max-w-md border-[#e2e8f0] bg-white shadow-xl shadow-[#1B365D]/5 rounded-2xl">
        <div className="flex flex-col items-center text-center px-10 py-12 sm:px-12">
          {/* Branding */}
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <Image
              src="/logo.png"
              alt="Fanflet"
              width={32}
              height={32}
              priority
              className="h-8 w-8"
            />
            <span className="text-xl font-bold tracking-tight text-[#1B365D]">Fanflet</span>
          </div>

          {/* Large checkmark */}
          <div className="w-20 h-20 rounded-full bg-[#A8D5BA]/40 flex items-center justify-center mb-6">
            <Check className="h-9 w-9 text-emerald-700" strokeWidth={2.5} />
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1B365D] mb-1">
            Account created!
          </h1>

          {/* Mail icon */}
          <Mail className="h-7 w-7 text-[#3BA5D9] mt-4 mb-4" strokeWidth={1.75} />

          {/* Main message */}
          <p className="text-base text-slate-600 max-w-sm leading-relaxed mb-3">
            {success}
          </p>

          {/* Helper text */}
          <p className="text-sm text-slate-400 mb-8">
            Didn&apos;t receive it? Check your spam folder or{' '}
            <Link href="/signup" className="text-[#3BA5D9] hover:underline">
              try signing up again
            </Link>
            .
          </p>

          {/* Divider */}
          <div className="w-full border-t border-slate-200 mb-6" />

          {/* Sign in link */}
          <p className="text-sm text-slate-500">
            Already confirmed?{' '}
            <Link
              href="/login"
              className="font-medium text-[#3BA5D9] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    )
  }

  // ── Default state: signup form ──
  return (
    <Card className="w-full max-w-md border-[#e2e8f0] bg-white shadow-xl shadow-[#1B365D]/5">
      <CardHeader className="space-y-4 text-center">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="Fanflet"
            width={48}
            height={48}
            priority
            className="h-12 w-12"
          />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold text-[#1B365D]">
            Create your account
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Start building lasting audience connections
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div
            className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Jane Doe"
              required
              autoFocus
              autoComplete="name"
              disabled={isLoading}
              className="border-[#e2e8f0] focus-visible:ring-[#3BA5D9]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              disabled={isLoading}
              className="border-[#e2e8f0] focus-visible:ring-[#3BA5D9]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="new-password"
              disabled={isLoading}
              minLength={6}
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
                Creating your account...
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[#e2e8f0]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full border-[#e2e8f0] hover:bg-[#f1f5f9] hover:border-[#3BA5D9]/30"
          disabled={isGoogleLoading || isLoading}
          onClick={handleGoogleSignIn}
        >
          {isGoogleLoading ? (
            'Redirecting...'
          ) : (
            <>
              <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign up with Google
            </>
          )}
        </Button>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-[#3BA5D9] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
