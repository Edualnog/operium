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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClientComponentClient()

  // Verificar se o bucket existe ao montar o componente
  useEffect(() => {
    async function verifyBucket() {
      if (userId) {
        const exists = await checkBucketExists(supabase, "colaboradores-fotos")
        setBucketExists(exists)
      }
    }
    verifyBucket()
  }, [userId, supabase])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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

      // Criar nome único para o arquivo
      const fileExt = file.name.split(".").pop()
      const fileName = colaboradorId
        ? `${colaboradorId}_${Date.now()}.${fileExt}`
        : `temp_${userId}_${Date.now()}.${fileExt}`
      const filePath = `colaboradores/${userId}/${fileName}`

      // Upload
      const { error: uploadError, data } = await supabase.storage
        .from("colaboradores-fotos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) {
        // Se o bucket não existir, mostrar instruções detalhadas
        if (
          uploadError.message.includes("Bucket not found") ||
          uploadError.message.includes("not found") ||
          uploadError.message.includes("does not exist")
        ) {
          const message = `Bucket 'colaboradores-fotos' não encontrado no Supabase Storage.

Para resolver:
1. Acesse o Supabase Dashboard
2. Vá em Storage → New bucket
3. Nome: colaboradores-fotos
4. Marque como "Public bucket"
5. Limite: 5MB
6. MIME types: image/jpeg, image/png, image/gif, image/webp

Consulte o arquivo SETUP_STORAGE.md para mais detalhes.`
          
          alert(message)
          return
        }
        throw uploadError
      }

      // Obter URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from("colaboradores-fotos").getPublicUrl(filePath)

      onPhotoUploaded(publicUrl)
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error)
      alert("Erro ao fazer upload da foto: " + error.message)
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
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Bucket não encontrado</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p>
              O bucket <strong>colaboradores-fotos</strong> não foi encontrado no Supabase Storage.
            </p>
            <div className="text-sm space-y-1">
              <p className="font-semibold">Para resolver:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Acesse o Supabase Dashboard</li>
                <li>Vá em <strong>Storage</strong> → <strong>New bucket</strong></li>
                <li>Configure:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                    <li>Nome: <code className="bg-zinc-100 px-1 rounded">colaboradores-fotos</code></li>
                    <li>Public bucket: ✅ Marcar como público</li>
                    <li>File size limit: 5 MB</li>
                    <li>Allowed MIME types: image/jpeg, image/png, image/gif, image/webp</li>
                  </ul>
                </li>
                <li>Consulte o arquivo <code className="bg-zinc-100 px-1 rounded">SETUP_STORAGE.md</code> para mais detalhes</li>
              </ol>
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
              disabled={uploading}
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

