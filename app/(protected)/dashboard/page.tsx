import Link from "next/link"
import type { Metadata } from "next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createSupabaseServerClient } from "@/lib/supabase-server"

export const metadata: Metadata = {
  title: "Dashboard",
}

type InvoiceRow = {
  id: string
  invoice_number: number
  total: number
  due_date: string | null
  status: "paid" | "pending" | "overdue"
  created_at: string
  clients: { name: string | null } | null
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value)

const formatInvoiceNumber = (invoiceNumber: number) => `INV-${String(invoiceNumber).padStart(3, "0")}`

const formatDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value)) : "-"

const statusStyles: Record<InvoiceRow["status"], string> = {
  paid: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
}

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient()

  await supabase.rpc("mark_overdue_invoices")

  const { data: invoicesData, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, due_date, status, created_at, clients(name)")
    .order("created_at", { ascending: false })

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error.message}</p>
        </CardContent>
      </Card>
    )
  }

  const invoices = (invoicesData as InvoiceRow[]) ?? []

  const totalInvoices = invoices.length
  const totalPaid = invoices
    .filter((invoice) => invoice.status === "paid")
    .reduce((sum, invoice) => sum + Number(invoice.total), 0)
  const pendingAmount = invoices
    .filter((invoice) => invoice.status === "pending")
    .reduce((sum, invoice) => sum + Number(invoice.total), 0)
  const overdueCount = invoices.filter((invoice) => invoice.status === "overdue").length
  const recentInvoices = invoices.slice(0, 8)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Overview of your invoicing activity.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total invoices</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totalInvoices}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total paid</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatCurrency(totalPaid)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending amount</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatCurrency(pendingAmount)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue count</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{overdueCount}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No invoices yet.
                  </TableCell>
                </TableRow>
              ) : (
                recentInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/invoices/${invoice.id}/preview`} className="block w-full">
                        {formatInvoiceNumber(invoice.invoice_number)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/invoices/${invoice.id}/preview`} className="block w-full">
                        {invoice.clients?.name ?? "-"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/invoices/${invoice.id}/preview`} className="block w-full">
                        {formatCurrency(Number(invoice.total))}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/invoices/${invoice.id}/preview`} className="block w-full">
                        {formatDate(invoice.due_date)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/invoices/${invoice.id}/preview`} className="block w-full">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${statusStyles[invoice.status]}`}
                        >
                          {invoice.status}
                        </span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
