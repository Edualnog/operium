import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Força a rota a ser dinâmica
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
                { error: 'Apenas administradores podem enviar convites' },
                { status: 403 }
            )
        }

        const { email, role, org_id, name } = await request.json()

        if (!email || !role || !org_id) {
            return NextResponse.json(
                { error: 'Email, role and org_id are required' },
                { status: 400 }
            )
        }

        // Verificar se org_id corresponde à organização do admin
        if (org_id !== adminProfile.org_id) {
            return NextResponse.json(
                { error: 'Você só pode convidar usuários para sua própria organização' },
                { status: 403 }
            )
        }

        // Criar admin client dentro da função
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Enviar convite
        const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
        const inviteRedirectUrl = `${origin}/auth/callback`

        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
                operium_role: role,
                operium_org_id: org_id,
                full_name: name || undefined,
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

        // Fallback: Ensure profile exists with password_set = false
        // The trigger should handle this, but we do it here as a safety net
        try {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .upsert(
                    { id: data.user.id, password_set: false },
                    { onConflict: 'id', ignoreDuplicates: false }
                )

            if (profileError) {
                console.warn('Failed to set password_set=false (non-critical):', profileError)
            }
        } catch (e) {
            console.warn('Error ensuring profile password_set=false:', e)
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
