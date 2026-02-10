'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
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
import { login, signInWithGoogle } from './actions'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setIsLoading(true)
    try {
      const result = await login(formData)
      if (result?.error) {
        setError(result.error)
      }
    } finally {
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
            Welcome back
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to continue to your account
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
        <form action={handleSubmit} className="space-y-4">
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/login/forgot-password"
                className="text-xs text-[#3BA5D9] hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              disabled={isLoading}
              className="border-[#e2e8f0] focus-visible:ring-[#3BA5D9]"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#1B365D] hover:bg-[#1B365D]/90"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
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
          disabled={isGoogleLoading}
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
              Sign in with Google
            </>
          )}
        </Button>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-medium text-[#3BA5D9] hover:underline"
          >
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
