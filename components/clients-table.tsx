"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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

type ClientRow = {
  id: string
  name: string
  phone: string
  email: string | null
  address: string | null
  gstin: string | null
}

type ClientFormState = {
  name: string
  phone: string
  email: string
  address: string
  gstin: string
}

const initialFormState: ClientFormState = {
  name: "",
  phone: "",
  email: "",
  address: "",
  gstin: "",
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").slice(0, 10)
}

function toDisplayPhone(phone: string) {
  if (phone.startsWith("+91")) {
    return phone.slice(3)
  }

  return phone.replace(/\D/g, "")
}

export function ClientsTable() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [form, setForm] = useState<ClientFormState>(initialFormState)

  const fetchClients = useCallback(async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, phone, email, address, gstin")
      .order("created_at", { ascending: false })

    if (error) {
      toast.error(error.message)
      return
    }

    setClients((data as ClientRow[]) ?? [])
  }, [supabase])

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        toast.error("Please log in again.")
        setLoading(false)
        return
      }

      setUserId(user.id)
      await fetchClients()
      setLoading(false)
    }

    void init()
  }, [fetchClients, supabase])

  const openCreateDialog = () => {
    setEditingClientId(null)
    setForm(initialFormState)
    setIsDialogOpen(true)
  }

  const openEditDialog = (client: ClientRow) => {
    setEditingClientId(client.id)
    setForm({
      name: client.name,
      phone: toDisplayPhone(client.phone),
      email: client.email ?? "",
      address: client.address ?? "",
      gstin: client.gstin ?? "",
    })
    setIsDialogOpen(true)
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!userId) {
      toast.error("User session not found.")
      return
    }

    const phoneDigits = normalizePhone(form.phone)

    if (phoneDigits.length !== 10) {
      toast.error("Phone number must be 10 digits.")
      return
    }

    setIsSaving(true)

    const payload = {
      user_id: userId,
      name: form.name.trim(),
      phone: `+91${phoneDigits}`,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      gstin: form.gstin.trim() || null,
    }

    if (editingClientId) {
      const { error } = await supabase.from("clients").update(payload).eq("id", editingClientId)

      if (error) {
        toast.error(error.message)
        setIsSaving(false)
        return
      }

      toast.success("Client updated.")
    } else {
      const { error } = await supabase.from("clients").insert(payload)

      if (error) {
        toast.error(error.message)
        setIsSaving(false)
        return
      }

      toast.success("Client created.")
    }

    await fetchClients()
    setIsSaving(false)
    setIsDialogOpen(false)
    setEditingClientId(null)
    setForm(initialFormState)
  }

  const onDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this client?")
    if (!confirmed) return

    const { error } = await supabase.from("clients").delete().eq("id", id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success("Client deleted.")
    await fetchClients()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Clients</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button onClick={openCreateDialog} />}>
            <Plus className="mr-1 size-4" />
            New client
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingClientId ? "Edit client" : "New client"}</DialogTitle>
              <DialogDescription>
                {editingClientId ? "Update client details." : "Add a new client to your account."}
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="flex items-center rounded-md border border-input">
                  <span className="border-r px-3 py-2 text-sm text-muted-foreground">+91</span>
                  <Input
                    id="phone"
                    required
                    className="border-0 shadow-none focus-visible:ring-0"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.phone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, phone: normalizePhone(event.target.value) }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  rows={3}
                  value={form.address}
                  onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  value={form.gstin}
                  onChange={(event) => setForm((prev) => ({ ...prev, gstin: event.target.value.toUpperCase() }))}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingClientId ? "Update client" : "Create client"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading clients...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No clients yet.
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>{client.name}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>{client.email ?? "-"}</TableCell>
                    <TableCell>{client.gstin ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(client)}
                        >
                          <Pencil className="mr-1 size-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => onDelete(client.id)}
                        >
                          <Trash2 className="mr-1 size-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
