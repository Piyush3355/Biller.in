import Link from "next/link"
import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Invoices",
}

export default function InvoicesPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Invoices</CardTitle>
        <Button render={<Link href="/invoices/new" />}>New invoice</Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Track invoices and payment status here.</p>
      </CardContent>
    </Card>
  )
}
