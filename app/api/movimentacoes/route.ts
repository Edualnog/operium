import { NextResponse } from "next/server"
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from "next/cache"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function createApiClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Cookie já foi definido
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Cookie não existe
          }
        },
      },
    }
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tipo, ferramenta_id, quantidade, colaborador_id, observacoes, data } = body || {}

    if (!ferramenta_id || !quantidade || !tipo) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    if ((tipo === "retirada" || tipo === "devolucao") && !colaborador_id) {
      return NextResponse.json({ error: "Colaborador é obrigatório" }, { status: 400 })
    }

    // Verificar autenticação
    const supabase = await createApiClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("❌ Erro de autenticação na API:", authError)
      return NextResponse.json(
        { error: "Não autenticado. Por favor, faça login novamente." },
        { status: 401 }
      )
    }

    // Processar movimentação diretamente na API route
    if (tipo === "entrada") {
      // Buscar ferramenta
      const { data: ferramenta, error: ferError } = await supabase
        .from("ferramentas")
        .select("id, quantidade_total, quantidade_disponivel, estado")
        .eq("id", ferramenta_id)
        .eq("profile_id", user.id)
        .single()

      if (ferError || !ferramenta) {
        return NextResponse.json({ error: "Ferramenta não encontrada" }, { status: 404 })
      }

      // Atualizar quantidade
      const { error: updateError } = await supabase
        .from("ferramentas")
        .update({
          quantidade_disponivel: ferramenta.quantidade_disponivel + Number(quantidade),
          quantidade_total: ferramenta.quantidade_total + Number(quantidade),
        })
        .eq("id", ferramenta_id)

      if (updateError) {
        console.error("❌ Erro ao atualizar ferramenta:", updateError)
        return NextResponse.json({ error: "Erro ao atualizar ferramenta" }, { status: 500 })
      }

      // Registrar movimentação
      const { error: movError } = await supabase
        .from("movimentacoes")
        .insert({
          profile_id: user.id,
          ferramenta_id,
          tipo: "entrada",
          quantidade: Number(quantidade),
          observacoes,
          data: data ? new Date(data).toISOString() : undefined,
        })

      if (movError) {
        console.error("❌ Erro ao registrar movimentação:", movError)
        return NextResponse.json({ error: "Erro ao registrar movimentação" }, { status: 500 })
      }

    } else if (tipo === "retirada") {
      // Buscar ferramenta
      const { data: ferramenta, error: ferError } = await supabase
        .from("ferramentas")
        .select("id, quantidade_total, quantidade_disponivel, estado")
        .eq("id", ferramenta_id)
        .eq("profile_id", user.id)
        .single()

      if (ferError || !ferramenta) {
        return NextResponse.json({ error: "Ferramenta não encontrada" }, { status: 404 })
      }

      if (ferramenta.quantidade_disponivel < Number(quantidade)) {
        return NextResponse.json(
          { error: "Quantidade insuficiente disponível" },
          { status: 400 }
        )
      }

      // Atualizar quantidade
      const { error: updateError } = await supabase
        .from("ferramentas")
        .update({
          quantidade_disponivel: ferramenta.quantidade_disponivel - Number(quantidade),
        })
        .eq("id", ferramenta_id)

      if (updateError) {
        console.error("❌ Erro ao atualizar ferramenta:", updateError)
        return NextResponse.json({ error: "Erro ao atualizar ferramenta" }, { status: 500 })
      }

      // Registrar movimentação
      const { error: movError } = await supabase
        .from("movimentacoes")
        .insert({
          profile_id: user.id,
          ferramenta_id,
          colaborador_id,
          tipo: "retirada",
          quantidade: Number(quantidade),
          observacoes,
          data: data ? new Date(data).toISOString() : undefined,
        })

      if (movError) {
        console.error("❌ Erro ao registrar movimentação:", movError)
        return NextResponse.json({ error: "Erro ao registrar movimentação" }, { status: 500 })
      }

    } else if (tipo === "devolucao") {
      // Buscar ferramenta
      const { data: ferramenta, error: ferError } = await supabase
        .from("ferramentas")
        .select("id, quantidade_total, quantidade_disponivel, estado")
        .eq("id", ferramenta_id)
        .eq("profile_id", user.id)
        .single()

      if (ferError || !ferramenta) {
        return NextResponse.json({ error: "Ferramenta não encontrada" }, { status: 404 })
      }

      // Atualizar quantidade
      const { error: updateError } = await supabase
        .from("ferramentas")
        .update({
          quantidade_disponivel: ferramenta.quantidade_disponivel + Number(quantidade),
        })
        .eq("id", ferramenta_id)

      if (updateError) {
        console.error("❌ Erro ao atualizar ferramenta:", updateError)
        return NextResponse.json({ error: "Erro ao atualizar ferramenta" }, { status: 500 })
      }

      // Registrar movimentação
      const { error: movError } = await supabase
        .from("movimentacoes")
        .insert({
          profile_id: user.id,
          ferramenta_id,
          colaborador_id,
          tipo: "devolucao",
          quantidade: Number(quantidade),
          observacoes,
          data: data ? new Date(data).toISOString() : undefined,
        })

      if (movError) {
        console.error("❌ Erro ao registrar movimentação:", movError)
        return NextResponse.json({ error: "Erro ao registrar movimentação" }, { status: 500 })
      }

    } else {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 })
    }

    // Revalidar a página de movimentações explicitamente
    revalidatePath("/dashboard/movimentacoes")

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("Erro ao registrar movimentação:", error)
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 })
  }
}
