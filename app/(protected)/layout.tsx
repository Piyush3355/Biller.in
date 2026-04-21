import Link from "next/link"
import { redirect } from "next/navigation"
import { buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { logout } from "@/app/(auth)/actions"

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/invoices", label: "Invoices" },
  { href: "/settings", label: "Settings" },
]

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r bg-muted/30 p-4">
        <h1 className="mb-6 text-xl font-semibold">Biller</h1>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(buttonVariants({ variant: "ghost" }), "justify-start")}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <Separator />
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <form action={logout}>
            <button className={cn(buttonVariants({ variant: "outline" }), "w-full")} type="submit">
              Logout
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
