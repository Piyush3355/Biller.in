"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"

export async function loginWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")
  const supabase = createSupabaseServerClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect("/dashboard")
}

export async function signUpWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")
  const supabase = createSupabaseServerClient()

  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  redirect("/dashboard")
}

export async function signInWithGoogle() {
  const supabase = createSupabaseServerClient()
  const origin = headers().get("origin") ?? ""

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  })

  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Google sign in failed.")}`)
  }

  redirect(data.url)
}

export async function logout() {
  const supabase = createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect("/login")
}
