import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function createApiClient() {
    const cookieStore = await cookies();
    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            get(name: string) {
                return cookieStore.get(name)?.value;
            },
            set() { },
            remove() { },
        },
    });
}

export async function POST(req: Request) {
    try {
        // 🔐 Auth Check - Verificar autenticação
        const supabase = await createApiClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Não autenticado' },
                { status: 401 }
            );
        }

        const { kpis, recentMovements, teamsData, vehiclesData, collaboratorsData, repairsData, vehicleCostsDetailed, collaboratorIssues, period, lang } = await req.json();

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'Chave da API OpenAI não configurada.' },
                { status: 500 }
            );
        }

        // Dynamic prompt based on user language
        const isEnglish = lang === 'en';

        const systemMessage = isEnglish
            ? "You are an expert in logistics, operations, fleet management, and team coordination."
            : "Você é um especialista em logística, operações, gestão de frotas e coordenação de equipes.";

        const prompt = isEnglish
            ? `
You are an intelligent operational management assistant for \"Operium\", a comprehensive platform for managing tools, teams, vehicles, and field operations.

Analyze the following dashboard data from the last ${period || 30} days and provide 3 SHORT, actionable insights (max 2 sentences each).
Focus on efficiency, cost reduction, team coordination, and failure prevention.

REQUIRED FORMAT: "**Short Title:** Insight explanation."
Use emojis at the beginning of each insight.

📊 INVENTORY DATA:
- Total Items: ${kpis.totalItens}
- Total Stock Value: R$ ${kpis.valorTotal}
- Items Below Minimum: ${kpis.itensAbaixoMinimo}
- Period Movements (${recentMovements?.length || 0} records)

👥 TEAMS DATA:
- Active Teams: ${teamsData?.activeTeams || 0}
- Teams Without Leader: ${teamsData?.teamsWithoutLeader || 0}
- Equipment Allocated to Teams: ${teamsData?.totalEquipmentAllocated || 0}
- Total Teams: ${teamsData?.totalTeams || 0}

🚗 VEHICLES DATA:
- Total Vehicles: ${vehiclesData?.totalVehicles || 0}
- Maintenance Costs: R$ ${vehiclesData?.maintenanceCosts || 0}
- Total Costs: R$ ${vehiclesData?.totalCosts || 0}
- Average Cost per Vehicle: R$ ${vehiclesData?.avgCostPerVehicle?.toFixed(2) || 0}

👷 COLLABORATORS:
- Total Collaborators: ${collaboratorsData?.totalCollaborators || 0}

🔧 REPAIRS:
- Total Repairs: ${repairsData?.totalRepairs || 0}
- Average Repair Cost: R$ ${repairsData?.avgRepairCost?.toFixed(2) || 0}
- Pending Repairs: ${repairsData?.pendingRepairs || 0}

⛽ DETAILED VEHICLE COSTS:
- Total Fuel Expenses: R$ ${vehicleCostsDetailed?.totalFuel?.toFixed(2) || 0}
- Avg Fuel per Vehicle: R$ ${vehicleCostsDetailed?.avgFuelPerVehicle?.toFixed(2) || 0}
- Vehicles Above Average (30%+): ${vehicleCostsDetailed?.vehiclesAboveAverage || 0}

⚠️ COLLABORATOR ISSUES:
- Collaborators with High Loss Rate (>20%): ${collaboratorIssues?.highLossRate || 0}
- Collaborators with High Damage Rate (3+ items): ${collaboratorIssues?.highDamageRate || 0}

Provide insights that connect these different modules. For example:
- If teams have equipment but no leader, suggest assigning one
- If vehicle fuel costs are above average, recommend route optimization or driver training
- If many repairs are pending, highlight potential operational impact
- If collaborators have high loss rates, suggest corrective actions or training

Reply ONLY with a JSON array of strings, example: ["💡 Insight 1", "⚠️ Insight 2", "📈 Insight 3"]
`
            : `
Você é um assistente inteligente de gestão operacional para \"Operium\", uma plataforma completa de gestão de ferramentas, equipes, veículos e operações de campo.

Analise os seguintes dados do dashboard referentes aos últimos ${period || 30} dias e forneça 3 insights CURTOS e acionáveis (máximo 2 frases cada).
Foque em eficiência, redução de custos, coordenação de equipes e prevenção de falhas.

Formato OBRIGATÓRIO: "**Título Curto:** Explicação do insight."
Use emojis no início de cada insight.

📊 DADOS DE ESTOQUE:
- Total de Itens: ${kpis.totalItens}
- Valor Total em Estoque: R$ ${kpis.valorTotal}
- Itens Abaixo do Mínimo: ${kpis.itensAbaixoMinimo}
- Movimentações do Período (${recentMovements?.length || 0} registros)

👥 DADOS DE EQUIPES:
- Equipes Ativas: ${teamsData?.activeTeams || 0}
- Equipes Sem Líder: ${teamsData?.teamsWithoutLeader || 0}
- Equipamentos Alocados às Equipes: ${teamsData?.totalEquipmentAllocated || 0}
- Total de Equipes: ${teamsData?.totalTeams || 0}

🚗 DADOS DE VEÍCULOS:
- Total de Veículos: ${vehiclesData?.totalVehicles || 0}
- Custos de Manutenções: R$ ${vehiclesData?.maintenanceCosts || 0}
- Custos Totais: R$ ${vehiclesData?.totalCosts || 0}
- Custo Médio por Veículo: R$ ${vehiclesData?.avgCostPerVehicle?.toFixed(2) || 0}

👷 COLABORADORES:
- Total de Colaboradores: ${collaboratorsData?.totalCollaborators || 0}

🔧 CONSERTOS:
- Total de Consertos: ${repairsData?.totalRepairs || 0}
- Custo Médio de Conserto: R$ ${repairsData?.avgRepairCost?.toFixed(2) || 0}
- Consertos Pendentes: ${repairsData?.pendingRepairs || 0}

⛽ CUSTOS DETALHADOS DE VEÍCULOS:
- Gasto Total com Combustível: R$ ${vehicleCostsDetailed?.totalFuel?.toFixed(2) || 0}
- Gasto Médio de Combustível/Veículo: R$ ${vehicleCostsDetailed?.avgFuelPerVehicle?.toFixed(2) || 0}
- Veículos Acima da Média (30%+): ${vehicleCostsDetailed?.vehiclesAboveAverage || 0}

⚠️ PROBLEMAS COM COLABORADORES:
- Colaboradores com Alta Taxa de Perdas (>20%): ${collaboratorIssues?.highLossRate || 0}
- Colaboradores com Alto Índice de Danos (3+ itens): ${collaboratorIssues?.highDamageRate || 0}

Forneça insights que conectem esses diferentes módulos. Por exemplo:
- Se equipes têm equipamentos mas não têm líder, sugira designar um
- Se custos de combustível estão acima da média, recomende otimização de rotas ou treinamento de motoristas
- Se há muitos consertos pendentes, destaque o impacto operacional potencial
- Se colaboradores têm alta taxa de perdas, sugira ações corretivas ou treinamento

Responda APENAS com um array JSON de strings, exemplo: ["💡 Insight 1", "⚠️ Insight 2", "📈 Insight 3"]
`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error(isEnglish ? "No AI response" : "Sem resposta da IA");

        const result = JSON.parse(content);
        // Try to extract insights array, depending on how the model structured the JSON
        const insights = result.insights || result.data || Object.values(result)[0] || [];

        return NextResponse.json({ insights });

    } catch (error: any) {
        console.error('Erro ao gerar insights:', error);
        return NextResponse.json(
            { error: 'Falha ao gerar insights com IA.' },
            { status: 500 }
        );
    }
}

