import { NextResponse } from "next/server"
import { createServerComponentClient } from "@/lib/supabase-server"

const VALID_INDUSTRY_SEGMENTS = [
    "MANUFACTURING",
    "CONSTRUCTION",
    "LOGISTICS",
    "MAINTENANCE_SERVICES",
    "AGRO",
    "OTHER",
] as const

export async function POST(request: Request) {
    try {
        const supabase = await createServerComponentClient()

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: "Não autorizado. Faça login novamente." },
                { status: 401 }
            )
        }

        // Parse request body
        const body = await request.json()
        const { company_name, industry_segment } = body

        // Validate company_name
        if (!company_name || typeof company_name !== "string") {
            return NextResponse.json(
                { error: "Nome do negócio é obrigatório." },
                { status: 400 }
            )
        }

        const trimmedCompanyName = company_name.trim()
        if (trimmedCompanyName.length < 2) {
            return NextResponse.json(
                { error: "Nome do negócio deve ter no mínimo 2 caracteres." },
                { status: 400 }
            )
        }

        // Validate industry_segment
        if (!industry_segment || typeof industry_segment !== "string") {
            return NextResponse.json(
                { error: "Setor de atuação é obrigatório." },
                { status: 400 }
            )
        }

        if (!VALID_INDUSTRY_SEGMENTS.includes(industry_segment as any)) {
            return NextResponse.json(
                { error: "Setor de atuação inválido." },
                { status: 400 }
            )
        }

        // Update profile
        const { error: updateError } = await supabase
            .from("profiles")
            .update({
                company_name: trimmedCompanyName,
                industry_segment: industry_segment,
            })
            .eq("id", user.id)

        if (updateError) {
            console.error("Error updating profile:", updateError)
            return NextResponse.json(
                { error: "Erro ao salvar dados. Tente novamente." },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Onboarding API error:", error)
        return NextResponse.json(
            { error: "Erro interno. Tente novamente." },
            { status: 500 }
        )
    }
}
