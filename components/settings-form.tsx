"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSupabaseBrowserClient } from "@/lib/supabase"

type Profile = {
  business_name: string | null
  upi_id: string | null
  logo_url: string | null
  email: string | null
}

export function SettingsForm() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [email, setEmail] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [upiId, setUpiId] = useState("")
  const [logoUrl, setLogoUrl] = useState("")

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        toast.error("Please log in again.")
        setLoading(false)
        return
      }

      setEmail(user.email ?? "")

      const { data, error } = await supabase
        .from("users")
        .select("business_name, upi_id, logo_url, email")
        .eq("id", user.id)
        .maybeSingle()

      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }

      const profile = data as Profile | null
      setBusinessName(profile?.business_name ?? "")
      setUpiId(profile?.upi_id ?? "")
      setLogoUrl(profile?.logo_url ?? "")
      if (profile?.email) {
        setEmail(profile.email)
      }
      setLoading(false)
    }

    void loadProfile()
  }, [supabase])

  const uploadLogo = async (file: File) => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      toast.error("Please log in again.")
      return
    }

    setUploading(true)
    const ext = file.name.split(".").pop() ?? "png"
    const path = `${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from("logos").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    })

    if (uploadError) {
      toast.error(uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from("logos").getPublicUrl(path)
    setLogoUrl(data.publicUrl)
    setUploading(false)
    toast.success("Logo uploaded.")
  }

  const saveSettings = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      toast.error("Please log in again.")
      return
    }

    setSaving(true)
    const { error } = await supabase.from("users").upsert({
      id: user.id,
      email: email || user.email || "",
      business_name: businessName.trim() || null,
      upi_id: upiId.trim() || null,
      logo_url: logoUrl || null,
    })

    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }

    toast.success("Settings saved.")
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="business-name">Business name</Label>
              <Input
                id="business-name"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="Your business name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upi-id">UPI ID</Label>
              <Input
                id="upi-id"
                value={upiId}
                onChange={(event) => setUpiId(event.target.value)}
                placeholder="name@bank"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Business logo</Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    void uploadLogo(file)
                  }
                }}
              />
              {uploading ? <p className="text-xs text-muted-foreground">Uploading logo...</p> : null}
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Business logo" className="h-20 w-20 rounded-md border object-cover" />
              ) : null}
            </div>

            <Button type="button" onClick={saveSettings} disabled={saving || uploading}>
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
