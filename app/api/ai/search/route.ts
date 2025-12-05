import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

export async function POST(req: Request) {
    try {
        const { query, categorias } = await req.json();

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'Chave da API OpenAI não configurada.' },
                { status: 500 }
            );
        }

        const prompt = `
      Você é um assistente de busca para um sistema de almoxarifado.
      O usuário fará uma busca em linguagem natural e você deve traduzi-la para os filtros do sistema.
      
      Filtros disponíveis:
      - search: string (texto para busca por nome/código)
      - tipo: "ferramenta" | "epi" | "consumivel" | ""
      - estado: "ok" | "danificada" | "em_conserto" | ""
      - categoria: string (uma das categorias disponíveis: ${JSON.stringify(categorias)}) | ""
      - ordenarPor: "nome" | "quantidade_disponivel" | "quantidade_total" | "created_at"
      - ordem: "asc" | "desc"

      Query do usuário: "${query}"

      Regras:
      1. Se o usuário mencionar "acabando", "pouco estoque", "repor", ordene por "quantidade_disponivel" asc.
      2. Se mencionar "novos" ou "recentes", ordene por "created_at" desc.
      3. Tente mapear nomes de categorias aproximados para as categorias disponíveis.
      4. Mantenha os campos vazios ("") se não houver menção na query.

      Responda APENAS com um JSON no formato:
      {
        "search": "...",
        "tipo": "...",
        "estado": "...",
        "categoria": "...",
        "ordenarPor": "...",
        "ordem": "..."
      }
    `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Você é um especialista em traduzir buscas para filtros estruturados." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.0,
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("Sem resposta da IA");

        const filters = JSON.parse(content);
        return NextResponse.json(filters);

    } catch (error: any) {
        console.error('Erro na busca IA:', error);
        return NextResponse.json(
            { error: 'Falha ao processar busca com IA.' },
            { status: 500 }
        );
    }
}
