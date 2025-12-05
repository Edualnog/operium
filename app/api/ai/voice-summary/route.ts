import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
    try {
        const supabase = createRouteHandlerClient({ cookies })
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        // 1. Coletar dados do Dashboard
        // Buscar KPIs básicos
        const { data: ferramentas } = await supabase
            .from("ferramentas")
            .select("id, nome, quantidade_disponivel, quantidade_total, ponto_ressuprimento, estado")
            .eq("profile_id", user.id)

        const { data: movimentacoes } = await supabase
            .from("movimentacoes")
            .select("tipo, quantidade, ferramentas(nome)")
            .eq("profile_id", user.id)
            .order("data", { ascending: false })
            .limit(10) // Últimas 10 movimentações

        // Processar dados para o resumo
        const totalItens = ferramentas?.length || 0
        const itensBaixoEstoque = ferramentas?.filter((f: any) =>
            f.quantidade_disponivel <= (f.ponto_ressuprimento || 0) && f.ponto_ressuprimento > 0
        ) || []

        const itensDanificados = ferramentas?.filter((f: any) => f.estado === 'danificada') || []

        // Preparar contexto para o GPT
        const context = {
            total_itens: totalItens,
            itens_baixo_estoque: itensBaixoEstoque.map((f: any) => f.nome),
            qtd_baixo_estoque: itensBaixoEstoque.length,
            qtd_danificados: itensDanificados.length,
            ultimas_movimentacoes: movimentacoes?.map((m: any) => ({
                acao: m.tipo,
                item: m.ferramentas?.nome,
                qtd: m.quantidade
            }))
        }

        // 2. Gerar texto do resumo com GPT-4o-mini
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `Você é um assistente de almoxarifado industrial experiente e direto.
          Gere um resumo falado curto (máximo 3 frases) para o gestor.
          Foque no que é crítico: itens com estoque baixo e movimentações recentes importantes.
          Use um tom profissional mas natural. Não use listas, fale como uma pessoa.
          Comece com uma saudação apropriada para o horário.`
                },
                {
                    role: "user",
                    content: JSON.stringify(context)
                }
            ],
            max_tokens: 150,
        })

        const textToSpeak = completion.choices[0].message.content || "Não foi possível gerar o resumo."

        // 3. Gerar áudio com ElevenLabs
        const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
        const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb" // Exemplo: George (British) ou outro ID válido. Vamos usar um padrão.
        // Rachel: 21m00Tcm4TlvDq8ikWAM
        // Antoni: ErXwobaYiN019PkySvjV
        // Vamos usar o Antoni (American, well-rounded)
        const voiceIdToUse = "ErXwobaYiN019PkySvjV"

        if (!ELEVENLABS_API_KEY) {
            console.error("ELEVENLABS_API_KEY is missing")
            return NextResponse.json({ error: "ElevenLabs API Key missing" }, { status: 500 })
        }

        const elevenLabsResponse = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceIdToUse}`,
            {
                method: "POST",
                headers: {
                    "Accept": "audio/mpeg",
                    "Content-Type": "application/json",
                    "xi-api-key": ELEVENLABS_API_KEY,
                },
                body: JSON.stringify({
                    text: textToSpeak,
                    model_id: "eleven_multilingual_v2",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                }),
            }
        )

        if (!elevenLabsResponse.ok) {
            const errorText = await elevenLabsResponse.text()
            console.error("ElevenLabs API Error:", errorText)
            return NextResponse.json({ error: "Failed to generate speech" }, { status: 500 })
        }

        const audioBuffer = await elevenLabsResponse.arrayBuffer()

        return new NextResponse(audioBuffer, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": audioBuffer.byteLength.toString(),
            },
        })

    } catch (error) {
        console.error("Error in voice summary:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
