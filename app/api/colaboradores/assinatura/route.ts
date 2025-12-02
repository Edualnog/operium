
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const colaboradorId = requestUrl.searchParams.get("colaboradorId")

    if (!colaboradorId) {
        return NextResponse.json({ error: "ID do colaborador é obrigatório" }, { status: 400 })
    }

    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    try {
        // Buscar o termo mais recente deste colaborador que tenha uma assinatura
        const { data, error } = await supabase
            .from("termos_responsabilidade")
            .select("assinatura_base64")
            .eq("profile_id", user.id)
            .eq("colaborador_id", colaboradorId)
            .not("assinatura_base64", "is", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

        if (error && error.code !== "PGRST116") { // PGRST116 é "no rows returned", que é ok
            throw error
        }

        return NextResponse.json({ signature: data?.assinatura_base64 || null })
    } catch (error: any) {
        console.error("Erro ao buscar assinatura:", error)
        return NextResponse.json({ error: "Erro ao buscar assinatura" }, { status: 500 })
    }
}
