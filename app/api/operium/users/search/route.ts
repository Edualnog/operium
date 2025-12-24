import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Força a rota a ser dinâmica (não pré-renderizada)
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        const cookieStore = cookies()

        // Cliente autenticado para verificar permissões
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

        // Verificar se usuário está autenticado
        const { data: { user: currentUser } } = await supabaseAuth.auth.getUser()
        if (!currentUser) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            )
        }

        // Verificar se é admin da organização
        const { data: adminProfile } = await supabaseAuth
            .from('operium_profiles')
            .select('role, org_id')
            .eq('user_id', currentUser.id)
            .eq('active', true)
            .single()

        if (!adminProfile || adminProfile.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Apenas administradores podem buscar usuários' },
                { status: 403 }
            )
        }

        const { email } = await request.json()

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            )
        }

        // Criar admin client dentro da função para evitar erro no build
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Buscar usuário por email usando admin client
        const { data, error } = await supabaseAdmin.auth.admin.listUsers()

        if (error) {
            console.error('Error listing users:', error)
            return NextResponse.json(
                { error: 'Failed to search users' },
                { status: 500 }
            )
        }

        // Encontrar usuário pelo email
        const usersList = data?.users || []
        const user = usersList.find((u: { email?: string; id?: string }) =>
            u.email?.toLowerCase() === email.toLowerCase()
        )

        if (user) {
            // Verificar se já tem perfil OPERIUM na mesma organização do admin
            const { data: existingProfile } = await supabaseAdmin
                .from('operium_profiles')
                .select('user_id, role, org_id')
                .eq('user_id', user.id)
                .eq('active', true)
                .single()

            // Só retornar informações se o usuário pertence à mesma org ou não tem perfil
            const belongsToSameOrg = existingProfile?.org_id === adminProfile.org_id
            const hasNoProfile = !existingProfile

            return NextResponse.json({
                found: true,
                userId: user.id,
                email: user.email,
                hasOperiumProfile: !!existingProfile,
                existingRole: belongsToSameOrg ? existingProfile?.role : null,
                belongsToSameOrg,
                canBeAdded: hasNoProfile, // Só pode adicionar se não tem perfil em nenhuma org
            })
        }

        return NextResponse.json({
            found: false,
            userId: null,
            canBeAdded: true, // Novo usuário pode ser convidado
        })

    } catch (error) {
        console.error('Search error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
