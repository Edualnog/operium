import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

export async function POST(req: Request) {
    try {
        const { nome } = await req.json();

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'Chave da API OpenAI não configurada.' },
                { status: 500 }
            );
        }

        const prompt = `
      Com base no nome do produto "${nome}", sugira os seguintes campos para cadastro em um sistema de almoxarifado:
      1. Categoria (ex: Elétrica, Hidráulica, Ferramentas Manuais, EPI, Escritório, Limpeza, etc.)
      2. Código Sugerido (formato: 3 letras da categoria + 3 letras do nome + 3 números aleatórios. Ex: ELE-PAR-123)
      3. Tipo de Item (ferramenta, epi, ou consumivel)
      4. Ponto de Ressuprimento (estimativa conservadora, número inteiro)

      Responda APENAS com um JSON no seguinte formato:
      {
        "categoria": "string",
        "codigo": "string",
        "tipo_item": "ferramenta" | "epi" | "consumivel",
        "ponto_ressuprimento": number
      }
    `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Você é um assistente de cadastro de produtos." },
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
