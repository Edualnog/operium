"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { createClientComponentClient } from "@/lib/supabase-client"

interface ProfileFormProps {
  user: any
  initialProfile: {
    id: string
    name?: string | null
    company_name?: string | null
    cnpj?: string | null
    company_email?: string | null
    phone?: string | null
  } | null
}

export default function ProfileForm({ user, initialProfile }: ProfileFormProps) {
  const supabase = createClientComponentClient()
  const [form, setForm] = useState({
    name: initialProfile?.name || "",
    company_name: initialProfile?.company_name || "",
    cnpj: initialProfile?.cnpj || "",
    company_email: initialProfile?.company_email || "",
    phone: initialProfile?.phone || "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setInfo("")
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: form.name,
          company_name: form.company_name || null,
          cnpj: form.cnpj || null,
          company_email: form.company_email || null,
          phone: form.phone || null,
        })
        .eq("id", user.id)

      if (error) throw error
      setInfo("Dados atualizados com sucesso.")
    } catch (err: any) {
      setError(err.message || "Erro ao salvar perfil")
    } finally {
      setLoading(false)
    }
  }

  const onChange = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 sm:p-6 rounded-lg border border-zinc-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Telefone</Label>
          <Input
            value={form.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="(00) 00000-0000"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Empresa</Label>
          <Input
            value={form.company_name}
            onChange={(e) => onChange("company_name", e.target.value)}
            placeholder="Nome da empresa"
          />
        </div>
        <div className="space-y-1.5">
          <Label>CNPJ</Label>
          <Input
            value={form.cnpj}
            onChange={(e) => onChange("cnpj", e.target.value)}
            placeholder="00.000.000/0000-00"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Email da empresa</Label>
          <Input
            type="email"
            value={form.company_email}
            onChange={(e) => onChange("company_email", e.target.value)}
            placeholder="contato@empresa.com"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {info && <p className="text-sm text-green-600">{info}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  )
}
