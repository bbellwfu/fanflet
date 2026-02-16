"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@fanflet/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@fanflet/ui/card";
import { Input } from "@fanflet/ui/input";
import { Label } from "@fanflet/ui/label";
import { Shield } from "lucide-react";
import { login, signInWithGoogle } from "./actions";

const FANFLET_WEB_URL = "https://fanflet.com";

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed: "Sign-in failed. Please try again.",
  admin_required:
    "You don't have admin access. Sign in with an account that has platform admin rights.",
};

interface LoginFormProps {
  error: string | null;
}

export function LoginForm({ error: initialError }: LoginFormProps) {
  const [error, setError] = useState<string | null>(
    initialError ? ERROR_MESSAGES[initialError] ?? initialError : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setIsLoading(true);
    try {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result?.error) {
        setError(result.error);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 sm:p-8 md:p-10">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold">Fanflet Admin</CardTitle>
            <CardDescription>
              Platform administration access
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
                placeholder="admin@fanflet.com"
                required
                autoFocus
                autoComplete="email"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href={`${FANFLET_WEB_URL}/login/forgot-password`}
                  className="text-xs text-primary hover:text-primary/80 hover:underline"
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
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full border-border hover:bg-accent hover:border-primary/30"
            disabled={isGoogleLoading}
            onClick={handleGoogleSignIn}
          >
            {isGoogleLoading ? (
              "Redirecting..."
            ) : (
              <span className="inline-flex items-center gap-2">
                <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
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
              </span>
            )}
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Use your Fanflet platform admin credentials.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
