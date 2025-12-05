import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const audioFile = formData.get("audio") as File

        if (!audioFile) {
            return NextResponse.json(
                { error: "Nenhum arquivo de áudio enviado" },
                { status: 400 }
            )
        }

        // 1. Transcrever áudio com Whisper
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
            language: "pt",
        })

        const text = transcription.text
        console.log("Texto transcrito:", text)

        if (!text) {
            return NextResponse.json(
                { error: "Não foi possível transcrever o áudio" },
                { status: 400 }
            )
        }

        // 2. Extrair intenção com GPT-4o-mini
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `Você é um assistente de almoxarifado. Sua tarefa é extrair informações estruturadas de um comando de voz.
          
          O usuário vai dizer algo como: "Retirar 2 furadeiras para o João" ou "Devolver a lixadeira".
          
          Extraia os seguintes campos em JSON:
          - action: "retirada" ou "devolucao" (se não ficar claro, assuma "retirada")
          - quantity: número (se não especificado, assuma 1)
          - item_name: nome do item (o mais próximo possível do que foi dito)
          - collaborator_name: nome do colaborador (se houver)
          
          Responda APENAS o JSON.`,
                },
                {
                    role: "user",
                    content: text,
                },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
        })

        const content = completion.choices[0].message.content
        if (!content) {
            throw new Error("Falha ao processar intenção")
        }

        const intent = JSON.parse(content)

        return NextResponse.json({
            text,
            intent,
        })
    } catch (error: any) {
        console.error("Erro no processamento de voz:", error)
        return NextResponse.json(
            { error: error.message || "Erro interno no servidor" },
            { status: 500 }
        )
    }
}
