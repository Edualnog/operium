import { createServerComponentClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"
import { resolveBucketName } from "./helpers"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient()
    
    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    // Obter dados do formulário
    const formData = await request.formData()
    const file = formData.get("file") as File
    const colaboradorId = formData.get("colaboradorId") as string | null
    const productId = formData.get("productId") as string | null
    const bucketNameParam = formData.get("bucketName") as string | null

    let bucketName: string

    try {
      bucketName = resolveBucketName(colaboradorId, productId, bucketNameParam)
    } catch (bucketError: any) {
      return NextResponse.json(
        { error: bucketError.message || "Bucket inválido" },
        { status: 400 }
      )
    }

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo não fornecido" },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Apenas imagens são permitidas" },
        { status: 400 }
      )
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "A imagem deve ter no máximo 5MB" },
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
        { error: uploadError.message || "Erro ao fazer upload" },
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
    return NextResponse.json(
      { error: error.message || "Erro desconhecido" },
      { status: 500 }
    )
  }
}
