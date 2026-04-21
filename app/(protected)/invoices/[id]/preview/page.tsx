import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { InvoicePdfDownload } from "@/components/invoice-pdf-download"
import { createSupabaseServerClient } from "@/lib/supabase-server"

const formatInvoiceNumber = (invoiceNumber: number) => `INV-${String(invoiceNumber).padStart(3, "0")}`
const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value)

const dateText = (value: string | null) =>
  value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value)) : "-"

const cleanPhone = (phone: string | null) => (phone ?? "").replace(/\D/g, "")

export const metadata: Metadata = {
  title: "Invoice Preview",
}

async function markInvoicePaid(formData: FormData) {
  "use server"

  const invoiceId = String(formData.get("invoiceId") ?? "")
  if (!invoiceId) return

  const supabase = createSupabaseServerClient()
  await supabase.from("invoices").update({ status: "paid" }).eq("id", invoiceId)
  revalidatePath(`/invoices/${invoiceId}/preview`)
  revalidatePath("/dashboard")
  revalidatePath("/invoices")
}

export default async function InvoicePreviewPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, user_id, invoice_number, status, subtotal, tax_amount, total, due_date, notes, created_at, clients(name, phone, email, address, gstin)")
    .eq("id", params.id)
    .single()

  if (invoiceError || !invoice) {
    notFound()
  }

  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select("id, description, quantity, rate, tax_percent, amount")
    .eq("invoice_id", params.id)
    .order("id")

  if (itemsError) {
    notFound()
  }

  const { data: business, error: businessError } = await supabase
    .from("users")
    .select("business_name, logo_url, upi_id, email")
    .eq("id", invoice.user_id)
    .single()

  if (businessError || !business) {
    notFound()
  }

  const gstBreakdown = (items ?? []).reduce<Record<string, number>>((acc, item) => {
    const key = `${Number(item.tax_percent)}%`
    const current = acc[key] ?? 0
    const tax = (Number(item.amount) * Number(item.tax_percent)) / 100
    acc[key] = current + tax
    return acc
  }, {})

  const upiQrUrl = business.upi_id
    ? `https://upiqr.in/api/qr?vpa=${encodeURIComponent(business.upi_id)}&amount=${Number(invoice.total).toFixed(2)}`
    : null

  const clientPhone = cleanPhone(invoice.clients?.phone ?? null)
  const whatsappPhone = clientPhone.startsWith("91") ? clientPhone : `91${clientPhone.slice(-10)}`
  const invoiceNumberText = formatInvoiceNumber(invoice.invoice_number)
  const whatsappMessage = `Hi ${invoice.clients?.name ?? "Customer"}, here is your invoice #${invoiceNumberText} for ${currency(Number(invoice.total))} due on ${dateText(invoice.due_date)}. Please pay via UPI: ${business.upi_id ?? "-"} — ${business.business_name ?? "My Business"}`
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappMessage)}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Invoice Preview</h2>
          <p className="text-sm text-muted-foreground">{invoiceNumberText}</p>
        </div>
        <div className="flex gap-2">
          <InvoicePdfDownload
            invoiceNumber={invoiceNumberText}
            businessName={business.business_name ?? "My Business"}
            businessEmail={business.email ?? ""}
            clientName={invoice.clients?.name ?? ""}
            clientEmail={invoice.clients?.email ?? ""}
            clientPhone={invoice.clients?.phone ?? ""}
            dueDate={dateText(invoice.due_date)}
            notes={invoice.notes ?? ""}
            subtotal={Number(invoice.subtotal)}
            gstAmount={Number(invoice.tax_amount)}
            total={Number(invoice.total)}
            items={
              (items ?? []).map((item) => ({
                id: item.id,
                description: item.description,
                quantity: Number(item.quantity),
                rate: Number(item.rate),
                tax_percent: Number(item.tax_percent),
                amount: Number(item.amount),
              }))
            }
          />
          <Button variant="outline" render={<Link href={whatsappUrl} target="_blank" rel="noreferrer" />}>
            Send on WhatsApp
          </Button>
          {invoice.status !== "paid" ? (
            <form action={markInvoicePaid}>
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <Button type="submit">Mark as paid</Button>
            </form>
          ) : null}
          <Button variant="outline" render={<Link href="/invoices" />}>
            Back to invoices
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">{business.business_name ?? "My Business"}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{business.email ?? ""}</p>
          </div>
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logo_url} alt="Business logo" className="h-16 w-16 rounded-md object-cover" />
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-6 text-sm md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Bill To</p>
            <p className="font-medium">{invoice.clients?.name ?? "-"}</p>
            <p>{invoice.clients?.phone ?? "-"}</p>
            <p>{invoice.clients?.email ?? "-"}</p>
            <p>{invoice.clients?.address ?? "-"}</p>
            <p>GSTIN: {invoice.clients?.gstin ?? "-"}</p>
          </div>
          <div className="space-y-1 md:text-right">
            <p>Invoice: {invoiceNumberText}</p>
            <p>Invoice date: {dateText(invoice.created_at)}</p>
            <p>Due date: {dateText(invoice.due_date)}</p>
            <p>Status: <span className="capitalize">{invoice.status}</span></p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>GST%</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Tax</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{Number(item.quantity).toFixed(2)}</TableCell>
                  <TableCell>{currency(Number(item.rate))}</TableCell>
                  <TableCell>{Number(item.tax_percent).toFixed(0)}%</TableCell>
                  <TableCell>{currency(Number(item.amount))}</TableCell>
                  <TableCell>{currency((Number(item.amount) * Number(item.tax_percent)) / 100)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">GST Breakdown</p>
              {Object.entries(gstBreakdown).length === 0 ? (
                <p className="text-sm text-muted-foreground">No GST applied.</p>
              ) : (
                Object.entries(gstBreakdown).map(([rate, amount]) => (
                  <p key={rate} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{rate}</span>
                    <span>{currency(amount)}</span>
                  </p>
                ))
              )}
            </div>
            <div className="space-y-2 text-right text-sm">
              <p>
                <span className="text-muted-foreground">Subtotal: </span>
                {currency(Number(invoice.subtotal))}
              </p>
              <p>
                <span className="text-muted-foreground">GST: </span>
                {currency(Number(invoice.tax_amount))}
              </p>
              <p className="text-base font-semibold">
                Total: {currency(Number(invoice.total))}
              </p>
            </div>
          </div>

          {invoice.notes ? (
            <p>
              <span className="text-muted-foreground">Notes: </span>
              {invoice.notes}
            </p>
          ) : null}

          {upiQrUrl ? (
            <div className="mt-4 w-fit rounded-lg border p-3">
              <p className="mb-2 text-sm font-medium">Scan to Pay (UPI)</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={upiQrUrl} alt="UPI QR Code" className="h-44 w-44 rounded-md" />
              <p className="mt-2 text-xs text-muted-foreground">{business.upi_id}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Add your UPI ID in settings to show QR code.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
