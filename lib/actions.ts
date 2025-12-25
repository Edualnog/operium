"use server"

import { createServerComponentClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { trackEvent } from "./events"

type ConsertoStatus = "aguardando" | "em_andamento" | "concluido"

// Função helper para revalidar todas as páginas relacionadas
function revalidateAllPages() {
  // Revalidar todas as páginas do dashboard
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/colaboradores")
  revalidatePath("/dashboard/estoque")
  revalidatePath("/dashboard/movimentacoes")
  revalidatePath("/dashboard/consertos")
}

// Schemas de validação
const colaboradorSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cargo: z.string().optional(),
  telefone: z.string().optional(),
  foto_url: z.string().optional(),
  data_admissao: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cpf: z.string().optional(),
  endereco: z.string().optional(),
  observacoes: z.string().optional(),
  // Operational profile fields
  role_function: z.string().min(1, "Função operacional é obrigatória"),
  seniority_bucket: z.enum([
    'LESS_THAN_6_MONTHS',
    '6_TO_24_MONTHS',
    'MORE_THAN_24_MONTHS'
  ], { errorMap: () => ({ message: "Tempo na função é obrigatório" }) }),
})

// Type for seniority bucket
type SeniorityBucket = 'LESS_THAN_6_MONTHS' | '6_TO_24_MONTHS' | 'MORE_THAN_24_MONTHS'

const ferramentaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  categoria: z.string().optional(),
  quantidade_total: z.number().min(0),
  estado: z.enum(["ok", "danificada", "em_conserto"]),
  tipo_item: z.enum(["ferramenta", "epi", "consumivel"]).default("ferramenta"),
  codigo: z.string().optional(),
  foto_url: z.string().optional(),
  tamanho: z.string().optional(),
  cor: z.string().optional(),
})

function gerarCodigoProduto(nome: string, tipo: string, tamanho?: string | null, cor?: string | null) {
  const tipoMap: Record<string, string> = {
    ferramenta: "FER",
    epi: "EPI",
    consumivel: "CON",
  }
  const siglaTipo = tipoMap[tipo] || "PRD"
  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 4)
  const tam = (tamanho || "").replace(/\s+/g, "").toUpperCase()
  const corSigla = (cor || "").replace(/\s+/g, "").toUpperCase().slice(0, 3)
  const rand = Math.floor(Math.random() * 900 + 100) // 100-999
  return [siglaTipo, iniciais || "XX", tam || undefined, corSigla || undefined, rand]
    .filter(Boolean)
    .join("-")
}

// Global Catalog Search
export async function searchCatalogItems(query: string) {
  const supabase = await createServerComponentClient()

  if (!query || query.length < 2) return []

  const { data, error } = await supabase
    .schema('hvac')
    .from('catalog_items')
    .select(`
      id,
      name,
      model_sku,
      image_url,
      specs_json,
      brand:brands(name),
      category:categories(name)
    `)
    .or(`name.ilike.%${query}%,model_sku.ilike.%${query}%`)
    .limit(10)

  if (error) {
    console.error("Error searching catalog:", error)
    return []
  }

  return data.map((item: any) => ({
    id: item.id,
    name: item.name,
    model: item.model_sku,
    brand: item.brand?.name,
    category: item.category?.name,
    image: item.image_url,
    specs: item.specs_json
  }))
}

// Colaboradores
export async function criarColaborador(formData: FormData) {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Não autenticado")

  const dataAdmissao = formData.get("data_admissao")
  const data = colaboradorSchema.parse({
    nome: formData.get("nome"),
    cargo: undefined, // Removed from form - use role_function instead
    telefone: formData.get("telefone"),
    foto_url: formData.get("foto_url") || undefined,
    data_admissao: dataAdmissao && dataAdmissao !== "" ? dataAdmissao : undefined,
    email: formData.get("email") || undefined,
    cpf: undefined, // Removed from form
    endereco: formData.get("endereco") || undefined,
    observacoes: formData.get("observacoes") || undefined,
    role_function: formData.get("role_function"),
    seniority_bucket: formData.get("seniority_bucket"),
  })

  // Extract operational profile fields
  const { role_function, seniority_bucket, ...colaboradorData } = data

  // Insert collaborator
  const { data: newColaborador, error } = await supabase
    .from("colaboradores")
    .insert({
      profile_id: user.id,
      ...colaboradorData,
    })
    .select('id')
    .single()

  if (error) throw error

  // Insert operational profile
  const { error: profileError } = await supabase
    .from("collaborator_operational_profile")
    .insert({
      collaborator_id: newColaborador.id,
      role_function,
      seniority_bucket,
    })

  if (profileError) {
    console.error("Error creating operational profile:", profileError)
    // Don't throw - the collaborator was created, profile is secondary
  }

  revalidateAllPages()
}

export async function atualizarColaborador(id: string, formData: FormData) {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Não autenticado")

  const dataAdmissao = formData.get("data_admissao")
  const data = colaboradorSchema.parse({
    nome: formData.get("nome"),
    cargo: undefined, // Removed from form - use role_function instead
    telefone: formData.get("telefone"),
    foto_url: formData.get("foto_url") || undefined,
    data_admissao: dataAdmissao && dataAdmissao !== "" ? dataAdmissao : undefined,
    email: formData.get("email") || undefined,
    cpf: undefined, // Removed from form
    endereco: formData.get("endereco") || undefined,
    observacoes: formData.get("observacoes") || undefined,
    role_function: formData.get("role_function"),
    seniority_bucket: formData.get("seniority_bucket"),
  })

  // Extract operational profile fields
  const { role_function, seniority_bucket, ...colaboradorData } = data

  // Update collaborator
  const { error } = await supabase
    .from("colaboradores")
    .update(colaboradorData)
    .eq("id", id)
    .eq("profile_id", user.id)

  if (error) throw error

  // Upsert operational profile
  const { error: profileError } = await supabase
    .from("collaborator_operational_profile")
    .upsert({
      collaborator_id: id,
      role_function,
      seniority_bucket,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'collaborator_id'
    })

  if (profileError) {
    console.error("Error updating operational profile:", profileError)
    // Don't throw - the collaborator was updated, profile is secondary
  }

  revalidateAllPages()
}

export async function deletarColaborador(id: string) {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Não autenticado")

  const { error } = await supabase
    .from("colaboradores")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id)

  if (error) throw error
  revalidateAllPages()
}

export async function promoverColaborador(id: string, newRole: string, notes?: string) {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Não autenticado")

  // Verify ownership
  const { data: colaborador } = await supabase
    .from("colaboradores")
    .select("id")
    .eq("id", id)
    .eq("profile_id", user.id)
    .single()

  if (!colaborador) throw new Error("Colaborador não encontrado")

  // Insert role history entry
  const { error: historyError } = await supabase
    .from("collaborator_role_history")
    .insert({
      collaborator_id: id,
      role_function: newRole,
      promoted_by: user.id,
      notes: notes || null,
    })

  if (historyError) throw historyError

  // Update current role_function in operational profile
  const { error: profileError } = await supabase
    .from("collaborator_operational_profile")
    .update({
      role_function: newRole,
      updated_at: new Date().toISOString(),
    })
    .eq("collaborator_id", id)

  if (profileError) throw profileError

  revalidateAllPages()
}

export interface DemissaoResult {
  success: boolean
  ferramentasPendentes: Array<{
    id: string
    nome: string
    quantidade: number
  }>
  equipesAfetadas: string[]
  liderancasRemovidas: string[]
}

export async function demitirColaborador(id: string, motivo: string): Promise<DemissaoResult> {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Não autenticado")

  const result: DemissaoResult = {
    success: false,
    ferramentasPendentes: [],
    equipesAfetadas: [],
    liderancasRemovidas: []
  }

  // 1. Buscar ferramentas pendentes (retiradas sem devolução)
  const { data: movimentacoesPendentes } = await supabase
    .from("movimentacoes")
    .select(`
      id,
      quantidade,
      ferramenta:ferramentas!inner(id, nome)
    `)
    .eq("colaborador_id", id)
    .eq("tipo", "retirada")
    .is("devolucao_at", null)
    .eq("profile_id", user.id)

  if (movimentacoesPendentes && movimentacoesPendentes.length > 0) {
    // Agregar por ferramenta (pode ter múltiplas retiradas da mesma)
    const ferramentasMap = new Map<string, { id: string; nome: string; quantidade: number }>()

    for (const mov of movimentacoesPendentes) {
      const ferramenta = mov.ferramenta as unknown as { id: string; nome: string }
      if (ferramenta) {
        const existing = ferramentasMap.get(ferramenta.id)
        if (existing) {
          existing.quantidade += mov.quantidade
        } else {
          ferramentasMap.set(ferramenta.id, {
            id: ferramenta.id,
            nome: ferramenta.nome,
            quantidade: mov.quantidade
          })
        }
      }
    }

    result.ferramentasPendentes = Array.from(ferramentasMap.values())
  }

  // 2. Marcar team_members.left_at para todas as equipes
  const { data: teamMemberships } = await supabase
    .from("team_members")
    .select("id, team_id, team:teams!inner(name)")
    .eq("colaborador_id", id)
    .is("left_at", null)

  if (teamMemberships && teamMemberships.length > 0) {
    const teamIds = teamMemberships.map(tm => tm.id)

    await supabase
      .from("team_members")
      .update({ left_at: new Date().toISOString() })
      .in("id", teamIds)

    result.equipesAfetadas = teamMemberships.map(tm => {
      const team = tm.team as unknown as { name: string }
      return team?.name || tm.team_id
    })
  }

  // 3. Remover de liderança de equipes (teams.leader_id)
  const { data: teamsAsLeader } = await supabase
    .from("teams")
    .select("id, name")
    .eq("leader_id", id)
    .eq("profile_id", user.id)

  if (teamsAsLeader && teamsAsLeader.length > 0) {
    const teamIds = teamsAsLeader.map(t => t.id)

    await supabase
      .from("teams")
      .update({ leader_id: null })
      .in("id", teamIds)

    result.liderancasRemovidas = teamsAsLeader.map(t => t.name)
  }

  // 4. Marcar team_equipment como devolvido (se existir)
  // Buscar equipamentos atribuídos via equipes do colaborador
  if (teamMemberships && teamMemberships.length > 0) {
    const teamIds = teamMemberships.map(tm => tm.team_id)

    // Marcar como devolvido com nota de demissão
    // Nota: O trigger cuidará do estoque
    await supabase
      .from("team_equipment")
      .update({
        returned_at: new Date().toISOString(),
        status: 'returned',
        notes: `Devolução automática - Colaborador demitido: ${motivo}`
      })
      .in("team_id", teamIds)
      .is("returned_at", null)
  }

  // 5. Finalmente, marcar colaborador como demitido
  const { error } = await supabase
    .from("colaboradores")
    .update({
      status: 'DEMITIDO',
      demitido_at: new Date().toISOString(),
      demitido_motivo: motivo,
    })
    .eq("id", id)
    .eq("profile_id", user.id)

  if (error) throw error

  result.success = true
  revalidateAllPages()

  return result
}

// Ferramentas
export async function criarFerramenta(formData: FormData) {
  try {
    const supabase = await createServerComponentClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error("Não autenticado")

    // Helper para converter string vazia em undefined
    const getValue = (key: string) => {
      const value = formData.get(key)
      return value && value.toString().trim() !== "" ? value.toString() : undefined
    }

    const estadoValue = formData.get("estado") as string
    const tipoItemValue = (formData.get("tipo_item") as string) || "ferramenta"

    if (!estadoValue || !["ok", "danificada", "em_conserto"].includes(estadoValue)) {
      throw new Error("Estado inválido. Deve ser: ok, danificada ou em_conserto")
    }

    if (!["ferramenta", "epi", "consumivel"].includes(tipoItemValue)) {
      throw new Error("Tipo de item inválido. Deve ser: ferramenta, epi ou consumivel")
    }

    const quantidadeTotal = Number(formData.get("quantidade_total"))
    if (isNaN(quantidadeTotal) || quantidadeTotal < 0) {
      throw new Error("Quantidade total deve ser um número maior ou igual a zero")
    }

    const data = ferramentaSchema.parse({
      nome: formData.get("nome"),
      categoria: getValue("categoria"),
      quantidade_total: quantidadeTotal,
      estado: estadoValue as "ok" | "danificada" | "em_conserto",
      tipo_item: tipoItemValue as "ferramenta" | "epi" | "consumivel",
      codigo: getValue("codigo"),
      foto_url: getValue("foto_url"),
      tamanho: getValue("tamanho"),
      cor: getValue("cor"),
    })

    const codigoFinal =
      data.codigo && data.codigo.trim().length > 0
        ? data.codigo
        : gerarCodigoProduto(data.nome, data.tipo_item, data.tamanho, data.cor)

    const catalogItemId = getValue("catalog_item_id")

    // Preparar dados para inserção - começar com campos básicos obrigatórios
    const insertData: any = {
      profile_id: user.id,
      nome: data.nome,
      categoria: data.categoria || null,
      quantidade_total: data.quantidade_total,
      quantidade_disponivel: data.estado === "ok" ? data.quantidade_total : 0,
      estado: data.estado,
      catalog_item_id: catalogItemId,
    }

    // Tentar adicionar campos opcionais (podem não existir se migration não foi executada)
    try {
      // Verificar se tipo_item existe tentando adicionar
      if (data.tipo_item) {
        insertData.tipo_item = data.tipo_item
      }
      if (codigoFinal) {
        insertData.codigo = codigoFinal
      }
      if (data.foto_url) {
        insertData.foto_url = data.foto_url
      }
      if (data.tamanho) {
        insertData.tamanho = data.tamanho
      }
      if (data.cor) {
        insertData.cor = data.cor
      }
      // Adicionar ponto_ressuprimento se fornecido
      const pontoRessuprimento = formData.get("ponto_ressuprimento")
      if (pontoRessuprimento && pontoRessuprimento.toString().trim() !== "") {
        const pontoValue = Number(pontoRessuprimento)
        if (!isNaN(pontoValue) && pontoValue >= 0) {
          insertData.ponto_ressuprimento = pontoValue
        }
      }
    } catch (e) {
      // Ignorar erros ao adicionar campos opcionais
      console.warn("Alguns campos opcionais podem não existir na tabela")
    }

    console.log("Inserindo fer ramenta com dados:", {
      nome: insertData.nome,
      quantidade_total: insertData.quantidade_total,
      estado: insertData.estado,
      profile_id: user.id.substring(0, 8) + "...",
    })

    // Tentar inserir
    let insertedData = null
    let insertError = null

    // Primeira tentativa: com todos os campos
    const { data: result1, error: error1 } = await supabase
      .from("ferramentas")
      .insert(insertData)
      .select()

    if (error1) {
      // Check if error is about event_ingestion_errors table not existing
      if (error1.message?.includes("event_ingestion_errors")) {
        console.warn("⚠️ Tabela event_ingestion_errors não existe. Execute fix_missing_event_errors_table.sql no Supabase.")
        console.warn("⚠️ Tentando inserir produto sem registrar eventos...")

        // Retry without triggering event system - this may not work if triggers are active
        // But at least we log the real error
        insertError = new Error(
          "A tabela 'event_ingestion_errors' não existe no banco de dados. " +
          "Execute o arquivo 'supabase/fix_missing_event_errors_table.sql' no Supabase SQL Editor para corrigir."
        )
      } else {
        console.warn("Erro na primeira tentativa:", error1.message)

        // Se erro for sobre coluna não encontrada, tentar sem campos opcionais
        if (error1.message?.includes("codigo") ||
          error1.message?.includes("column") ||
          error1.message?.includes("schema cache") ||
          error1.message?.includes("tipo_item") ||
          error1.message?.includes("foto_url") ||
          error1.message?.includes("tamanho") ||
          error1.message?.includes("cor") ||
          error1.message?.includes("catalog_item_id") ||
          error1.message?.includes("foreign key")) {

          console.log("Tentando inserir apenas com campos básicos (sem catalog_id ou opcionais)...")

          // Versão básica sem campos opcionais
          const basicData: any = {
            profile_id: user.id,
            nome: data.nome,
            categoria: data.categoria || null,
            quantidade_total: data.quantidade_total,
            quantidade_disponivel: data.estado === "ok" ? data.quantidade_total : 0,
            estado: data.estado,
          }

          const { data: result2, error: error2 } = await supabase
            .from("ferramentas")
            .insert(basicData)
            .select()

          if (error2) {
            console.error("Erro ao inserir (versão básica):", error2)
            insertError = error2
          } else {
            insertedData = result2
          }
        } else {
          insertError = error1
        }
      }
    } else {
      insertedData = result1
    }

    // Verificar se houve erro
    if (insertError) {
      console.error("Erro final ao inserir:", insertError)
      throw new Error(
        `Erro ao salvar produto: ${insertError.message}. ` +
        "Verifique se as políticas RLS estão configuradas corretamente ou execute a migration 010_ferramentas_produto_extra.sql."
      )
    }

    // Verificar se os dados foram realmente inseridos
    if (!insertedData || insertedData.length === 0) {
      console.error("Nenhum dado retornado após inserção")
      throw new Error(
        "Produto não foi inserido no banco de dados. " +
        "Verifique as políticas RLS (Row Level Security) no Supabase. " +
        "A política 'Users can insert own ferramentas' deve estar ativa."
      )
    }

    console.log("✅ Ferramenta inserida com sucesso! ID:", insertedData[0].id)

    // Revalidar todas as páginas relacionadas
    revalidateAllPages()
  } catch (error: any) {
    // Log detalhado do erro
    console.error("❌ ERRO COMPLETO em criarFerramenta:", {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack?.substring(0, 500)
    })

    if (error instanceof z.ZodError) {
      const validationErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(", ")
      console.error("❌ Validation errors:", validationErrors)
      throw new Error(`Erro de validação: ${validationErrors}`)
    }

    // Retornar mensagem detalhada do erro
    const errorMessage = error?.message || error?.toString() || "Erro desconhecido"
    throw new Error(`Falha ao criar produto: ${errorMessage}`)
  }
}

export async function atualizarFerramenta(id: string, formData: FormData) {
  try {
    const supabase = await createServerComponentClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error("Não autenticado")

    // Helper para converter string vazia em undefined
    const getValue = (key: string) => {
      const value = formData.get(key)
      return value && value.toString().trim() !== "" ? value.toString() : undefined
    }

    const estadoValue = formData.get("estado") as string
    const tipoItemValue = (formData.get("tipo_item") as string) || "ferramenta"

    if (!estadoValue || !["ok", "danificada", "em_conserto"].includes(estadoValue)) {
      throw new Error("Estado inválido. Deve ser: ok, danificada ou em_conserto")
    }

    if (!["ferramenta", "epi", "consumivel"].includes(tipoItemValue)) {
      throw new Error("Tipo de item inválido. Deve ser: ferramenta, epi ou consumivel")
    }

    const quantidadeTotal = Number(formData.get("quantidade_total"))
    if (isNaN(quantidadeTotal) || quantidadeTotal < 0) {
      throw new Error("Quantidade total deve ser um número maior ou igual a zero")
    }

    const data = ferramentaSchema.parse({
      nome: formData.get("nome"),
      categoria: getValue("categoria"),
      quantidade_total: quantidadeTotal,
      estado: estadoValue as "ok" | "danificada" | "em_conserto",
      tipo_item: tipoItemValue as "ferramenta" | "epi" | "consumivel",
      codigo: getValue("codigo"),
      foto_url: getValue("foto_url"),
      tamanho: getValue("tamanho"),
      cor: getValue("cor"),
    })

    // Preparar dados para atualização - começar com campos básicos obrigatórios
    const updateData: any = {
      nome: data.nome,
      categoria: data.categoria || null,
      quantidade_total: data.quantidade_total,
      quantidade_disponivel: data.estado === "ok" ? data.quantidade_total : 0,
      estado: data.estado,
    }

    // Adicionar campos opcionais (agora que a migration foi executada, devem existir)
    if (data.tipo_item) updateData.tipo_item = data.tipo_item
    if (data.foto_url) {
      updateData.foto_url = data.foto_url
      console.log("📸 Atualizando foto_url:", data.foto_url)
    }
    if (data.tamanho) updateData.tamanho = data.tamanho
    if (data.cor) updateData.cor = data.cor

    const codigoFinal =
      data.codigo && data.codigo.trim().length > 0
        ? data.codigo
        : gerarCodigoProduto(data.nome, data.tipo_item, data.tamanho, data.cor)
    if (codigoFinal) updateData.codigo = codigoFinal

    // Adicionar ponto_ressuprimento se fornecido
    const pontoRessuprimento = formData.get("ponto_ressuprimento")
    if (pontoRessuprimento && pontoRessuprimento.toString().trim() !== "") {
      const pontoValue = Number(pontoRessuprimento)
      if (!isNaN(pontoValue) && pontoValue >= 0) {
        updateData.ponto_ressuprimento = pontoValue
      }
    } else {
      // Se vazio, definir como null para remover o valor
      updateData.ponto_ressuprimento = null
    }

    // Atualizar (agora que a migration foi executada, todos os campos devem existir)
    console.log("Atualizando ferramenta com dados:", {
      id,
      nome: updateData.nome,
      tem_foto_url: !!updateData.foto_url,
      foto_url: updateData.foto_url ? updateData.foto_url.substring(0, 50) + "..." : null,
    })

    const { error } = await supabase
      .from("ferramentas")
      .update(updateData)
      .eq("id", id)
      .eq("profile_id", user.id)

    if (error) {
      console.error("Erro ao atualizar ferramenta:", error)
      // Se erro for sobre coluna não encontrada, tentar sem campos opcionais
      if (error.message?.includes("codigo") ||
        error.message?.includes("column") ||
        error.message?.includes("schema cache") ||
        error.message?.includes("tipo_item") ||
        error.message?.includes("foto_url") ||
        error.message?.includes("tamanho") ||
        error.message?.includes("cor")) {
        console.warn("Alguns campos opcionais não encontrados, tentando atualizar apenas campos básicos...")

        // Versão básica sem campos opcionais
        const basicUpdateData: any = {
          nome: data.nome,
          categoria: data.categoria || null,
          quantidade_total: data.quantidade_total,
          quantidade_disponivel: data.estado === "ok" ? data.quantidade_total : 0,
          estado: data.estado,
        }

        const { error: basicError } = await supabase
          .from("ferramentas")
          .update(basicUpdateData)
          .eq("id", id)
          .eq("profile_id", user.id)

        if (basicError) {
          console.error("Erro ao atualizar ferramenta (versão básica):", basicError)
          throw new Error(
            `Erro ao atualizar produto: ${basicError.message || "Erro desconhecido"}. ` +
            "Execute a migration 010_ferramentas_produto_extra.sql no Supabase para usar todos os recursos."
          )
        }
      } else {
        throw new Error(`Erro ao atualizar produto: ${error.message || "Erro desconhecido"}`)
      }
    }

    console.log("✅ Ferramenta atualizada com sucesso! ID:", id)
    revalidateAllPages()
  } catch (error: any) {
    console.error("Erro em atualizarFerramenta:", error)
    if (error instanceof z.ZodError) {
      throw new Error(`Erro de validação: ${error.errors.map(e => e.message).join(", ")}`)
    }
    throw error
  }
}

export async function deletarFerramenta(id: string) {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Não autenticado")

  const { error } = await supabase
    .from("ferramentas")
    .delete()
    .eq("id", id)
    .eq("profile_id", user.id)

  if (error) throw error

  // 🚀 EVENTO SILENCIOSO (Dual Write)
  await trackEvent(supabase, 'ASSET_RETIREMENT', id, {
    retirement_type: 'SCRAPPED',
    notes: 'Deleted via UI'
  }, { actor_id: user.id })

  revalidateAllPages()
}

// Movimentações
export async function registrarEntrada(
  ferramentaId: string,
  quantidade: number,
  observacoes?: string,
  dataMovimentacao?: string
) {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Não autenticado")

  // Buscar ferramenta atual - otimizado: apenas campos necessários
  const { data: ferramenta, error: ferError } = await supabase
    .from("ferramentas")
    .select("id, quantidade_total, quantidade_disponivel, estado")
    .eq("id", ferramentaId)
    .eq("profile_id", user.id)
    .single()

  if (ferError || !ferramenta) throw new Error("Ferramenta não encontrada")

  // Atualizar ferramenta
  const novaQuantidadeTotal = ferramenta.quantidade_total + quantidade
  const novaQuantidadeDisponivel =
    ferramenta.estado === "ok"
      ? ferramenta.quantidade_disponivel + quantidade
      : ferramenta.quantidade_disponivel

  const { error: updateError } = await supabase
    .from("ferramentas")
    .update({
      quantidade_total: novaQuantidadeTotal,
      quantidade_disponivel: novaQuantidadeDisponivel,
    })
    .eq("id", ferramentaId)
    .eq("profile_id", user.id) // Validação de segurança adicional

  if (updateError) throw updateError

  // Registrar movimentação
  const movData = {
    profile_id: user.id,
    ferramenta_id: ferramentaId,
    tipo: "entrada",
    quantidade,
    observacoes,
    data: dataMovimentacao ? new Date(dataMovimentacao).toISOString() : undefined,
  }

  console.log("📝 Registrando entrada:", movData)

  const { data: movResult, error: movError } = await supabase
    .from("movimentacoes")
    .insert(movData)
    .select()

  if (movError) {
    console.error("❌ Erro ao registrar movimentação:", movError)
    throw movError
  }

  console.log("✅ Movimentação registrada:", movResult)

  revalidateAllPages()
}

export async function registrarRetirada(
  ferramentaId: string,
  colaboradorId: string,
  quantidade: number,
  observacoes?: string,
  dataMovimentacao?: string
) {
  try {
    const supabase = await createServerComponentClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("❌ Erro de autenticação:", authError)
      throw new Error(`Erro de autenticação: ${authError.message}`)
    }

    if (!user) {
      console.error("❌ Usuário não autenticado")
      throw new Error("Não autenticado. Por favor, faça login novamente.")
    }

    // Buscar ferramenta atual - otimizado: apenas campos necessários
    const { data: ferramenta, error: ferError } = await supabase
      .from("ferramentas")
      .select("id, quantidade_total, quantidade_disponivel, estado")
      .eq("id", ferramentaId)
      .eq("profile_id", user.id)
      .single()

    if (ferError || !ferramenta) throw new Error("Ferramenta não encontrada")

    if (ferramenta.quantidade_disponivel < quantidade) {
      throw new Error("Quantidade insuficiente disponível")
    }

    // Atualizar ferramenta
    const { error: updateError } = await supabase
      .from("ferramentas")
      .update({
        quantidade_disponivel: ferramenta.quantidade_disponivel - quantidade,
      })
      .eq("id", ferramentaId)
      .eq("profile_id", user.id) // Validação de segurança adicional

    if (updateError) throw updateError

    // Registrar movimentação
    const movData = {
      profile_id: user.id,
      ferramenta_id: ferramentaId,
      colaborador_id: colaboradorId,
      tipo: "retirada",
      quantidade,
      observacoes,
      data: dataMovimentacao ? new Date(dataMovimentacao).toISOString() : undefined,
    }

    console.log("📝 Registrando retirada:", movData)

    const { data: movResult, error: movError } = await supabase
      .from("movimentacoes")
      .insert(movData)
      .select()

    if (movError) {
      console.error("❌ Erro ao registrar movimentação:", movError)
      throw movError
    }

    console.log("✅ Movimentação registrada:", movResult)

    revalidateAllPages()

    // 🚀 EVENTO SILENCIOSO (Dual Write)
    await trackEvent(supabase, 'ASSET_CHECKOUT', ferramentaId, {
      recipient_id: colaboradorId,
      notes: observacoes
    }, { actor_id: user.id })
  } catch (error: any) {
    console.error("❌ Erro completo ao registrar retirada:", error)
    throw error
  }
}

export async function registrarDevolucao(
  ferramentaId: string,
  colaboradorId: string,
  quantidade: number,
  observacoes?: string,
  dataMovimentacao?: string
) {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Não autenticado")

  // Buscar ferramenta atual - otimizado: apenas campos necessários
  const { data: ferramenta, error: ferError } = await supabase
    .from("ferramentas")
    .select("id, quantidade_total, quantidade_disponivel, estado")
    .eq("id", ferramentaId)
    .eq("profile_id", user.id)
    .single()

  if (ferError || !ferramenta) throw new Error("Ferramenta não encontrada")

  // 🔄 SYNC: Verificar se existe team_equipment para este colaborador/ferramenta
  // Se existir, o trigger cuidará do estoque. Se não, atualizamos manualmente.
  let teamEquipmentHandled = false

  // Buscar equipe atual do colaborador
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("colaborador_id", colaboradorId)
    .is("left_at", null)
    .single()

  if (teamMember?.team_id) {
    // Buscar team_equipment pendente para esta ferramenta/equipe
    const { data: teamEquipment } = await supabase
      .from("team_equipment")
      .select("id, quantity")
      .eq("team_id", teamMember.team_id)
      .eq("ferramenta_id", ferramentaId)
      .is("returned_at", null)
      .order("assigned_at", { ascending: false })
      .limit(1)
      .single()

    if (teamEquipment && quantidade >= teamEquipment.quantity) {
      // Marcar team_equipment como devolvido
      // O trigger fn_team_equipment_increment_stock cuidará do estoque
      const { error: teUpdateError } = await supabase
        .from("team_equipment")
        .update({
          returned_at: new Date().toISOString(),
          status: 'returned',
          notes: observacoes ? `Devolução via QuickReturn: ${observacoes}` : 'Devolução via QuickReturn'
        })
        .eq("id", teamEquipment.id)

      if (!teUpdateError) {
        teamEquipmentHandled = true
        console.log("🔄 team_equipment sincronizado (trigger cuidará do estoque):", teamEquipment.id)
      }
    }
  }

  // Só atualiza estoque manualmente se NÃO foi tratado pelo team_equipment
  if (!teamEquipmentHandled) {
    const novaQuantidadeDisponivel = ferramenta.quantidade_disponivel + quantidade

    if (novaQuantidadeDisponivel > ferramenta.quantidade_total) {
      throw new Error("Quantidade de devolução excede o total")
    }

    const { error: updateError } = await supabase
      .from("ferramentas")
      .update({
        quantidade_disponivel: novaQuantidadeDisponivel,
      })
      .eq("id", ferramentaId)
      .eq("profile_id", user.id)

    if (updateError) throw updateError
  }

  // Registrar movimentação
  const movData = {
    profile_id: user.id,
    ferramenta_id: ferramentaId,
    colaborador_id: colaboradorId,
    tipo: "devolucao",
    quantidade,
    observacoes,
    data: dataMovimentacao ? new Date(dataMovimentacao).toISOString() : undefined,
  }

  console.log("📝 Registrando devolução:", movData)

  const { data: movResult, error: movError } = await supabase
    .from("movimentacoes")
    .insert(movData)
    .select()

  if (movError) {
    console.error("❌ Erro ao registrar movimentação:", movError)
    throw movError
  }

  console.log("✅ Movimentação registrada:", movResult)

  revalidateAllPages()

  // 🚀 EVENTO SILENCIOSO (Dual Write)
  await trackEvent(supabase, 'ASSET_CHECKIN', ferramentaId, {
    condition_grade: 5, // Default for now
    notes: observacoes
  }, { actor_id: user.id })
}

export async function registrarEnvioConserto(
  ferramentaId: string,
  quantidade: number,
  descricao?: string,
  status?: ConsertoStatus,
  local_conserto?: string,
  prazo?: string,
  prioridade?: string
) {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Não autenticado")

  // Buscar ferramenta atual - otimizado: apenas campos necessários
  const { data: ferramenta, error: ferError } = await supabase
    .from("ferramentas")
    .select("id, quantidade_total, quantidade_disponivel, estado")
    .eq("id", ferramentaId)
    .eq("profile_id", user.id)
    .single()

  if (ferError || !ferramenta) throw new Error("Ferramenta não encontrada")

  if (ferramenta.quantidade_disponivel < quantidade) {
    throw new Error("Quantidade insuficiente disponível")
  }

  // Atualizar ferramenta
  // Calcular nova quantidade disponível
  const novaQuantidadeDisponivel = ferramenta.quantidade_disponivel - quantidade

  // Atualizar ferramenta
  // Só alteramos o estado do produto para "em_conserto" se NÃO houver mais itens disponíveis.
  // Caso contrário, mantemos o estado atual (provavelmente "ok"), pois ainda existem unidades operacionais.
  const updateData: any = {
    quantidade_disponivel: novaQuantidadeDisponivel,
  }

  if (novaQuantidadeDisponivel === 0) {
    updateData.estado = "em_conserto"
  }

  const { error: updateError } = await supabase
    .from("ferramentas")
    .update(updateData)
    .eq("id", ferramentaId)
    .eq("profile_id", user.id)

  if (updateError) throw updateError

  // Criar registro de conserto
  // Como não temos coluna de quantidade na tabela consertos, adicionamos à descrição
  const descricaoComQuantidade = `[Qtd: ${quantidade}] ${descricao || ''}`

  const { data: consertoCriado, error: consertoError } = await supabase
    .from("consertos")
    .insert({
      profile_id: user.id,
      ferramenta_id: ferramentaId,
      descricao: descricaoComQuantidade,
      status: status || "aguardando",
      local_conserto,
      prazo: prazo ? new Date(prazo).toISOString() : null,
      prioridade
    })
    .select()
    .single()

  if (consertoError) throw consertoError

  // 🚀 EVENTO SILENCIOSO (Dual Write)
  await trackEvent(supabase, 'ASSET_MAINTENANCE', ferramentaId, {
    maintenance_type: 'CORRECTIVE',
    reason_code: 'BROKEN_REPORT',
    notes: descricaoComQuantidade,
    quantity_affected: quantidade
  }, { actor_id: user.id })

  if (!consertoCriado) throw new Error("Erro ao criar conserto")

  // Registrar movimentação
  const { error: movError } = await supabase.from("movimentacoes").insert({
    profile_id: user.id,
    ferramenta_id: ferramentaId,
    tipo: "conserto",
    quantidade,
    observacoes: descricao ? `${descricao} (conserto ${consertoCriado.id})` : `Conserto ${consertoCriado.id}`,
  })

  if (movError) throw movError

  revalidateAllPages()
}

export async function atualizarStatusConserto(
  consertoId: string,
  status: ConsertoStatus
) {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Não autenticado")

  if (!["aguardando", "em_andamento", "concluido"].includes(status)) {
    throw new Error("Status inválido")
  }

  const updateData: Record<string, any> = { status }

  // Se mover para "em_andamento" e não houver data de envio, define agora
  if (status === "em_andamento") {
    updateData.data_envio = new Date().toISOString()
  }

  // Se marcar como concluído direto, também registra data_retorno
  if (status === "concluido") {
    updateData.data_retorno = new Date().toISOString()
  }

  const { error } = await supabase
    .from("consertos")
    .update(updateData)
    .eq("id", consertoId)
    .eq("profile_id", user.id)

  if (error) throw error

  revalidateAllPages()
}

export async function registrarRetornoConserto(
  consertoId: string,
  custo: number,
  quantidade: number
) {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Não autenticado")

  // Buscar conserto com movimentação de envio
  const { data: conserto, error: consertoError } = await supabase
    .from("consertos")
    .select("id, ferramenta_id, status, custo, data_retorno, data_envio, ferramentas(id, quantidade_disponivel, estado)")
    .eq("id", consertoId)
    .eq("profile_id", user.id)
    .single()

  if (consertoError || !conserto) throw new Error("Conserto não encontrado")

  const dataEnvioRef = conserto.data_envio || new Date().toISOString()

  // Tentar achar movimentação de envio ligada a este conserto (pela observação)
  const { data: movEnvioPorObs } = await supabase
    .from("movimentacoes")
    .select("id, quantidade, data, observacoes")
    .eq("profile_id", user.id)
    .eq("ferramenta_id", conserto.ferramenta_id)
    .eq("tipo", "conserto")
    .ilike("observacoes", `%${conserto.id}%`)
    .order("data", { ascending: true })
    .limit(1)

  // Fallback: primeiro envio registrado após a data do conserto
  const { data: movEnvioFallback } = await supabase
    .from("movimentacoes")
    .select("id, quantidade, data")
    .eq("profile_id", user.id)
    .eq("ferramenta_id", conserto.ferramenta_id)
    .eq("tipo", "conserto")
    .gte("data", dataEnvioRef)
    .order("data", { ascending: true })
    .limit(1)

  const movimentoEnvio = (movEnvioPorObs && movEnvioPorObs[0]) || (movEnvioFallback && movEnvioFallback[0])
  const quantidadeEnviada = movimentoEnvio?.quantidade || 1

  // Buscar retornos deste conserto (marcados na observação)
  const { data: movRetornos } = await supabase
    .from("movimentacoes")
    .select("quantidade")
    .eq("profile_id", user.id)
    .eq("ferramenta_id", conserto.ferramenta_id)
    .eq("tipo", "entrada")
    .ilike("observacoes", `%${conserto.id}%`)

  const quantidadeJaRetornada = (movRetornos || []).reduce((acc, m) => acc + (m.quantidade || 0), 0)
  const quantidadeRestante = Math.max(0, quantidadeEnviada - quantidadeJaRetornada)

  // Se a quantidade solicitada for maior que a restante, verificamos se é um caso de ajuste (forçar retorno de 1)
  if (quantidade > quantidadeRestante) {
    // Se for para retornar 1 e o conserto ainda não foi concluído, permitimos (assumindo inconsistência de dados)
    const isForceReturn = quantidade === 1 && conserto.status !== "concluido"

    if (!isForceReturn) {
      throw new Error(`Quantidade inválida. Ainda em conserto: ${quantidadeRestante}`)
    }
  }

  const quantidadeTotalRetornada = quantidadeJaRetornada + quantidade
  const todasRetornaram = quantidadeTotalRetornada >= quantidadeEnviada

  // Atualizar conserto
  const updateData: any = {
    custo: (conserto.custo || 0) + custo, // Somar custos se houver retorno parcial
  }

  if (todasRetornaram) {
    updateData.status = "concluido"
    updateData.data_retorno = new Date().toISOString()
  }

  const { error: updateConsertoError } = await supabase
    .from("consertos")
    .update(updateData)
    .eq("id", consertoId)
    .eq("profile_id", user.id) // Validação de segurança adicional

  if (updateConsertoError) throw updateConsertoError

  // Atualizar ferramenta
  const ferramenta = conserto.ferramentas as any
  const { error: updateFerramentaError } = await supabase
    .from("ferramentas")
    .update({
      estado: todasRetornaram ? "ok" : "em_conserto", // Só volta para "ok" se todas retornaram
      quantidade_disponivel: ferramenta.quantidade_disponivel + quantidade,
    })
    .eq("id", ferramenta.id)
    .eq("profile_id", user.id) // Validação de segurança adicional

  if (updateFerramentaError) throw updateFerramentaError

  // Registrar movimentação de entrada (retorno)
  const { error: movEntradaError } = await supabase.from("movimentacoes").insert({
    profile_id: user.id,
    ferramenta_id: conserto.ferramenta_id,
    tipo: "entrada",
    quantidade,
    observacoes: `Retorno de conserto ${consertoId}`,
  })

  if (movEntradaError) throw movEntradaError

  revalidateAllPages()
}
