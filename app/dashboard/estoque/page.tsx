import { createServerComponentClient, getSupabaseUser } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import FerramentasList from "@/components/ferramentas/FerramentasList"
import { ListSkeleton } from "@/components/loading/PageSkeleton"
import { PageHeader } from "@/components/layout/PageHeader"

// Página precisa ser dinâmica pois depende de cookies/sessão
export const dynamic = "force-dynamic"

async function getFerramentas(userId: string) {
  try {
    const supabase = await createServerComponentClient()

    // Buscar ferramentas e atribuições de equipe em paralelo
    const [ferramentasRes, teamEquipmentRes] = await Promise.all([
      // Primeiro, tentar buscar com todos os campos (se a migration foi executada)
      supabase
        .from("ferramentas")
        .select("id, nome, categoria, quantidade_total, quantidade_disponivel, estado, created_at, tipo_item, codigo, foto_url, tamanho, cor, ponto_ressuprimento")
        .eq("profile_id", userId)
        .order("nome", { ascending: true }),
      // Buscar ferramentas atribuídas a equipes
      supabase
        .from("team_equipment")
        .select("ferramenta_id, quantity, status, ferramentas(tipo_item)")
        .in("status", ["pending_acceptance", "accepted", "in_use"])
    ])

    const { data, error } = ferramentasRes

    if (error) {
      // Se erro for sobre coluna não encontrada, tentar buscar apenas campos básicos
      if (error.message?.includes("column") ||
        error.message?.includes("schema cache") ||
        error.message?.includes("codigo") ||
        error.message?.includes("foto_url") ||
        error.message?.includes("tipo_item")) {
        console.log("Algumas colunas não existem, buscando apenas campos básicos...")

        const { data: basicData, error: basicError } = await supabase
          .from("ferramentas")
          .select("id, nome, categoria, quantidade_total, quantidade_disponivel, estado, created_at")
          .eq("profile_id", userId)
          .order("nome", { ascending: true })

        if (basicError) {
          console.error("Erro ao buscar ferramentas (básico):", basicError)
          return []
        }

        // Mapear dados básicos para o formato esperado
        return (basicData || []).map(item => ({
          ...item,
          tipo_item: "ferramenta" as const,
          codigo: null,
          foto_url: null,
          tamanho: null,
          cor: null,
          ponto_ressuprimento: null,
        }))
      }

      console.error("Erro ao buscar ferramentas:", error)
      return []
    }

    // Calcular quantidade em equipes por ferramenta
    const qtdEmEquipes: Record<string, number> = {}
    const teamEquipment = teamEquipmentRes.data || []

    teamEquipment.forEach((te: any) => {
      const ferramenta = te.ferramentas as any
      // Apenas ferramentas (não EPIs/consumíveis)
      if (ferramenta?.tipo_item === "ferramenta") {
        qtdEmEquipes[te.ferramenta_id] = (qtdEmEquipes[te.ferramenta_id] || 0) + (te.quantity || 0)
      }
    })

    // Se chegou aqui, os dados foram retornados (pode ter campos opcionais ou não)
    // Garantir que todos os campos esperados existam e ajustar quantidade_disponivel
    const mappedData = (data || []).map(item => {
      const qtdComEquipes = qtdEmEquipes[item.id] || 0
      const qtdDisponivelReal = Math.max(0, (item.quantidade_disponivel || 0) - qtdComEquipes)

      return {
        ...item,
        tipo_item: (item as any).tipo_item || "ferramenta" as const,
        codigo: (item as any).codigo || null,
        foto_url: (item as any).foto_url || null,
        tamanho: (item as any).tamanho || null,
        cor: (item as any).cor || null,
        ponto_ressuprimento: (item as any).ponto_ressuprimento || null,
        quantidade_disponivel: qtdDisponivelReal, // Atualizar com valor real
      }
    })

    // Log para diagnóstico
    console.log("Ferramentas carregadas:", mappedData.length, "itens")
    mappedData.forEach(item => {
      if (item.foto_url) {
        console.log(`✅ ${item.nome} tem foto_url:`, item.foto_url)
      } else {
        console.log(`❌ ${item.nome} não tem foto_url`)
      }
    })

    return mappedData
  } catch (error) {
    console.error("Erro ao buscar ferramentas:", error)
    return []
  }
}

async function getColaboradores(userId: string) {
  try {
    const supabase = await createServerComponentClient()
    const { data, error } = await supabase
      .from("colaboradores")
      .select("id, nome")
      .eq("profile_id", userId)
      .order("nome", { ascending: true })

    if (error) {
      console.error("Erro ao buscar colaboradores:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Erro ao buscar colaboradores:", error)
    return []
  }
}

export default async function EstoquePage() {
  try {
    const { user } = await getSupabaseUser()

    if (!user) {
      redirect("/login")
    }

    // Carregar dados em paralelo
    const [ferramentas, colaboradores] = await Promise.all([
      getFerramentas(user.id),
      getColaboradores(user.id),
    ])

    return (
      <div className="space-y-6 sm:space-y-8">
        <PageHeader
          titleKey="dashboard.ferramentas.title"
          subtitleKey="dashboard.ferramentas.subtitle"
        />
        <Suspense fallback={<ListSkeleton />}>
          <FerramentasList
            ferramentas={ferramentas}
            colaboradores={colaboradores}
          />
        </Suspense>
      </div>
    )
  } catch (error) {
    console.error("Erro na página de estoque:", error)
    return (
      <div className="space-y-6 sm:space-y-8">
        <PageHeader
          titleKey="dashboard.ferramentas.title"
          subtitleKey="dashboard.ferramentas.error"
        />
      </div>
    )
  }
}
