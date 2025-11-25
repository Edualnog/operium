"use server"

import { createServerComponentClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

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
})

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
    cargo: formData.get("cargo"),
    telefone: formData.get("telefone"),
    foto_url: formData.get("foto_url") || undefined,
    data_admissao: dataAdmissao && dataAdmissao !== "" ? dataAdmissao : undefined,
    email: formData.get("email") || undefined,
    cpf: formData.get("cpf") || undefined,
    endereco: formData.get("endereco") || undefined,
    observacoes: formData.get("observacoes") || undefined,
  })

  const { error } = await supabase.from("colaboradores").insert({
    profile_id: user.id,
    ...data,
  })

  if (error) throw error
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
    cargo: formData.get("cargo"),
    telefone: formData.get("telefone"),
    foto_url: formData.get("foto_url") || undefined,
    data_admissao: dataAdmissao && dataAdmissao !== "" ? dataAdmissao : undefined,
    email: formData.get("email") || undefined,
    cpf: formData.get("cpf") || undefined,
    endereco: formData.get("endereco") || undefined,
    observacoes: formData.get("observacoes") || undefined,
  })

  const { error } = await supabase
    .from("colaboradores")
    .update(data)
    .eq("id", id)
    .eq("profile_id", user.id)

  if (error) throw error
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

    // Preparar dados para inserção - começar com campos básicos obrigatórios
    const insertData: any = {
      profile_id: user.id,
      nome: data.nome,
      categoria: data.categoria || null,
      quantidade_total: data.quantidade_total,
      quantidade_disponivel: data.estado === "ok" ? data.quantidade_total : 0,
      estado: data.estado,
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

    console.log("Inserindo ferramenta com dados:", {
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
      console.warn("Erro na primeira tentativa:", error1.message)
      
      // Se erro for sobre coluna não encontrada, tentar sem campos opcionais
      if (error1.message?.includes("codigo") || 
          error1.message?.includes("column") || 
          error1.message?.includes("schema cache") ||
          error1.message?.includes("tipo_item") ||
          error1.message?.includes("foto_url") ||
          error1.message?.includes("tamanho") ||
          error1.message?.includes("cor")) {
        
        console.log("Tentando inserir apenas com campos básicos...")
        
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
    console.error("Erro em criarFerramenta:", error)
    if (error instanceof z.ZodError) {
      throw new Error(`Erro de validação: ${error.errors.map(e => e.message).join(", ")}`)
    }
    throw error
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

  // Atualizar ferramenta
  const novaQuantidadeDisponivel =
    ferramenta.quantidade_disponivel + quantidade

  if (novaQuantidadeDisponivel > ferramenta.quantidade_total) {
    throw new Error("Quantidade de devolução excede o total")
  }

  const { error: updateError } = await supabase
    .from("ferramentas")
    .update({
      quantidade_disponivel: novaQuantidadeDisponivel,
    })
    .eq("id", ferramentaId)

  if (updateError) throw updateError

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
}

export async function registrarEnvioConserto(
  ferramentaId: string,
  quantidade: number,
  descricao?: string,
  status?: "aguardando" | "em_andamento" | "concluido",
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
  const { error: updateError } = await supabase
    .from("ferramentas")
    .update({
      quantidade_disponivel: ferramenta.quantidade_disponivel - quantidade,
      estado: "em_conserto",
    })
    .eq("id", ferramentaId)

  if (updateError) throw updateError

  // Criar registro de conserto
  const { error: consertoError } = await supabase.from("consertos").insert({
    profile_id: user.id,
    ferramenta_id: ferramentaId,
    descricao,
    status: status || "aguardando",
    local_conserto,
    prazo: prazo ? new Date(prazo).toISOString() : null,
    prioridade,
  })

  if (consertoError) throw consertoError

  // Registrar movimentação
  const { error: movError } = await supabase.from("movimentacoes").insert({
    profile_id: user.id,
    ferramenta_id: ferramentaId,
    tipo: "conserto",
    quantidade,
    observacoes: descricao,
  })

  if (movError) throw movError

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

  // Buscar conserto - otimizado: apenas campos necessários
  const { data: conserto, error: consertoError } = await supabase
    .from("consertos")
    .select("id, ferramenta_id, ferramentas(id, quantidade_disponivel, estado)")
    .eq("id", consertoId)
    .eq("profile_id", user.id)
    .single()

  if (consertoError || !conserto) throw new Error("Conserto não encontrado")

  // Atualizar conserto
  const { error: updateConsertoError } = await supabase
    .from("consertos")
    .update({
      status: "concluido",
      custo,
      data_retorno: new Date().toISOString(),
    })
    .eq("id", consertoId)

  if (updateConsertoError) throw updateConsertoError

  // Atualizar ferramenta
  const ferramenta = conserto.ferramentas as any
  const { error: updateFerramentaError } = await supabase
    .from("ferramentas")
    .update({
      estado: "ok",
      quantidade_disponivel: ferramenta.quantidade_disponivel + quantidade,
    })
    .eq("id", ferramenta.id)

  if (updateFerramentaError) throw updateFerramentaError

  revalidateAllPages()
}
