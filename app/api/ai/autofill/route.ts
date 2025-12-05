import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

export async function POST(req: Request) {
    try {
        const { context, targetField } = await req.json();
        // context = { nome, categoria, tipo_item, ... }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'Chave da API OpenAI não configurada.' },
                { status: 500 }
            );
        }

        let prompt = "";

        if (targetField === 'categoria') {
            prompt = `
        Com base no produto:
        Nome: "${context.nome || ''}"
        Tipo: "${context.tipo_item || ''}"
        
        Sugira uma Categoria curta e padronizada para este item (ex: Elétrica, Hidráulica, Ferramentas Manuais, EPI, Escritório).
        Responda APENAS com um JSON: { "suggestion": "string" }
      `;
        } else if (targetField === 'codigo') {
            prompt = `
        Com base no produto:
        Nome: "${context.nome || ''}"
        Categoria: "${context.categoria || ''}"
        Tipo: "${context.tipo_item || ''}"
        
        Gere um código único e curto seguindo o padrão XXX-YYY-000 (3 letras categoria, 3 letras nome, 3 números).
        Exemplo: Para "Martelo" na categoria "Ferramentas", sugira "FER-MAR-123".
        Responda APENAS com um JSON: { "suggestion": "string" }
      `;
        } else if (targetField === 'ponto_ressuprimento') {
            prompt = `
        Com base no produto:
        Nome: "${context.nome || ''}"
        Tipo: "${context.tipo_item || ''}"
        
        Estime um Ponto de Ressuprimento (quantidade mínima segura) conservador.
        Responda APENAS com um JSON: { "suggestion": number }
      `;
        } else {
            // Fallback para preenchimento geral (comportamento antigo, caso necessário)
            prompt = `
        Com base no nome "${context.nome}", sugira:
        1. Categoria
        2. Código
        3. Ponto de Ressuprimento
        Responda JSON: { "categoria": "...", "codigo": "...", "ponto_ressuprimento": ... }
      `;
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Você é um assistente de cadastro de almoxarifado." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("Sem resposta da IA");

        const data = JSON.parse(content);
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Erro ao gerar autofill:', error);
        return NextResponse.json(
            { error: 'Falha ao gerar sugestões com IA.' },
            { status: 500 }
        );
    }
}
