import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"

export default async function HomePage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/login")
  }

  try {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()

    if (data?.user) {
      redirect("/dashboard")
    }
  } catch {
    redirect("/login")
  }

  redirect("/login")
}

