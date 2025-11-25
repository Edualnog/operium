"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, X, User, AlertCircle } from "lucide-react"
import { createClientComponentClient } from "@/lib/supabase-client"
import Image from "next/image"
import { checkBucketExists } from "@/lib/utils/storage"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

interface PhotoUploadProps {
  currentPhotoUrl?: string | null
  onPhotoUploaded: (url: string) => void
  userId: string
  colaboradorId?: string
}

export function PhotoUpload({
  currentPhotoUrl,
  onPhotoUploaded,
  userId,
  colaboradorId,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null)
  const [bucketExists, setBucketExists] = useState<boolean | null>(null)
  const [verifying, setVerifying] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClientComponentClient()

  // Verificar se o bucket existe ao montar o componente
  const verifyBucket = async () => {
    if (!userId) {
      return
    }
    
    try {
      setVerifying(true)
      setBucketExists(null) // Mostrar loading
      
      const exists = await checkBucketExists(supabase, "colaboradores-fotos")
      setBucketExists(exists)
    } catch (error: any) {
      console.error("Erro ao verificar bucket:", error)
      setBucketExists(false)
    } finally {
      setVerifying(false)
    }
  }

  useEffect(() => {
    if (userId) {
      verifyBucket()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Se não tiver userId, mostrar loading
  if (!userId) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">Foto do Colaborador</Label>
        <p className="text-xs text-zinc-500">Carregando...</p>
      </div>
    )
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Verificar se o bucket existe antes de continuar
    if (bucketExists === false) {
      alert(
        "Bucket 'colaboradores-fotos' não encontrado no Supabase Storage.\n\n" +
        "Por favor, crie o bucket primeiro seguindo as instruções exibidas acima."
      )
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione apenas imagens")
      return
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5MB")
      return
    }

    // Criar preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload para Supabase Storage
    await uploadPhoto(file)
  }

  const uploadPhoto = async (file: File) => {
    try {
      setUploading(true)

      // Verificar novamente se o bucket existe antes de fazer upload
      if (bucketExists === false) {
        alert(
          "Bucket 'colaboradores-fotos' não encontrado.\n\n" +
          "Por favor, crie o bucket no Supabase Dashboard seguindo as instruções exibidas acima."
        )
        setPreview(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
        return
      }

      // Criar nome único para o arquivo
      // IMPORTANTE: A estrutura deve ser {userId}/{fileName} para que as políticas RLS funcionem
      const fileExt = file.name.split(".").pop()
      const fileName = colaboradorId
        ? `${colaboradorId}_${Date.now()}.${fileExt}`
        : `temp_${Date.now()}.${fileExt}`
      // A pasta deve ser o userId para que a política RLS funcione
      const filePath = `${userId}/${fileName}`

      // Upload
      const { error: uploadError, data } = await supabase.storage
        .from("colaboradores-fotos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true, // Permite sobrescrever se já existir
        })

      if (uploadError) {
        // Se o bucket não existir, atualizar estado e mostrar erro
        const errorMsg = uploadError.message?.toLowerCase() || ""
        if (
          errorMsg.includes("bucket not found") ||
          errorMsg.includes("not found") ||
          errorMsg.includes("does not exist")
        ) {
          setBucketExists(false)
          setPreview(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
          alert(
            "Bucket 'colaboradores-fotos' não encontrado.\n\n" +
            "Por favor, crie o bucket no Supabase Dashboard e execute a migration SQL."
          )
          return
        }
        
        // Outros erros (permissão, etc)
        throw uploadError
      }

      // Obter URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from("colaboradores-fotos").getPublicUrl(filePath)

      onPhotoUploaded(publicUrl)
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error)
      alert("Erro ao fazer upload da foto: " + (error.message || "Erro desconhecido"))
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onPhotoUploaded("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Foto do Colaborador</Label>
      
      {/* Alerta se o bucket não existir */}
      {bucketExists === false && (
        <Alert variant="destructive" className="mb-4 border-2 border-red-300">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-base font-bold">⚠️ Bucket não encontrado</AlertTitle>
          <AlertDescription className="mt-3 space-y-3">
            <p className="font-medium">
              O bucket <strong className="text-red-700">colaboradores-fotos</strong> não foi encontrado no Supabase Storage.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-2">
              <p className="text-sm font-semibold text-red-800">📋 Passos para resolver:</p>
              <ol className="text-sm text-red-700 space-y-2 list-decimal list-inside ml-2">
                <li>
                  Acesse o <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-red-900">Supabase Dashboard</a>
                </li>
                <li>Vá em <strong>Storage</strong> → <strong>New bucket</strong></li>
                <li>Configure o bucket:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-xs">
                    <li><strong>Nome:</strong> <code className="bg-red-100 px-1.5 py-0.5 rounded font-mono">colaboradores-fotos</code></li>
                    <li><strong>Public bucket:</strong> ✅ Marcar como público</li>
                    <li><strong>File size limit:</strong> 5 MB</li>
                    <li><strong>Allowed MIME types:</strong> image/jpeg, image/png, image/gif, image/webp</li>
                  </ul>
                </li>
                <li>Após criar, clique no botão abaixo para verificar</li>
              </ol>
              <div className="mt-3 flex gap-2 items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    verifyBucket()
                  }}
                  className="text-xs"
                  disabled={verifying}
                >
                  {verifying ? (
                    <>⏳ Verificando...</>
                  ) : (
                    <>🔄 Verificar Bucket Novamente</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-red-600 mt-3">
                💡 Consulte o arquivo <code className="bg-red-100 px-1 rounded">SETUP_STORAGE.md</code> para configuração de políticas RLS
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-200 bg-zinc-100 flex items-center justify-center">
          {preview ? (
            <Image
              src={preview}
              alt="Foto do colaborador"
              fill
              className="object-cover"
            />
          ) : (
            <User className="h-12 w-12 text-zinc-400" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || bucketExists === false || verifying}
              title={bucketExists === false ? "Configure o bucket no Supabase primeiro" : verifying ? "Verificando bucket..." : ""}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Enviando..." : preview ? "Alterar" : "Adicionar Foto"}
            </Button>
            {preview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={uploading}
              >
                <X className="h-4 w-4 mr-2" />
                Remover
              </Button>
            )}
          </div>
          <p className="text-xs text-zinc-500">
            JPG, PNG ou GIF. Máximo 5MB
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  )
}
