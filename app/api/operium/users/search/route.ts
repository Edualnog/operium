import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Força a rota a ser dinâmica (não pré-renderizada)
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
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
            // Verificar se já tem perfil OPERIUM
            const { data: existingProfile } = await supabaseAdmin
                .from('operium_profiles')
                .select('user_id, role')
                .eq('user_id', user.id)
                .eq('active', true)
                .single()

            return NextResponse.json({
                found: true,
                userId: user.id,
                email: user.email,
                hasOperiumProfile: !!existingProfile,
                existingRole: existingProfile?.role || null,
            })
        }

        return NextResponse.json({
            found: false,
            userId: null,
        })

    } catch (error) {
        console.error('Search error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
