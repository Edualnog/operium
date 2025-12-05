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

        const context = formData.get("context")?.toString() || "movimentacao"

        let systemPrompt = ""

        switch (context) {
            case "ferramenta":
                systemPrompt = `Você é um assistente de cadastro de produtos. Extraia informações de um comando de voz para cadastrar um novo item.
                
                O usuário vai dizer algo como: "Cadastrar 5 furadeiras Bosch na categoria Elétricos" ou "Adicionar 100 luvas de proteção tipo EPI".

                Extraia os seguintes campos em JSON:
                - action: "create"
                - nome: nome do produto (obrigatório)
                - quantidade: número (se não especificado, assuma 0)
                - categoria: categoria do item
                - tipo: "ferramenta", "epi" ou "consumivel" (inferir pelo contexto)
                
                Responda APENAS o JSON.`
                break
            case "colaborador":
                systemPrompt = `Você é um assistente de RH. Extraia informações de um comando de voz para cadastrar um novo colaborador.
                
                O usuário vai dizer algo como: "Cadastrar o João Silva como Eletricista" ou "Novo funcionário Maria Souza, telefone 11999999999".

                Extraia os seguintes campos em JSON:
                - action: "create"
                - nome: nome do colaborador (obrigatório)
                - cargo: cargo ou função
                - telefone: número de telefone
                - email: endereço de email
                
                Responda APENAS o JSON.`
                break
            case "movimentacao":
            default:
                systemPrompt = `Você é um assistente de almoxarifado. Sua tarefa é extrair informações estruturadas de um comando de voz.
          
                O usuário vai dizer algo como: "Retirar 2 furadeiras para o João", "Devolver a lixadeira" ou "Mandar a serra para conserto".
                
                Extraia os seguintes campos em JSON:
                - action: "retirada", "devolucao" ou "conserto" (se não ficar claro, assuma "retirada")
                - quantity: número (se não especificado, assuma 1)
                - item_name: nome do item (o mais próximo possível do que foi dito)
                - collaborator_name: nome do colaborador (se houver)
                
                Responda APENAS o JSON.`
                break
        }

        // 2. Extrair intenção com GPT-4o-mini
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
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
