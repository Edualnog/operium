"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Building2, ArrowRight, SkipForward } from "lucide-react"

export default function CompanySetupPage() {
    const [companyName, setCompanyName] = useState("")
    const [cnpj, setCnpj] = useState("")
    const [phone, setPhone] = useState("")
    const [loading, setLoading] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClientComponentClient()

    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUserId(user.id)
            } else {
                router.push("/login")
            }
        }
        getUser()
    }, [router, supabase.auth])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!userId) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    company_name: companyName,
                    cnpj: cnpj || null,
                    phone: phone || null,
                })
                .eq("id", userId)

            if (error) throw error

            router.push("/dashboard")
        } catch (error) {
            console.error("Erro ao atualizar perfil:", error)
            // Opcional: mostrar toast de erro
        } finally {
            setLoading(false)
        }
    }

    const handleSkip = () => {
        router.push("/dashboard")
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-lg border-slate-200">
                <CardHeader className="space-y-1">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Configure sua empresa</CardTitle>
                    <CardDescription>
                        Adicione os dados do seu negócio para personalizar sua experiência.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Nome da Empresa <span className="text-red-500">*</span></Label>
                            <Input
                                id="companyName"
                                placeholder="Ex: Minha Loja Ltda"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cnpj">CNPJ <span className="text-slate-400 font-normal">(opcional)</span></Label>
                            <Input
                                id="cnpj"
                                placeholder="00.000.000/0000-00"
                                value={cnpj}
                                onChange={(e) => setCnpj(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone <span className="text-slate-400 font-normal">(opcional)</span></Label>
                            <Input
                                id="phone"
                                placeholder="(00) 00000-0000"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3 pt-2">
                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={loading || !companyName}
                        >
                            {loading ? "Salvando..." : "Salvar e Continuar"}
                            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            className="w-full text-slate-500 hover:text-slate-700"
                            onClick={handleSkip}
                            disabled={loading}
                        >
                            Pular por enquanto
                            <SkipForward className="w-4 h-4 ml-2" />
                        </Button>
                        <p className="text-xs text-center text-slate-400 mt-2">
                            Você poderá alterar esses dados depois nas configurações.
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
