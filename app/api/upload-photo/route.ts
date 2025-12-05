import { createServerComponentClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"
import { resolveBucketName, validateFile } from "./helpers"

const messages = {
  pt: {
    authError: "Não autenticado",
    bucketError: "Bucket inválido",
    fileMissing: "Arquivo não fornecido",
    typeError: "Apenas imagens são permitidas",
    sizeError: "A imagem deve ter no máximo 5MB",
    uploadError: "Erro ao fazer upload",
    unknownError: "Erro desconhecido"
  },
  en: {
    authError: "Not authenticated",
    bucketError: "Invalid bucket",
    fileMissing: "File not provided",
    typeError: "Only images are allowed",
    sizeError: "Image must be at most 5MB",
    uploadError: "Upload error",
    unknownError: "Unknown error"
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient()

    // Obter dados do formulário primeiro para pegar o locale
    const formData = await request.formData()
    const localeParam = formData.get("locale") as string | null
    const lang = (localeParam && localeParam.startsWith("en")) ? "en" : "pt"
    const t = messages[lang]

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: t.authError },
        { status: 401 }
      )
    }

    const file = formData.get("file") as File
    const colaboradorId = formData.get("colaboradorId") as string | null
    const productId = formData.get("productId") as string | null
    const bucketNameParam = formData.get("bucketName") as string | null

    let bucketName: string

    try {
      bucketName = resolveBucketName(colaboradorId, productId, bucketNameParam)
    } catch (bucketError: any) {
      return NextResponse.json(
        { error: t.bucketError },
        { status: 400 }
      )
    }

    const validation = validateFile(file)
    if (!validation.valid) {
      return NextResponse.json(
        { error: t[validation.error as keyof typeof t] },
        { status: 400 }
      )
    }

    // Criar nome único para o arquivo
    const fileExt = file.name.split(".").pop()
    let fileName: string
    if (colaboradorId) {
      fileName = `${colaboradorId}_${Date.now()}.${fileExt}`
    } else if (productId) {
      fileName = `${productId}_${Date.now()}.${fileExt}`
    } else {
      fileName = `temp_${Date.now()}.${fileExt}`
    }
    const filePath = `${user.id}/${fileName}`

    // Converter File para ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload para Supabase Storage
    const { error: uploadError, data } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      })

    if (uploadError) {
      console.error("Erro no upload:", uploadError)
      return NextResponse.json(
        { error: t.uploadError },
        { status: 500 }
      )
    }

    // Obter URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(filePath)

    return NextResponse.json({ url: publicUrl })
  } catch (error: any) {
    console.error("Erro na API de upload:", error)
    // Se não conseguimos determinar o locale (ex: erro ao ler formData), fallback para PT
    return NextResponse.json(
      { error: "Erro desconhecido" },
      { status: 500 }
    )
  }
}
