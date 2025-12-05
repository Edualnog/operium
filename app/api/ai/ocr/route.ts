import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

export async function POST(req: Request) {
    try {
        const { image } = await req.json(); // image is base64 string

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'Chave da API OpenAI não configurada.' },
                { status: 500 }
            );
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "Você é um assistente especializado em digitalizar Notas Fiscais e Invoices. Seu objetivo é extrair os itens listados na imagem."
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Analise esta imagem de nota fiscal e extraia os itens. Retorne APENAS um JSON com uma lista de objetos contendo: 'nome' (descrição do produto), 'quantidade' (número), 'valor_unitario' (número), 'codigo' (se não houver, GERE um código sugerido baseado no nome, ex: PAR-001), 'categoria' (sugira uma categoria baseada no nome, ex: Ferramentas Elétricas, Hidráulica, etc), 'unidade' (sugira a unidade: UN, KG, M, CX, etc). Exemplo: { \"items\": [{ \"nome\": \"Martelo\", \"quantidade\": 2, \"valor_unitario\": 15.50, \"codigo\": \"MAR-001\", \"categoria\": \"Ferramentas Manuais\", \"unidade\": \"UN\" }] }" },
                        {
                            type: "image_url",
                            image_url: {
                                "url": image,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 1000,
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
