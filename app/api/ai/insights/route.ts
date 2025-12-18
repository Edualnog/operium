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

        const { kpis, recentMovements, period } = await req.json();

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'Chave da API OpenAI não configurada.' },
                { status: 500 }
            );
        }

        const prompt = `
      Você é um assistente inteligente de gestão de estoque para um sistema chamado "Operium".
      Analise os seguintes dados do dashboard referentes aos últimos ${period || 30} dias e forneça 3 insights curtos e acionáveis (máximo 2 frases cada) para o gestor.
      Foque em eficiência, redução de custos e prevenção de falhas.
      Formato OBRIGATÓRIO: "**Título Curto:** Explicação do insight."
      Use emojis no início de cada insight.

      Dados do Dashboard:
      - Total de Itens: ${kpis.totalItens}
      - Valor Total em Estoque: ${kpis.valorTotal}
      - Itens Abaixo do Mínimo: ${kpis.itensAbaixoMinimo}
      - Movimentações do Período (${recentMovements.length} registros): ${JSON.stringify(recentMovements)}

      Responda APENAS com um array JSON de strings, exemplo: ["💡 Insight 1", "⚠️ Insight 2", "📈 Insight 3"]
    `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Você é um especialista em logística e gestão de estoque." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("Sem resposta da IA");

        const result = JSON.parse(content);
        // Tenta extrair o array de insights, dependendo de como o modelo estruturou o JSON
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
