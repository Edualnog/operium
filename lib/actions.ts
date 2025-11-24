"use server"

import { createServerComponentClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Schemas de validação
const colaboradorSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cargo: z.string().optional(),
  telefone: z.string().optional(),
})

const ferramentaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  categoria: z.string().optional(),
  quantidade_total: z.number().min(0),
  estado: z.enum(["ok", "danificada", "em_conserto"]),
})

// Colaboradores
export async function criarColaborador(formData: FormData) {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Não autenticado")

  const data = colaboradorSchema.parse({
    nome: formData.get("nome"),
    cargo: formData.get("cargo"),
    telefone: formData.get("telefone"),
  })

  const { error } = await supabase.from("colaboradores").insert({
    profile_id: user.id,
    ...data,
  })

  if (error) throw error
  revalidatePath("/dashboard/colaboradores")
}

export async function atualizarColaborador(id: string, formData: FormData) {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Não autenticado")

  const data = colaboradorSchema.parse({
    nome: formData.get("nome"),
    cargo: formData.get("cargo"),
    telefone: formData.get("telefone"),
  })

  const { error } = await supabase
    .from("colaboradores")
    .update(data)
    .eq("id", id)
    .eq("profile_id", user.id)

  if (error) throw error
  revalidatePath("/dashboard/colaboradores")
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
  revalidatePath("/dashboard/colaboradores")
}

// Ferramentas
export async function criarFerramenta(formData: FormData) {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Não autenticado")

  const data = ferramentaSchema.parse({
    nome: formData.get("nome"),
    categoria: formData.get("categoria"),
    quantidade_total: Number(formData.get("quantidade_total")),
    estado: formData.get("estado"),
  })

  const { error } = await supabase.from("ferramentas").insert({
    profile_id: user.id,
    ...data,
    quantidade_disponivel: data.estado === "ok" ? data.quantidade_total : 0,
  })

  if (error) throw error
  revalidatePath("/dashboard/ferramentas")
}

export async function atualizarFerramenta(id: string, formData: FormData) {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Não autenticado")

  const data = ferramentaSchema.parse({
    nome: formData.get("nome"),
    categoria: formData.get("categoria"),
    quantidade_total: Number(formData.get("quantidade_total")),
    estado: formData.get("estado"),
  })

  const { error } = await supabase
    .from("ferramentas")
    .update(data)
    .eq("id", id)
    .eq("profile_id", user.id)

  if (error) throw error
  revalidatePath("/dashboard/ferramentas")
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
  revalidatePath("/dashboard/ferramentas")
}

// Movimentações
export async function registrarEntrada(
  ferramentaId: string,
  quantidade: number,
  observacoes?: string
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
  const { error: movError } = await supabase.from("movimentacoes").insert({
    profile_id: user.id,
    ferramenta_id: ferramentaId,
    tipo: "entrada",
    quantidade,
    observacoes,
  })

  if (movError) throw movError

  revalidatePath("/dashboard/ferramentas")
  revalidatePath("/dashboard")
}

export async function registrarRetirada(
  ferramentaId: string,
  colaboradorId: string,
  quantidade: number,
  observacoes?: string
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
    })
    .eq("id", ferramentaId)

  if (updateError) throw updateError

  // Registrar movimentação
  const { error: movError } = await supabase.from("movimentacoes").insert({
    profile_id: user.id,
    ferramenta_id: ferramentaId,
    colaborador_id: colaboradorId,
    tipo: "retirada",
    quantidade,
    observacoes,
  })

  if (movError) throw movError

  revalidatePath("/dashboard/ferramentas")
  revalidatePath("/dashboard")
}

export async function registrarDevolucao(
  ferramentaId: string,
  colaboradorId: string,
  quantidade: number,
  observacoes?: string
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
  const { error: movError } = await supabase.from("movimentacoes").insert({
    profile_id: user.id,
    ferramenta_id: ferramentaId,
    colaborador_id: colaboradorId,
    tipo: "devolucao",
    quantidade,
    observacoes,
  })

  if (movError) throw movError

  revalidatePath("/dashboard/ferramentas")
  revalidatePath("/dashboard")
}

export async function registrarEnvioConserto(
  ferramentaId: string,
  quantidade: number,
  descricao?: string
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
    status: "aguardando",
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

  revalidatePath("/dashboard/ferramentas")
  revalidatePath("/dashboard/consertos")
  revalidatePath("/dashboard")
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

  revalidatePath("/dashboard/consertos")
  revalidatePath("/dashboard/ferramentas")
  revalidatePath("/dashboard")
}

