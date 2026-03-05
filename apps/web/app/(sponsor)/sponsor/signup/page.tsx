"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sponsorSignup } from "./actions";

export default function SponsorSignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await sponsorSignup(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.success);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md border-[#e2e8f0] bg-white shadow-xl shadow-[#1B365D]/5">
        <CardHeader className="space-y-4 text-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2.5 hover:opacity-90 transition-opacity"
            aria-label="Fanflet – home"
          >
            <Image src="/logo.png" alt="" width={48} height={48} priority className="h-12 w-12" />
            <span className="text-2xl font-bold tracking-tight text-[#1B365D]">Fanflet</span>
          </Link>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-[#1B365D]">Sponsor sign up</CardTitle>
            <CardDescription className="text-muted-foreground">
              Create an account to view your engagement and leads
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
          {success && (
            <div
              className="rounded-md border border-emerald-500/50 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              role="alert"
            >
              {success}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
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
                required
                autoComplete="new-password"
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
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[#3BA5D9] hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
