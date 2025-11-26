"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import {
  LayoutDashboard,
  Users,
  Wrench,
  Hammer,
  Package,
  LogOut,
  User,
  Linkedin,
  Mail,
  Globe,
} from "lucide-react"
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { AvatarPicker } from "@/components/ui/avatar-picker"

export default function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const links = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: (
        <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Movimentações",
      href: "/dashboard/movimentacoes",
      icon: (
        <Package className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Colaboradores",
      href: "/dashboard/colaboradores",
      icon: (
        <Users className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Estoque",
      href: "/dashboard/estoque",
      icon: (
        <Wrench className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Consertos",
      href: "/dashboard/consertos",
      icon: (
        <Hammer className="h-5 w-5 flex-shrink-0" />
      ),
    },
  ]

  return (
    <Sidebar>
      <SidebarContent 
        links={links}
        pathname={pathname}
        onLogout={handleLogout}
        onProfileClick={() => setProfileDialogOpen(true)}
      />
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] md:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[calc(100vh-2rem)] md:max-h-[90vh] overflow-y-auto p-0 md:p-6 m-4 md:m-0 w-[calc(100vw-2rem)] md:w-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Perfil do Usuário</DialogTitle>
            <DialogDescription>
              Gerencie seu avatar e dados da empresa
            </DialogDescription>
          </DialogHeader>
          {profileDialogOpen && (
            <div className="p-4 md:p-0">
              <AvatarPicker 
                onSaveSuccess={() => setProfileDialogOpen(false)}
                key={profileDialogOpen ? "open" : "closed"}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
      <DynamicMainContent>{children}</DynamicMainContent>
    </Sidebar>
  )
}

function SidebarContent({ 
  links, 
  pathname, 
  onLogout, 
  onProfileClick 
}: { 
  links: Array<{ label: string; href: string; icon: React.ReactNode }>
  pathname: string
  onLogout: () => void
  onProfileClick: () => void
}) {
  const { open, animate, setOpen } = useSidebar()
  
  // Fechar menu mobile ao clicar em perfil
  const handleProfileClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setOpen(false)
    }
    onProfileClick()
  }

  return (
    <SidebarBody className="justify-between gap-8">
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mb-6">
          {open ? <Logo /> : <LogoIcon />}
        </div>
        <div className="flex flex-col gap-1">
          {links.map((link) => (
            <SidebarLink
              key={link.href}
              link={link}
              active={pathname === link.href}
            />
          ))}
        </div>
      </div>
      <div className="pt-3 md:pt-4 border-t border-border flex-shrink-0 px-0 md:px-0">
        <div className="flex gap-2 md:gap-1.5 w-full">
          <button
            type="button"
            onClick={handleProfileClick}
            className={cn(
              "flex items-center justify-center md:justify-start gap-2 md:gap-3 group/sidebar py-2 md:py-2.5 px-3 rounded-md transition-colors cursor-pointer min-h-[44px]",
              "text-muted-foreground hover:text-foreground hover:bg-accent",
              !open && "justify-center",
              open ? "flex-1" : "w-full"
            )}
          >
            <span className="flex-shrink-0">
              <User className="h-5 w-5 flex-shrink-0" />
            </span>
            <motion.span
              animate={{
                display: animate ? (open ? "inline-block" : "none") : "inline-block",
                opacity: animate ? (open ? 1 : 0) : 1,
                width: animate ? (open ? "auto" : 0) : "auto",
              }}
              transition={{ duration: 0.2 }}
              className="text-sm font-medium group-hover/sidebar:translate-x-1 transition duration-150 whitespace-nowrap overflow-hidden"
            >
              Perfil
            </motion.span>
          </button>
          <AnimatePresence>
            {open && (
              <motion.button
                type="button"
                onClick={onLogout}
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex items-center justify-center md:justify-start gap-2 md:gap-3 group/sidebar py-2 md:py-2.5 px-3 rounded-md transition-colors cursor-pointer min-h-[44px] flex-1",
                  "text-destructive hover:text-destructive hover:bg-destructive/10",
                  "overflow-hidden"
                )}
              >
                <span className="flex-shrink-0">
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                </span>
                <span className="text-sm font-medium group-hover/sidebar:translate-x-1 transition duration-150 whitespace-nowrap">
                  Sair
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SidebarBody>
  )
}

function DynamicMainContent({ children }: { children: React.ReactNode }) {
  const { open, animate } = useSidebar()
  const [width, setWidth] = useState(280)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (animate && !isMobile) {
      setWidth(open ? 280 : 80)
    } else {
      setWidth(isMobile ? 0 : 280)
    }
  }, [open, animate, isMobile])

  return (
    <main
      className="transition-all duration-300 bg-white min-h-screen flex flex-col"
      style={{
        marginLeft: isMobile ? "0" : `clamp(0px, ${width}px, 100%)`,
      }}
    >
      <div className="flex-1 p-3 md:p-4 lg:p-6 xl:p-7 2xl:p-8 max-w-[1920px] mx-auto bg-white w-full">
        {children}
      </div>
      <footer className="border-t border-zinc-200 bg-white py-4 mt-auto">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-5 lg:px-6 xl:px-7 2xl:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-600">
            <p className="text-center md:text-left">
              © {new Date().getFullYear()} Almox Fácil. Todos os direitos reservados.
            </p>
            <div className="flex items-center justify-center gap-4 md:gap-6">
              <a 
                href="mailto:suporte@almoxfacil.com.br"
                className="flex items-center gap-2 hover:text-primary transition-colors"
                title="Enviar email para suporte"
              >
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="hidden md:inline">suporte@almoxfacil.com.br</span>
                <span className="md:hidden text-xs">Suporte</span>
              </a>
              <a 
                href="https://www.linkedin.com/company/almoxfacil" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors flex-shrink-0"
                title="Visitar LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a 
                href="https://www.almoxfacil.alnog.com.br" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-primary transition-colors"
                title="Visitar website"
              >
                <Globe className="h-4 w-4 flex-shrink-0" />
                <span className="hidden md:inline">www.almoxfacil.alnog.com.br</span>
                <span className="md:hidden text-xs">Website</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}

const Logo = () => {
  return (
    <Link
      href="/dashboard"
      className="font-normal flex space-x-3 items-center text-sm text-foreground py-2 relative z-20"
    >
      <div className="h-7 w-8 bg-primary rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="font-semibold text-foreground whitespace-pre text-base"
      >
        Almox Fácil
      </motion.span>
    </Link>
  )
}

const LogoIcon = () => {
  return (
    <Link
      href="/dashboard"
      className="font-normal flex items-center justify-center text-sm text-foreground py-2 relative z-20 w-full"
    >
      <div className="h-7 w-8 bg-primary rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
    </Link>
  )
}
