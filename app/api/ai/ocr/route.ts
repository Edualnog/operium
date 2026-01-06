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

        const { image } = await req.json(); // image is base64 string

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'Chave da API OpenAI não configurada.' },
                { status: 500 }
            );
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o",  // Modelo mais potente para melhor precisão
            messages: [
                {
                    role: "system",
                    content: `Você é um assistente especializado em OCR de Notas Fiscais brasileiras. 
Seu objetivo é extrair TODOS os itens com MÁXIMA PRECISÃO, mesmo em fotos de baixa qualidade.

REGRAS CRÍTICAS:
1. Leia CADA linha da nota fiscal com atenção
2. Se um número estiver borrado, use contexto para inferir (ex: preços similares, padrões)
3. NUNCA invente dados - se não conseguir ler, deixe o campo vazio
4. Priorize QUANTIDADE e NOME - são os campos mais importantes
5. Para fotos: ajuste mentalmente rotação, perspectiva e iluminação antes de ler`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analise esta imagem de nota fiscal brasileira e extraia TODOS os itens com MÁXIMA PRECISÃO.

INSTRUÇÕES ESPECÍFICAS:
- Se a imagem estiver inclinada ou com má iluminação, compense mentalmente
- Leia números com cuidado: 0 vs O, 1 vs l, 5 vs S, 8 vs B
- Valores monetários: sempre com 2 casas decimais (ex: 15.50, não 15.5)
- Quantidades: números inteiros (ex: 2, não 2.0)

FORMATO DE SAÍDA (JSON puro, sem markdown):
{
  "items": [
    {
      "nome": "DESCRIÇÃO EXATA do produto (copie da nota)",
      "quantidade": número_inteiro,
      "valor_unitario": número_decimal,
      "codigo": "código se houver, senão gere baseado no nome (ex: MART-001)",
      "categoria": "categoria sugerida (ex: Ferramentas Manuais, Hidráulica)",
      "unidade": "UN, KG, M, CX, etc"
    }
  ]
}

EXEMPLO:
{
  "items": [
    {
      "nome": "MARTELO UNHA 25MM CABO MADEIRA",
      "quantidade": 2,
      "valor_unitario": 15.50,
      "codigo": "MART-001",
      "categoria": "Ferramentas Manuais",
      "unidade": "UN"
    }
  ]
}

IMPORTANTE: Retorne APENAS o JSON, sem explicações ou markdown.`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                "url": image,
                                "detail": "high"  // Análise de alta qualidade
                            },
                        },
                    ],
                },
            ],
            max_tokens: 2000,  // Mais tokens para notas grandes
            temperature: 0.1,  // Baixa temperatura para mais precisão
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("Sem resposta da IA");

        // Limpar markdown code blocks se houver
        const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanedContent);

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Erro no OCR:', error);
        return NextResponse.json(
            { error: 'Falha ao processar imagem.' },
            { status: 500 }
        );
    }
}
