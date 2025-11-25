"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, X, Package, AlertCircle } from "lucide-react"
import { createClientComponentClient } from "@/lib/supabase-client"
import Image from "next/image"
import { checkBucketExists } from "@/lib/utils/storage"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ProductPhotoUploadProps {
  currentPhotoUrl?: string | null
  onPhotoUploaded: (url: string) => void
  userId: string
  productId?: string
}

const BUCKET_NAME = "produtos-fotos"

export function ProductPhotoUpload({
  currentPhotoUrl,
  onPhotoUploaded,
  userId,
  productId,
}: ProductPhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null)
  const [bucketExists, setBucketExists] = useState<boolean | null>(null)
  const [verifying, setVerifying] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClientComponentClient()

  const verifyBucket = async () => {
    if (!userId) return
    try {
      setVerifying(true)
      setBucketExists(null)
      const exists = await checkBucketExists(supabase, BUCKET_NAME)
      setBucketExists(exists)
    } catch (error) {
      console.error("Erro ao verificar bucket de produtos:", error)
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

  if (!userId) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">Foto do Produto</Label>
        <p className="text-xs text-zinc-500">Carregando...</p>
      </div>
    )
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (bucketExists === false) {
      alert(
        "Bucket 'produtos-fotos' não encontrado no Supabase Storage. Crie o bucket e clique em verificar."
      )
      fileInputRef.current && (fileInputRef.current.value = "")
      return
    }

    if (!file.type.startsWith("image/")) {
      alert("Selecione apenas imagens")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Máximo 5MB")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)

    await uploadPhoto(file)
  }

  const uploadPhoto = async (file: File) => {
    try {
      setUploading(true)
      if (bucketExists === false) {
        alert("Configure o bucket 'produtos-fotos' no Supabase primeiro.")
        setPreview(null)
        fileInputRef.current && (fileInputRef.current.value = "")
        return
      }

      const ext = file.name.split(".").pop()
      const fileName = productId
        ? `${productId}_${Date.now()}.${ext}`
        : `temp_${Date.now()}.${ext}`
      const filePath = `${userId}/${fileName}`

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, { cacheControl: "3600", upsert: true })

      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes("bucket") && msg.includes("not")) {
          setBucketExists(false)
          alert("Bucket 'produtos-fotos' não encontrado. Crie e tente novamente.")
          return
        }
        throw error
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)

      onPhotoUploaded(publicUrl)
    } catch (err: any) {
      console.error("Erro ao enviar foto do produto:", err)
      alert("Erro ao enviar a foto do produto")
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onPhotoUploaded("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Foto do Produto</Label>

      {bucketExists === false && (
        <Alert variant="destructive" className="mb-2">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-semibold">Bucket não encontrado</AlertTitle>
          <AlertDescription>
            Crie o bucket <code className="bg-red-100 px-1 rounded">{BUCKET_NAME}</code> no Supabase
            (público, 5MB, imagens) e clique em verificar.
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={verifyBucket} disabled={verifying}>
                {verifying ? "Verificando..." : "Verificar bucket"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {bucketExists === true && (
        <div className="text-xs text-green-600 font-medium">Bucket pronto para upload.</div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-zinc-200 bg-zinc-50 flex items-center justify-center">
          {preview ? (
            <Image src={preview} alt="Foto do produto" fill className="object-cover" />
          ) : (
            <Package className="h-10 w-10 text-zinc-400" />
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
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Enviando..." : preview ? "Alterar" : "Adicionar"}
            </Button>
            {preview && (
              <Button type="button" variant="outline" size="sm" onClick={handleRemove} disabled={uploading}>
                <X className="h-4 w-4 mr-2" />
                Remover
              </Button>
            )}
          </div>
          <p className="text-xs text-zinc-500">JPG/PNG/WebP até 5MB.</p>
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
