import { NextResponse } from "next/server"
import { createServerComponentClient } from "@/lib/supabase-server"
import { createClient } from "@supabase/supabase-js"

export async function DELETE(request: Request) {
    try {
        // 1. Verificar autenticação
        const supabase = await createServerComponentClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: "Não autenticado" },
                { status: 401 }
            )
        }

        // 2. Verificar confirmação no body
        const body = await request.json().catch(() => ({}))
        if (body.confirmation !== "DELETAR MINHA CONTA") {
            return NextResponse.json(
                { error: "Confirmação inválida" },
                { status: 400 }
            )
        }

        // 3. Criar admin client (usa service role key)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceRoleKey) {
            console.error("Missing SUPABASE_SERVICE_ROLE_KEY")
            return NextResponse.json(
                { error: "Configuração do servidor incompleta" },
                { status: 500 }
            )
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        // 4. Deletar o usuário usando admin client
        // Isso vai disparar ON DELETE CASCADE para profiles
        // E ON DELETE SET NULL para dados históricos
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

        if (deleteError) {
            console.error("Erro ao deletar usuário:", deleteError)
            return NextResponse.json(
                { error: deleteError.message || "Erro ao deletar conta" },
                { status: 500 }
            )
        }

        // 5. Log para auditoria
        console.log(`[DELETE ACCOUNT] User ${user.email} (${user.id}) deleted their account`)

        return NextResponse.json({
            success: true,
            message: "Conta deletada com sucesso"
        })

    } catch (error: any) {
        console.error("Erro ao deletar conta:", error)
        return NextResponse.json(
            { error: error.message || "Erro interno" },
            { status: 500 }
        )
    }
}
