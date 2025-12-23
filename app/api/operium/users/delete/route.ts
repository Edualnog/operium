import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * API: Deletar usuário do sistema
 * ================================
 * 
 * Usa supabase.auth.admin.deleteUser() para remover o usuário
 * completamente do auth.users.
 * 
 * Pré-requisitos:
 * - FKs ajustadas na migration 076_allow_user_deletion.sql
 * - profiles e operium_profiles: ON DELETE CASCADE
 * - Históricos: ON DELETE SET NULL
 */
export async function DELETE(request: NextRequest) {
    try {
        const cookieStore = cookies()

        // Cliente autenticado para verificar se é admin
        const supabaseAuth = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        cookieStore.set({ name, value, ...options })
                    },
                    remove(name: string, options: CookieOptions) {
                        cookieStore.delete({ name, ...options })
                    },
                },
            }
        )

        // Verificar se usuário está logado
        const { data: { user: adminUser } } = await supabaseAuth.auth.getUser()
        if (!adminUser) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Verificar se é admin
        const { data: adminProfile } = await supabaseAuth
            .from('operium_profiles')
            .select('role, org_id')
            .eq('user_id', adminUser.id)
            .eq('active', true)
            .single()

        if (!adminProfile || adminProfile.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Apenas administradores podem deletar usuários' }, { status: 403 })
        }

        // Parsear body
        const body = await request.json()
        const userId = body.user_id || body.userId

        if (!userId) {
            return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 })
        }

        // Não pode deletar a si mesmo
        if (userId === adminUser.id) {
            return NextResponse.json({ error: 'Você não pode deletar sua própria conta' }, { status: 400 })
        }

        // Cliente Admin do Supabase
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Verificar se usuário pertence à mesma org
        const { data: targetProfile } = await supabaseAdmin
            .from('operium_profiles')
            .select('org_id, name')
            .eq('user_id', userId)
            .single()

        if (targetProfile && targetProfile.org_id !== adminProfile.org_id) {
            return NextResponse.json({ error: 'Usuário não pertence à sua organização' }, { status: 403 })
        }

        // Deletar usuário do auth.users
        // FKs com CASCADE vão deletar profiles e operium_profiles automaticamente
        // FKs com SET NULL vão manter históricos com actor_user_id = null
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (deleteError) {
            console.error('[DELETE_USER] Error:', deleteError)
            throw deleteError
        }

        console.log('[DELETE_USER] Success:', { userId, name: targetProfile?.name })

        return NextResponse.json({
            success: true,
            message: 'Usuário deletado com sucesso'
        })

    } catch (err: any) {
        console.error('[DELETE_USER] Exception:', err)
        return NextResponse.json(
            { error: err.message || 'Erro ao deletar usuário' },
            { status: 500 }
        )
    }
}
