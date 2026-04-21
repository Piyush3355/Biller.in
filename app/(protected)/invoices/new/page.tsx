"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { getSupabaseBrowserClient } from "@/lib/supabase"

type ClientOption = {
  id: string
  name: string
}

type LineItem = {
  id: string
  description: string
  quantity: number
  rate: number
  gstPercent: number
}

const gstOptions = [0, 5, 12, 18, 28]

const createLineItem = (): LineItem => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: 1,
  rate: 0,
  gstPercent: 18,
})

const formatInvoiceNumber = (invoiceNumber: number) => `INV-${String(invoiceNumber).padStart(3, "0")}`

const formatDateInput = (value: Date) => value.toISOString().slice(0, 10)

export default function NewInvoicePage() {
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientId, setClientId] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(formatDateInput(new Date()))
  const [dueDate, setDueDate] = useState(formatDateInput(new Date()))
  const [notes, setNotes] = useState("")
  const [lineItems, setLineItems] = useState<LineItem[]>([createLineItem()])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name")

      if (error) {
        toast.error(error.message)
        return
      }

      const rows = (data as ClientOption[]) ?? []
      setClients(rows)
      if (rows.length > 0) {
        setClientId(rows[0].id)
      }
    }

    void fetchClients()
  }, [supabase])

  const totals = useMemo(() => {
    let subtotal = 0
    let gstAmount = 0

    for (const item of lineItems) {
      const base = item.quantity * item.rate
      const tax = (base * item.gstPercent) / 100
      subtotal += base
      gstAmount += tax
    }

    return {
      subtotal,
      gstAmount,
      grandTotal: subtotal + gstAmount,
    }
  }, [lineItems])

  const updateLineItem = <K extends keyof LineItem>(id: string, key: K, value: LineItem[K]) => {
    setLineItems((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)))
  }

  const addLineItem = () => setLineItems((prev) => [...prev, createLineItem()])

  const removeLineItem = (id: string) => {
    setLineItems((prev) => (prev.length === 1 ? prev : prev.filter((item) => item.id !== id)))
  }

  const submitInvoice = async () => {
    if (!clientId) {
      toast.error("Please select a client.")
      return
    }

    if (lineItems.some((item) => !item.description.trim())) {
      toast.error("Each line item needs a description.")
      return
    }

    setIsSaving(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      toast.error("Please log in again.")
      setIsSaving(false)
      return
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        user_id: user.id,
        client_id: clientId,
        status: "pending",
        subtotal: Number(totals.subtotal.toFixed(2)),
        tax_amount: Number(totals.gstAmount.toFixed(2)),
        total: Number(totals.grandTotal.toFixed(2)),
        due_date: dueDate || null,
        notes: notes.trim() || null,
        created_at: invoiceDate ? new Date(`${invoiceDate}T00:00:00.000Z`).toISOString() : undefined,
      })
      .select("id, invoice_number")
      .single()

    if (invoiceError || !invoice) {
      toast.error(invoiceError?.message ?? "Failed to save invoice.")
      setIsSaving(false)
      return
    }

    const itemPayload = lineItems.map((item) => ({
      invoice_id: invoice.id,
      description: item.description.trim(),
      quantity: Number(item.quantity.toFixed(2)),
      rate: Number(item.rate.toFixed(2)),
      tax_percent: item.gstPercent,
      amount: Number((item.quantity * item.rate).toFixed(2)),
    }))

    const { error: itemsError } = await supabase.from("invoice_items").insert(itemPayload)

    if (itemsError) {
      await supabase.from("invoices").delete().eq("id", invoice.id)
      toast.error(itemsError.message)
      setIsSaving(false)
      return
    }

    toast.success(`Invoice ${formatInvoiceNumber(invoice.invoice_number)} created.`)
    router.push(`/invoices/${invoice.id}/preview`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">New Invoice</h2>
          <p className="text-sm text-muted-foreground">Create and save an invoice for a client.</p>
        </div>
        <Button variant="outline" render={<Link href="/invoices" />}>
          Back to invoices
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <select
                id="client"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {clients.length === 0 ? <option value="">No clients found</option> : null}
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-date">Invoice date</Label>
              <Input
                id="invoice-date"
                type="date"
                value={invoiceDate}
                onChange={(event) => setInvoiceDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due-date">Due date</Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Line Items</h3>
              <Button type="button" variant="outline" onClick={addLineItem}>
                <Plus className="mr-1 size-4" />
                Add row
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>GST%</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item) => {
                  const amount = item.quantity * item.rate
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(event) => updateLineItem(item.id, "description", event.target.value)}
                          placeholder="Service or product"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          step="0.01"
                          value={item.quantity}
                          onChange={(event) =>
                            updateLineItem(item.id, "quantity", Number(event.target.value || 0))
                          }
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(event) => updateLineItem(item.id, "rate", Number(event.target.value || 0))}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          value={item.gstPercent}
                          onChange={(event) => updateLineItem(item.id, "gstPercent", Number(event.target.value))}
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          {gstOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}%
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>{amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeLineItem(item.id)}
                          disabled={lineItems.length === 1}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Payment terms or additional notes"
              />
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">GST</span>
                <span>{totals.gstAmount.toFixed(2)}</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-4 font-semibold">
                <span>Grand Total</span>
                <span>{totals.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Button type="button" onClick={submitInvoice} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save invoice"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
