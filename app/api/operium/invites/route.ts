import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Força a rota a ser dinâmica
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        const { email, role, org_id, redirect_to } = await request.json()

        if (!email || !role || !org_id) {
            return NextResponse.json(
                { error: 'Email, role and org_id are required' },
                { status: 400 }
            )
        }

        // Criar admin client dentro da função
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Enviar convite
        const inviteRedirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/update-password`

        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
                operium_role: role,
                operium_org_id: org_id,
                // Nome opcional, podemos adicionar se vier no body
            },
            redirectTo: inviteRedirectUrl,
        })

        if (error) {
            console.error('Error inviting user:', error)
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            user_id: data.user.id,
            email: data.user.email,
        })

    } catch (error: any) {
        console.error('Invitation error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
