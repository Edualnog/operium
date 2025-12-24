"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClientComponentClient } from "@/lib/supabase-client"

// Query keys factory for type safety and consistency
export const ferramentasKeys = {
  all: ["ferramentas"] as const,
  lists: () => [...ferramentasKeys.all, "list"] as const,
  list: (profileId: string) => [...ferramentasKeys.lists(), profileId] as const,
  details: () => [...ferramentasKeys.all, "detail"] as const,
  detail: (id: string) => [...ferramentasKeys.details(), id] as const,
}

export interface Ferramenta {
  id: string
  nome: string
  categoria: string | null
  quantidade_total: number
  quantidade_disponivel: number
  estado: "ok" | "danificada" | "em_conserto"
  tipo_item: "ferramenta" | "epi" | "consumivel"
  codigo: string | null
  foto_url: string | null
  tamanho: string | null
  cor: string | null
  ponto_ressuprimento: number
  lead_time_dias: number
  validade: string | null
  created_at: string
}

// Fetch all ferramentas for the current user
async function fetchFerramentas(): Promise<Ferramenta[]> {
  const supabase = createClientComponentClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Não autenticado")

  const { data, error } = await supabase
    .from("ferramentas")
    .select("*")
    .eq("profile_id", user.id)
    .order("nome")

  if (error) throw error
  return data || []
}

// Hook to fetch ferramentas with React Query
export function useFerramentasQuery() {
  return useQuery({
    queryKey: ferramentasKeys.lists(),
    queryFn: fetchFerramentas,
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Fetch single ferramenta
async function fetchFerramenta(id: string): Promise<Ferramenta | null> {
  const supabase = createClientComponentClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Não autenticado")

  const { data, error } = await supabase
    .from("ferramentas")
    .select("*")
    .eq("id", id)
    .eq("profile_id", user.id)
    .single()

  if (error) throw error
  return data
}

export function useFerramentaQuery(id: string) {
  return useQuery({
    queryKey: ferramentasKeys.detail(id),
    queryFn: () => fetchFerramenta(id),
    enabled: !!id,
  })
}

// Mutation to update ferramenta
interface UpdateFerramentaInput {
  id: string
  data: Partial<Omit<Ferramenta, "id" | "created_at">>
}

async function updateFerramenta({ id, data }: UpdateFerramentaInput) {
  const supabase = createClientComponentClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Não autenticado")

  const { error } = await supabase
    .from("ferramentas")
    .update(data)
    .eq("id", id)
    .eq("profile_id", user.id)

  if (error) throw error
}

export function useUpdateFerramentaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateFerramenta,
    onSuccess: (_, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ferramentasKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ferramentasKeys.detail(variables.id) })
    },
  })
}

// Hook for ferramentas with low stock (critical items)
export function useFerramentasCriticasQuery() {
  return useQuery({
    queryKey: [...ferramentasKeys.lists(), "criticas"],
    queryFn: async () => {
      const ferramentas = await fetchFerramentas()
      return ferramentas.filter(
        (f) => f.quantidade_disponivel <= f.ponto_ressuprimento
      )
    },
    staleTime: 60 * 1000, // 1 minute
  })
}
