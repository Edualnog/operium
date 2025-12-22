// Tipos TypeScript para KPIs industriais

export interface FerramentaEmUso {
  id: string
  nome: string
  colaborador: string
  saida_at: string
  prazo_devolucao?: string
  dias_em_uso: number
  quantidade_em_uso: number
}

export interface TempoMedioRetorno {
  horas: number
  dias: number
  minutos: number
}

export interface RankingFerramenta {
  id: string
  nome: string
  total_saidas: number
  categoria?: string
}

export interface ScoreResponsabilidade {
  colaborador_id: string
  nome: string
  score: number
  almox_score: number
  level: 'MASTER' | 'PRO' | 'MEMBER' | 'NEWBIE'
  total_retiradas: number
  devolucoes_no_prazo: number
}

export interface ConsumoDiario {
  data: string
  quantidade: number
}

export interface ItemEstoqueCritico {
  id: string
  nome: string
  quantidade_atual: number
  ponto_ressuprimento: number
  deficit: number
  categoria?: string
}

export interface ItemConsumoAlto {
  id: string
  nome: string
  consumo_30d: number
  consumo_medio_diario: number
  categoria?: string
}

export interface EPIAtivo {
  colaborador_id: string
  colaborador_nome: string
  total_epis: number
  epis: Array<{
    id: string
    nome: string
    validade?: string
  }>
}

export interface EPIProximoValidade {
  id: string
  nome: string
  validade: string
  dias_restantes: number
  colaborador?: string
}

export interface RiscoRuptura {
  id: string
  nome: string
  score: number
  consumo_medio_diario: number
  lead_time: number
  estoque_atual: number
  dias_restantes: number
}

export interface ItemCriticoDia {
  id: string
  nome: string
  motivo: string
  prioridade: 'alta' | 'media' | 'baixa'
  acao_sugerida: string
}

export interface FerramentaEstragada {
  id: string
  nome: string
  estado: string
  quantidade_disponivel: number
  quantidade_unidades: number
}

export interface Totais {
  colaboradores: number
  ferramentas: number
  itensEstoque: number
  consumiveis: number
  epis: number
}

export interface KPIData {
  // Ferramentas
  ferramentasEmUso: FerramentaEmUso[]
  tempoMedioRetorno: TempoMedioRetorno
  indiceAtrasoDevolucao: number
  topFerramentasUtilizadas: RankingFerramenta[]
  rankingResponsabilidade: ScoreResponsabilidade[]
  ferramentasEstragadas?: FerramentaEstragada[]

  // Consumíveis
  consumoMedioDiario: number
  itensEstoqueCritico: ItemEstoqueCritico[]
  itensMaiorConsumo: ItemConsumoAlto[]

  // EPIs
  episAtivosPorColaborador: EPIAtivo[]
  episProximosValidade: EPIProximoValidade[]

  // Previsões
  riscoRuptura: RiscoRuptura[]
  itensCriticosDia: ItemCriticoDia[]

  // Totais para dashboard
  totais?: Totais
  totalFerramentasEmUso?: number
  totalFerramentasEstragadas?: number
}
