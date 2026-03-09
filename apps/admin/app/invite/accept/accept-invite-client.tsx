"use client";

import { useState } from "react";
import { Button } from "@fanflet/ui/button";
import { Input } from "@fanflet/ui/input";
import { ShieldAlertIcon, ShieldIcon, Loader2Icon } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

interface AcceptInviteClientProps {
  email: string;
  role: "super_admin" | "platform_admin";
  token: string;
}

export function AcceptInviteClient({ email, role, token }: AcceptInviteClientProps) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          if (signInError.message.includes("Invalid login")) {
            setError("Invalid password. If you don't have an account, switch to Sign Up.");
          } else {
            setError(signInError.message);
          }
          return;
        }
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/invite/accept?token=${token}`,
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
      }

      // Reload page — server component will detect the session and complete acceptance
      window.location.href = `/invite/accept?token=${token}`;
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-sm p-8">
      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
          {role === "super_admin" ? (
            <ShieldAlertIcon className="w-6 h-6 text-purple-600" />
          ) : (
            <ShieldIcon className="w-6 h-6 text-blue-600" />
          )}
        </div>
        <h2 className="text-lg font-semibold text-fg">
          Join Fanflet Admin Team
        </h2>
        <p className="text-sm text-fg-muted mt-1">
          You&apos;ve been invited as a{" "}
          <strong>{role === "super_admin" ? "Super Admin" : "Admin"}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-fg-secondary">Email</label>
          <Input type="email" value={email} disabled className="bg-surface-elevated" />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-fg-secondary">Password</label>
          <Input
            type="password"
            placeholder={mode === "signup" ? "Create a password" : "Enter your password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            minLength={8}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={isLoading || password.length < 8}>
          {isLoading && <Loader2Icon className="w-4 h-4 animate-spin mr-1.5" />}
          {mode === "login" ? "Sign In & Accept" : "Create Account & Accept"}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
        >
          {mode === "login"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
