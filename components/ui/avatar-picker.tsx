"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { createClientComponentClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Pencil, X } from "lucide-react"

interface Avatar {
  id: number
  svg: React.ReactNode
  alt: string
}

const avatars: Avatar[] = [
  {
    id: 1,
    svg: (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
        width="40"
        height="40"
        aria-label="Avatar 1"
      >
        <mask
          id=":r111:"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="36"
          height="36"
        >
          <rect width="36" height="36" rx="72" fill="#FFFFFF" />
        </mask>
        <g mask="url(#:r111:)">
          <rect width="36" height="36" fill="#ff005b" />
          <rect
            x="0"
            y="0"
            width="36"
            height="36"
            transform="translate(9 -5) rotate(219 18 18) scale(1)"
            fill="#ffb238"
            rx="6"
          />
          <g transform="translate(4.5 -4) rotate(9 18 18)">
            <path
              d="M15 19c2 1 4 1 6 0"
              stroke="#000000"
              fill="none"
              strokeLinecap="round"
            />
            <rect
              x="10"
              y="14"
              width="1.5"
              height="2"
              rx="1"
              stroke="none"
              fill="#000000"
            />
            <rect
              x="24"
              y="14"
              width="1.5"
              height="2"
              rx="1"
              stroke="none"
              fill="#000000"
            />
          </g>
        </g>
      </svg>
    ),
    alt: "Avatar 1",
  },
  {
    id: 2,
    svg: (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
        width="40"
        height="40"
      >
        <mask
          id=":R4mrttb:"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="36"
          height="36"
        >
          <rect width="36" height="36" rx="72" fill="#FFFFFF"></rect>
        </mask>
        <g mask="url(#:R4mrttb:)">
          <rect width="36" height="36" fill="#ff7d10"></rect>
          <rect
            x="0"
            y="0"
            width="36"
            height="36"
            transform="translate(5 -1) rotate(55 18 18) scale(1.1)"
            fill="#0a0310"
            rx="6"
          />
          <g transform="translate(7 -6) rotate(-5 18 18)">
            <path
              d="M15 20c2 1 4 1 6 0"
              stroke="#FFFFFF"
              fill="none"
              strokeLinecap="round"
            />
            <rect
              x="14"
              y="14"
              width="1.5"
              height="2"
              rx="1"
              stroke="none"
              fill="#FFFFFF"
            />
            <rect
              x="20"
              y="14"
              width="1.5"
              height="2"
              rx="1"
              stroke="none"
              fill="#FFFFFF"
            />
          </g>
        </g>
      </svg>
    ),
    alt: "Avatar 4",
  },
  {
    id: 3,
    svg: (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
        width="40"
        height="40"
      >
        <mask
          id=":r11c:"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="36"
          height="36"
        >
          <rect width="36" height="36" rx="72" fill="#FFFFFF"></rect>
        </mask>
        <g mask="url(#:r11c:)">
          <rect width="36" height="36" fill="#0a0310" />
          <rect
            x="0"
            y="0"
            width="36"
            height="36"
            transform="translate(-3 7) rotate(227 18 18) scale(1.2)"
            fill="#ff005b"
            rx="36"
          />
          <g transform="translate(-3 3.5) rotate(7 18 18)">
            <path d="M13,21 a1,0.75 0 0,0 10,0" fill="#FFFFFF" />
            <rect
              x="12"
              y="14"
              width="1.5"
              height="2"
              rx="1"
              stroke="none"
              fill="#FFFFFF"
            />
            <rect
              x="22"
              y="14"
              width="1.5"
              height="2"
              rx="1"
              stroke="none"
              fill="#FFFFFF"
            />
          </g>
        </g>
      </svg>
    ),
    alt: "Avatar 2",
  },
  {
    id: 4,
    svg: (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
        width="40"
        height="40"
      >
        <mask
          id=":r1gg:"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="36"
          height="36"
        >
          <rect width="36" height="36" rx="72" fill="#FFFFFF"></rect>
        </mask>
        <g mask="url(#:r1gg:)">
          <rect width="36" height="36" fill="#d8fcb3"></rect>
          <rect
            x="0"
            y="0"
            width="36"
            height="36"
            transform="translate(9 -5) rotate(219 18 18) scale(1)"
            fill="#89fcb3"
            rx="6"
          ></rect>
          <g transform="translate(4.5 -4) rotate(9 18 18)">
            <path
              d="M15 19c2 1 4 1 6 0"
              stroke="#000000"
              fill="none"
              strokeLinecap="round"
            ></path>
            <rect
              x="10"
              y="14"
              width="1.5"
              height="2"
              rx="1"
              stroke="none"
              fill="#000000"
            ></rect>
            <rect
              x="24"
              y="14"
              width="1.5"
              height="2"
              rx="1"
              stroke="none"
              fill="#000000"
            ></rect>
          </g>
        </g>
      </svg>
    ),
    alt: "Avatar 3",
  },
]

// Add these animation variants at the top level
const mainAvatarVariants = {
  initial: {
    y: 20,
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 20,
    } as const,
  },
  exit: {
    y: -20,
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
} as const

const pickerVariants = {
  container: {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  },
  item: {
    initial: {
      y: 20,
      opacity: 0,
    },
    animate: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 20,
      } as const,
    },
  },
} as const

const selectedVariants = {
  initial: {
    opacity: 0,
    rotate: -180,
  },
  animate: {
    opacity: 1,
    rotate: 0,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 15,
    } as const,
  },
  exit: {
    opacity: 0,
    rotate: 180,
    transition: {
      duration: 0.2,
    },
  },
} as const

interface AvatarPickerProps {
  onSaveSuccess?: () => void
}

export function AvatarPicker({ onSaveSuccess }: AvatarPickerProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar>(avatars[0])
  const [rotationCount, setRotationCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const supabase = createClientComponentClient()
  const router = useRouter()

  // Dados da empresa
  const [companyName, setCompanyName] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [companyEmail, setCompanyEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [userEmail, setUserEmail] = useState("")

  // Dados originais para cancelar edição
  const [originalData, setOriginalData] = useState({
    companyName: "",
    cnpj: "",
    companyEmail: "",
    phone: "",
  })

  // Carregar dados do perfil
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserEmail(user.email || "")

        // Tentar carregar todos os campos, mas se alguns não existirem, não dar erro
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_id, name")
          .eq("id", user.id)
          .single()

        if (profile) {
          // Carregar avatar
          if (profile.avatar_id) {
            const savedAvatar = avatars.find(a => a.id === profile.avatar_id)
            if (savedAvatar) {
              setSelectedAvatar(savedAvatar)
            }
          }
        }

        // Tentar carregar campos da empresa (pode falhar se as colunas não existirem)
        try {
          const { data: companyData } = await supabase
            .from("profiles")
            .select("company_name, cnpj, company_email, phone")
            .eq("id", user.id)
            .single()

          if (companyData) {
            const data = {
              companyName: companyData.company_name || "",
              cnpj: companyData.cnpj || "",
              companyEmail: companyData.company_email || user.email || "",
              phone: companyData.phone || "",
            }
            setCompanyName(data.companyName)
            setCnpj(data.cnpj)
            setCompanyEmail(data.companyEmail)
            setPhone(data.phone)
            setOriginalData({
              companyName: data.companyName,
              cnpj: data.cnpj,
              companyEmail: data.companyEmail || user.email || "",
              phone: data.phone,
            })
            const hasData = data.companyName || data.cnpj || data.companyEmail || data.phone
            setIsEditing(!hasData)
          } else {
            setCompanyEmail(user.email || "")
            setIsEditing(true)
          }
        } catch (err) {
          // Se as colunas não existirem, apenas não carrega os dados (não é crítico)
          console.log("Campos da empresa ainda não foram criados. Execute a migration.")
          // Se não conseguir carregar, começar em modo de edição
          setIsEditing(true)
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error)
        setIsEditing(true)
      }
    }

    loadProfile()
  }, [supabase])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    // Restaurar dados originais
    setCompanyName(originalData.companyName)
    setCnpj(originalData.cnpj)
    setCompanyEmail(originalData.companyEmail || userEmail)
    setPhone(originalData.phone)
    setIsEditing(false)
  }

  const handleAvatarSelect = async (avatar: Avatar) => {
    setRotationCount((prev) => prev + 1080) // Add 3 rotations each time
    setSelectedAvatar(avatar)
    
    // Salvar avatar no banco de dados
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_id: avatar.id })
        .eq("id", user.id)

      if (error) {
        console.error("Erro ao salvar avatar:", error)
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error("Erro ao salvar avatar:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCompanyData = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("Usuário não autenticado. Faça login novamente.")
        return
      }

      // Preparar dados para atualização (apenas campos não vazios)
      const updateData: Record<string, string | null> = {}
      
      if (companyName.trim()) updateData.company_name = companyName.trim()
      else updateData.company_name = null
      
      if (cnpj.trim()) updateData.cnpj = cnpj.trim()
      else updateData.cnpj = null
      
      updateData.company_email = (user.email || companyEmail || "").trim() || null
      
      if (phone.trim()) updateData.phone = phone.trim()
      else updateData.phone = null

      const { error, data } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id)
        .select()

      if (error) {
        console.error("Erro ao salvar dados da empresa:", error)
        
        // Verificar se o erro é porque as colunas não existem
        if (error.message?.includes("column") && error.message?.includes("does not exist")) {
          alert(
            "Erro: As colunas da empresa não foram criadas no banco de dados.\n\n" +
            "Por favor, execute a migration 012_add_company_fields_to_profiles.sql no Supabase Dashboard:\n" +
            "1. Acesse o Supabase Dashboard\n" +
            "2. Vá em SQL Editor\n" +
            "3. Execute o arquivo supabase/migrations/012_add_company_fields_to_profiles.sql"
          )
        } else if (error.message?.includes("permission denied") || error.message?.includes("RLS")) {
          alert(
            "Erro de permissão. Verifique se as políticas RLS estão configuradas corretamente " +
            "para permitir que usuários atualizem seus próprios perfis."
          )
        } else {
          alert(`Erro ao salvar dados da empresa: ${error.message || "Erro desconhecido"}`)
        }
      } else {
        // Atualizar dados originais após salvar
        setOriginalData({
          companyName: companyName.trim(),
          cnpj: cnpj.trim(),
          companyEmail: (user.email || companyEmail || "").trim(),
          phone: phone.trim(),
        })
        setIsEditing(false) // Sair do modo de edição
        router.refresh()
        // Fechar o modal automaticamente após salvar com sucesso
        // Usar setTimeout para dar tempo do refresh acontecer
        setTimeout(() => {
          if (onSaveSuccess) {
            onSaveSuccess()
          }
        }, 100)
      }
    } catch (error: any) {
      console.error("Erro ao salvar dados da empresa:", error)
      const errorMessage = error?.message || "Erro desconhecido"
      alert(`Erro ao salvar dados da empresa: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  // Verificar se há dados salvos
  const hasCompanyData = companyName || cnpj || companyEmail || phone

  return (
    <motion.div initial="initial" animate="animate" className="w-full">
      <Card className="w-full max-w-md md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto overflow-hidden bg-gradient-to-b from-background to-muted/30 md:shadow-lg">
        <CardContent className="p-0">
          {/* Header com botão Editar */}
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{
                opacity: 1,
                height: "8rem",
                transition: {
                  height: {
                    type: "spring",
                    stiffness: 100,
                    damping: 20,
                  },
                },
              }}
              className="bg-gradient-to-r from-primary/20 to-primary/10 w-full"
            />
            {/* Botão Editar no canto superior direito */}
            {hasCompanyData && !isEditing && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleEdit}
                className="absolute top-4 right-4 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background border border-border shadow-sm transition-colors z-10"
                aria-label="Editar dados da empresa"
                title="Editar dados da empresa"
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </motion.button>
            )}
          </div>

          <div className="px-4 md:px-8 pb-8 -mt-16">
            {/* Seção Avatar - Centralizada */}
            <div className="flex flex-col items-center">
              {/* Main avatar display */}
              <motion.div
                className="relative w-40 h-40 rounded-full overflow-hidden border-4 bg-background flex items-center justify-center"
                variants={mainAvatarVariants}
                layoutId="selectedAvatar"
              >
                <motion.div
                  className="w-full h-full flex items-center justify-center scale-[3]"
                  animate={{
                    rotate: rotationCount,
                  }}
                  transition={{
                    duration: 0.8,
                    ease: [0.4, 0, 0.2, 1], // Custom easing for a nice acceleration and deceleration
                  }}
                >
                  {selectedAvatar.svg}
                </motion.div>
              </motion.div>

              {/* Username display */}
              <motion.div
                className="text-center mt-4"
                variants={pickerVariants.item}
              >
                <motion.h2
                  className="text-2xl font-bold"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Me
                </motion.h2>
                <motion.p
                  className="text-muted-foreground text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Select your avatar
                </motion.p>
              </motion.div>

              {/* Avatar selection */}
              <motion.div
                className="mt-6"
                variants={pickerVariants.container}
              >
                <motion.div
                  className="flex justify-center gap-4"
                  variants={pickerVariants.container}
                >
                  {avatars.map((avatar) => (
                    <motion.button
                      key={avatar.id}
                      onClick={() => handleAvatarSelect(avatar)}
                      disabled={loading}
                      className={cn(
                        "relative w-12 h-12 rounded-full overflow-hidden border-2",
                        "transition-all duration-300",
                        loading && "opacity-50 cursor-not-allowed"
                      )}
                      variants={pickerVariants.item}
                      whileHover={{
                        y: -2,
                        transition: { duration: 0.2 },
                      }}
                      whileTap={{
                        y: 0,
                        transition: { duration: 0.2 },
                      }}
                      aria-label={`Select ${avatar.alt}`}
                      aria-pressed={selectedAvatar.id === avatar.id}
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        {avatar.svg}
                      </div>
                      {selectedAvatar.id === avatar.id && (
                        <motion.div
                          className="absolute inset-0 bg-primary/20 ring-2 ring-primary ring-offset-2 ring-offset-background rounded-full"
                          variants={selectedVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          layoutId="selectedIndicator"
                        />
                      )}
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            </div>

            {/* Separator */}
            <Separator className="my-8" />

            {/* Company Data Form - Embaixo */}
            <motion.div
              className="space-y-4"
              variants={pickerVariants.container}
            >
              <div className="flex items-center justify-between">
                <motion.h3
                  className="text-lg font-semibold"
                  variants={pickerVariants.item}
                >
                  Dados da Empresa
                </motion.h3>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    className="h-8"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                )}
              </div>

              <motion.div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0" variants={pickerVariants.container}>
                <motion.div variants={pickerVariants.item} className="md:col-span-2">
                  <Label htmlFor="company_name">Nome da Empresa</Label>
                  <Input
                    id="company_name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Digite o nome da empresa"
                    disabled={!isEditing}
                    className={cn(
                      "mt-1",
                      !isEditing && "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  />
                </motion.div>

                <motion.div variants={pickerVariants.item}>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    disabled={!isEditing}
                    className={cn(
                      "mt-1",
                      !isEditing && "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  />
                </motion.div>

                <motion.div variants={pickerVariants.item}>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    disabled={!isEditing}
                    className={cn(
                      "mt-1",
                      !isEditing && "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  />
                </motion.div>

                <motion.div variants={pickerVariants.item} className="md:col-span-2">
                  <Label htmlFor="company_email">Email da Empresa</Label>
                  <Input
                    id="company_email"
                    type="email"
                    value={companyEmail || userEmail}
                    readOnly
                    disabled
                    placeholder="empresa@exemplo.com"
                    className="mt-1 bg-muted text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Usamos o mesmo email da sua conta para as comunicações.
                  </p>
                </motion.div>

                {isEditing && (
                  <motion.div variants={pickerVariants.item} className="pt-2 md:col-span-2">
                    <Button
                      onClick={handleSaveCompanyData}
                      disabled={saving}
                      className="w-full"
                    >
                      {saving ? "Salvando..." : "Salvar Dados da Empresa"}
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
