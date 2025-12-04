"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, X, User, AlertCircle, Camera } from "lucide-react"
import { createClientComponentClient } from "@/lib/supabase-client"
import Image from "next/image"
import { useTranslation } from "react-i18next"
import { checkBucketExists } from "@/lib/utils/storage"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { CameraCaptureModal } from "@/components/ui/camera-capture-modal"

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
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null)
  const [bucketExists, setBucketExists] = useState<boolean | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [lastUploadTime, setLastUploadTime] = useState<number>(0)
  const [showCamera, setShowCamera] = useState(false)
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

  // Sincronizar preview com currentPhotoUrl quando mudar (importante para limpar entre cadastros)
  useEffect(() => {
    setPreview(currentPhotoUrl || null)
    // Limpar o input de arquivo quando a foto for limpa
    if (!currentPhotoUrl && fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    // IMPORTANTE: Resetar estado de upload quando a URL mudar (novo colaborador)
    if (!currentPhotoUrl) {
      setUploading(false)
    }
  }, [currentPhotoUrl])

  // Se não tiver userId, mostrar loading
  if (!userId) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("dashboard.colaboradores.form.photo_upload.label")}</Label>
        <p className="text-xs text-zinc-500">{t("dashboard.colaboradores.form.photo_upload.loading")}</p>
      </div>
    )
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // IMPORTANTE: Limpar estado anterior antes de novo upload
    if (uploading) {
      console.warn("Upload já em andamento, aguardando...")
      return
    }

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

    // Delay maior para garantir que conexões HTTP/2 anteriores foram fechadas
    // Isso evita problemas de ERR_HTTP2_PROTOCOL_ERROR em uploads consecutivos
    const timeSinceLastUpload = Date.now() - lastUploadTime
    const delayNeeded = timeSinceLastUpload < 5000 ? 2000 : 1000 // 2s se upload recente, 1s caso contrário
    await new Promise(resolve => setTimeout(resolve, delayNeeded))

    // Upload para Supabase Storage
    await uploadPhoto(file)
  }

  const handleCameraCapture = async (file: File) => {
    // Verificar se o bucket existe antes de continuar
    if (bucketExists === false) {
      alert(
        "Bucket 'colaboradores-fotos' não encontrado no Supabase Storage.\n\n" +
        "Por favor, crie o bucket primeiro seguindo as instruções exibidas acima."
      )
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
    // Criar uma nova instância do cliente Supabase para cada upload
    // Isso evita problemas de conexão HTTP/2 reutilizada
    const freshSupabase = createClientComponentClient()

    try {
      setUploading(true)

      // Verificar se o usuário está autenticado
      const { data: { user: currentUser }, error: authError } = await freshSupabase.auth.getUser()

      if (authError || !currentUser) {
        throw new Error("Você precisa estar autenticado para fazer upload de fotos. Por favor, faça login novamente.")
      }

      // Verificar se o userId do componente corresponde ao usuário autenticado
      if (currentUser.id !== userId) {
        throw new Error("Erro de autenticação: ID do usuário não corresponde.")
      }

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
        setUploading(false) // IMPORTANTE: Resetar estado antes de retornar
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

      // Verificar se as variáveis de ambiente estão configuradas
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          "Configuração do Supabase não encontrada. " +
          "Verifique se NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estão configuradas."
        )
      }

      // Função helper para timeout (definida antes do try para estar acessível em todos os escopos)
      const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error("Upload timeout: A operação demorou muito tempo")), timeoutMs)
          ),
        ])
      }

      // Tentar upload direto primeiro, se falhar por CORS, usar API route
      let publicUrl: string | null = null

      // Estratégia: Se houve upload recente (dentro de 5s), usar API route diretamente
      // para evitar problemas de HTTP2_PROTOCOL_ERROR. Caso contrário, tentar upload direto primeiro.
      const timeSinceLastUpload = Date.now() - lastUploadTime
      const useApiRouteFirst = timeSinceLastUpload < 5000

      if (useApiRouteFirst) {
        console.log("Usando API route diretamente (upload recente detectado)...")
        try {
          const formData = new FormData()
          formData.append("file", file)
          if (colaboradorId) {
            formData.append("colaboradorId", colaboradorId)
          }
          formData.append("userId", userId)

          const fetchPromise = fetch("/api/upload-photo", {
            method: "POST",
            body: formData,
            cache: "no-store",
          })

          const response = await withTimeout(fetchPromise, 60000)

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || "Erro ao fazer upload via API")
          }

          const data = await response.json()
          publicUrl = data.url
          console.log("Upload via API route concluído com sucesso!", { publicUrl })
          setLastUploadTime(Date.now())
        } catch (apiError: any) {
          console.log("API route falhou, tentando upload direto como fallback...", apiError.message)
          throw new Error("API_ROUTE_FAILED")
        }
      } else {
        // Tentar upload direto primeiro
        console.log("Iniciando upload direto da foto...", { filePath, fileName })

        try {
          // Upload direto para Supabase Storage (com timeout de 60 segundos - mais generoso)
          // Usar freshSupabase para evitar problemas de conexão HTTP/2 reutilizada
          const uploadPromise = freshSupabase.storage
            .from("colaboradores-fotos")
            .upload(filePath, file, {
              cacheControl: "3600",
              upsert: true, // Permite sobrescrever se já existir
            })

          const { error: uploadError, data } = await withTimeout(uploadPromise, 60000)

          if (uploadError) {
            // Se o bucket não existir, atualizar estado e mostrar erro
            const errorMsg = (uploadError as any)?.message?.toLowerCase() || String(uploadError).toLowerCase() || ""
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
              setUploading(false)
              alert(
                "Bucket 'colaboradores-fotos' não encontrado.\n\n" +
                "Por favor, crie o bucket no Supabase Dashboard e execute a migration SQL."
              )
              return
            }

            // Erro de permissão
            if (
              errorMsg.includes("permission") ||
              errorMsg.includes("policy") ||
              errorMsg.includes("row-level security") ||
              errorMsg.includes("rls")
            ) {
              throw new Error(
                "Erro de permissão ao fazer upload. " +
                "Verifique se as políticas RLS do Storage estão configuradas corretamente. " +
                "Consulte SETUP_STORAGE.md para mais informações."
              )
            }

            // Se for erro de HTTP2, CORS ou network, tentar via API route
            const errorMessage = (uploadError as any)?.message || String(uploadError) || ""
            if (
              errorMsg.includes("http2") ||
              errorMsg.includes("protocol_error") ||
              errorMsg.includes("cors") ||
              errorMsg.includes("cross-origin") ||
              errorMsg.includes("network") ||
              errorMsg.includes("fetch") ||
              errorMessage.includes("Failed to fetch") ||
              errorMessage.includes("ERR_HTTP2_PROTOCOL_ERROR")
            ) {
              console.log("Erro HTTP2/CORS detectado, tentando upload via API route...")
              throw new Error("HTTP2_ERROR") // Marca para tentar via API
            }

            // Outros erros
            throw uploadError
          }

          // Obter URL pública
          const {
            data: { publicUrl: url },
          } = freshSupabase.storage.from("colaboradores-fotos").getPublicUrl(filePath)
          publicUrl = url
          console.log("Upload direto concluído com sucesso!", { publicUrl, filePath })
          setLastUploadTime(Date.now())
        } catch (directUploadError: any) {
          // Se falhou por HTTP2, CORS, timeout ou API route falhou, tentar via API route
          const shouldTryApiRoute =
            directUploadError.message === "HTTP2_ERROR" ||
            directUploadError.message === "API_ROUTE_FAILED" ||
            directUploadError.message?.includes("Failed to fetch") ||
            directUploadError.message?.includes("timeout") ||
            directUploadError.message?.includes("HTTP2") ||
            directUploadError.message?.includes("protocol_error") ||
            directUploadError.message?.includes("CORS") ||
            directUploadError.name === "TypeError"

          if (shouldTryApiRoute) {
            try {
              console.log("Fazendo upload via API route (fallback)...")

              const formData = new FormData()
              formData.append("file", file)
              if (colaboradorId) {
                formData.append("colaboradorId", colaboradorId)
              }
              formData.append("userId", userId)

              // Upload via API route com timeout maior (60s)
              const fetchPromise = fetch("/api/upload-photo", {
                method: "POST",
                body: formData,
                cache: "no-store",
              })

              const response = await withTimeout(fetchPromise, 60000)

              if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Erro ao fazer upload via API")
              }

              const data = await response.json()
              publicUrl = data.url
              console.log("Upload via API route concluído com sucesso!", { publicUrl })
              setLastUploadTime(Date.now())
            } catch (apiError: any) {
              // Se ambos os métodos falharam, lançar erro
              throw new Error(
                "Erro ao fazer upload (tentativas via direto e API falharam): " +
                (directUploadError.message || apiError?.message || "Erro desconhecido") +
                "\n\nVerifique:\n" +
                "1. Se o bucket 'colaboradores-fotos' existe no Supabase\n" +
                "2. Se as políticas RLS estão configuradas (execute a migration SQL)\n" +
                "3. Se você está autenticado\n" +
                "4. Sua conexão de internet"
              )
            }
          } else {
            throw directUploadError
          }
        }
      }

      if (!publicUrl) {
        throw new Error("Não foi possível obter a URL da imagem")
      }

      console.log("Chamando callback onPhotoUploaded com URL:", publicUrl)
      onPhotoUploaded(publicUrl)
      console.log("Callback executado com sucesso")
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error)

      // Melhorar mensagem de erro baseado no tipo
      let errorMessage = "Erro desconhecido ao fazer upload da foto."

      if (error.message?.includes("timeout") || error.message?.includes("Timeout")) {
        errorMessage =
          "Upload timeout: A operação demorou muito tempo.\n\n" +
          "Possíveis causas:\n" +
          "1. Conexão de internet lenta\n" +
          "2. Arquivo muito grande (tente uma imagem menor)\n" +
          "3. Problema no servidor\n\n" +
          "Tente novamente com uma imagem menor ou verifique sua conexão."
      } else if (error.message) {
        errorMessage = error.message
      } else if (error.name === "TypeError" && error.message?.includes("fetch")) {
        errorMessage =
          "Erro de conexão (Failed to fetch). " +
          "Possíveis causas:\n" +
          "1. CORS não configurado no Supabase (Settings > API > Allowed CORS origins)\n" +
          "2. Bucket não existe ou não está público\n" +
          "3. Problema de rede ou firewall\n" +
          "4. Variáveis de ambiente não configuradas corretamente"
      }

      alert(`Erro ao fazer upload da foto: ${errorMessage}`)
      setPreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } finally {
      // SEMPRE resetar o estado, mesmo se houver erro
      setUploading(false)
      console.log("Estado de upload resetado")
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
      <Label className="text-sm font-medium">{t("dashboard.colaboradores.form.photo_upload.label")}</Label>

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
              sizes="96px"
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
              {uploading ? t("dashboard.colaboradores.form.photo_upload.uploading") : preview ? t("dashboard.colaboradores.form.photo_upload.change") : t("dashboard.colaboradores.form.photo_upload.upload")}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCamera(true)}
              disabled={uploading || bucketExists === false || verifying}
            >
              <Camera className="h-4 w-4 mr-2" />
              {t("dashboard.colaboradores.form.photo_upload.camera")}
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
                {t("dashboard.colaboradores.form.photo_upload.remove")}
              </Button>
            )}
          </div>
          <p className="text-xs text-zinc-500">
            {t("dashboard.colaboradores.form.photo_upload.help_text")}
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

      <CameraCaptureModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  )
}
