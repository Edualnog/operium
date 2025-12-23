import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Força a rota a ser dinâmica
export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
    try {
        const { user_id } = await request.json()

        if (!user_id) {
            return NextResponse.json(
                { error: 'user_id is required' },
                { status: 400 }
            )
        }

        // Criar admin client dentro da função
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Deletar o usuário do auth.users
        // Isso vai cascatear para operium_profiles e profiles (ON DELETE CASCADE)
        // E setar NULL em operium_events.actor_user_id (ON DELETE SET NULL)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id)

        if (error) {
            console.error('Error deleting user:', error)
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'User deleted successfully',
        })

    } catch (error: any) {
        console.error('Delete user error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
