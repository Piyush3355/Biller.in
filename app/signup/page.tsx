import Link from "next/link"
import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signInWithGoogle, signUpWithPassword } from "@/app/(auth)/actions"

export const metadata: Metadata = {
  title: "Sign Up",
}

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>Create an account to start billing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {searchParams.error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {searchParams.error}
            </p>
          ) : null}

          <form action={signUpWithPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" minLength={6} required />
            </div>
            <Button type="submit" className="w-full">
              Sign up
            </Button>
          </form>

          <form action={signInWithGoogle}>
            <Button type="submit" variant="outline" className="w-full">
              Continue with Google
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
