import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * API: Criar usuário com senha definida pelo admin
 * =================================================
 * 
 * Usa supabase.auth.admin.createUser() para criar um usuário
 * completo com email e senha já definidos.
 * 
 * O colaborador só precisa fazer login com as credenciais.
 * Não envia email de convite/verificação.
 */
export async function POST(request: Request) {
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
            return NextResponse.json({ error: 'Apenas administradores podem criar usuários' }, { status: 403 })
        }

        // Parsear body
        const body = await request.json()
        const { email, password, name, role, org_id } = body

        if (!email || !password || !name) {
            return NextResponse.json({ error: 'Email, senha e nome são obrigatórios' }, { status: 400 })
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
        }

        // Verificar se org_id corresponde ao admin
        if (org_id !== adminProfile.org_id) {
            return NextResponse.json({ error: 'Organização inválida' }, { status: 403 })
        }

        // Cliente Admin do Supabase (usa SERVICE_ROLE_KEY)
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

        // Verificar se o email já está registrado em outra organização
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find(
            (u: { id: string; email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
        )

        if (existingUser) {
            // Verificar se já tem um operium_profile ativo
            const { data: existingProfile } = await supabaseAdmin
                .from('operium_profiles')
                .select('org_id, role')
                .eq('user_id', existingUser.id)
                .eq('active', true)
                .single()

            if (existingProfile) {
                // Se pertence à mesma organização
                if (existingProfile.org_id === org_id) {
                    return NextResponse.json(
                        { error: 'Este email já está cadastrado na sua organização.' },
                        { status: 409 }
                    )
                }

                // Pertence a outra organização
                return NextResponse.json(
                    { error: 'Este email já possui uma conta ativa em outra organização. Não é possível adicioná-lo como membro.' },
                    { status: 409 }
                )
            }

            // Usuário existe mas não tem operium_profile ativo
            // Conta abandonada - podemos reativar criando um novo profile
            const { error: reactivateError } = await supabaseAdmin
                .from('operium_profiles')
                .insert({
                    user_id: existingUser.id,
                    org_id: org_id,
                    role: role || 'FIELD',
                    name,
                    active: true,
                    onboarding_complete: false,
                })

            if (reactivateError) {
                console.error('[CREATE_USER] Reactivate error:', reactivateError)
                return NextResponse.json(
                    { error: 'Erro ao reativar conta existente' },
                    { status: 500 }
                )
            }

            // Atualizar senha do usuário existente
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                existingUser.id,
                { password }
            )

            if (updateError) {
                console.error('[CREATE_USER] Update password error:', updateError)
            }

            console.log('[CREATE_USER] Reactivated user:', { userId: existingUser.id, email, role })

            return NextResponse.json({
                success: true,
                userId: existingUser.id,
                message: 'Conta reativada com sucesso',
                reactivated: true
            })
        }

        // Criar usuário com senha definida
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Email já confirmado, não precisa verificar
            user_metadata: {
                name,
                role: role || 'FIELD',
            }
        })

        if (createError) {
            console.error('[CREATE_USER] Error:', createError)

            // Tratar erros específicos
            if (createError.message.includes('already registered')) {
                return NextResponse.json({ error: 'Este email já está cadastrado' }, { status: 400 })
            }

            throw createError
        }

        if (!newUser.user) {
            throw new Error('Usuário não foi criado')
        }

        // Criar profile básico
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: newUser.user.id,
                name,
                company_email: email,
                password_set: true, // Senha já definida!
            }, { onConflict: 'id' })

        if (profileError) {
            console.error('[CREATE_USER] Profile error:', profileError)
            // Não falhar por isso, o profile pode ser criado depois
        }

        // Criar operium_profile
        const { error: operiumError } = await supabaseAdmin
            .from('operium_profiles')
            .insert({
                user_id: newUser.user.id,
                org_id: org_id,
                role: role || 'FIELD',
                name,
                active: true,
                onboarding_complete: false, // Vai fazer onboarding no primeiro login
            })

        if (operiumError) {
            console.error('[CREATE_USER] Operium profile error:', operiumError)
            // Tentar deletar usuário criado se falhar aqui
            await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
            throw new Error('Erro ao criar perfil do colaborador')
        }

        console.log('[CREATE_USER] Success:', { userId: newUser.user.id, email, role })

        return NextResponse.json({
            success: true,
            userId: newUser.user.id,
            message: 'Usuário criado com sucesso'
        })

    } catch (err: any) {
        console.error('[CREATE_USER] Exception:', err)
        return NextResponse.json(
            { error: err.message || 'Erro ao criar usuário' },
            { status: 500 }
        )
    }
}
