'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function ForgotPasswordPage() {
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
            Forgot your password?
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Password reset is coming soon. For now, please contact support or
            sign in with your existing password.
          </CardDescription>
        </div>
      </CardHeader>
      <CardFooter className="flex justify-center">
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
