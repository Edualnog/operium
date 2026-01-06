"use client"

import { usePathname, useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import {
  LayoutDashboard,
  User,
  Wrench,
  Hammer,
  Package,
  LogOut,
  Settings,
  ClipboardList,
  Truck,
  Users2,
  Briefcase,
  FileText,
  Volume2,
  VolumeX,
} from "lucide-react"
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { useSoundEffects } from "@/lib/hooks/useSoundEffects"

export default function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { open, animate } = useSidebar()
  const { t } = useTranslation('common')
  const { isEnabled: soundEnabled, toggleSound, playSound } = useSoundEffects()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const links = [
    {
      label: t('dashboard.sidebar.dashboard'),
      href: "/dashboard",
      icon: (
        <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: t('dashboard.sidebar.movements'),
      href: "/dashboard/movimentacoes",
      icon: (
        <Package className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: t('dashboard.sidebar.collaborators'),
      href: "/dashboard/colaboradores",
      icon: (
        <User className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Equipes",
      href: "/dashboard/equipes",
      icon: (
        <Users2 className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: t('dashboard.sidebar.stock'),
      href: "/dashboard/estoque",
      icon: (
        <Wrench className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: t('dashboard.sidebar.repairs'),
      href: "/dashboard/consertos",
      icon: (
        <Hammer className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Veículos",
      href: "/dashboard/veiculos",
      icon: (
        <Truck className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: t('dashboard.sidebar.inventory'),
      href: "/dashboard/inventario",
      icon: (
        <ClipboardList className="h-5 w-5 flex-shrink-0" />
      ),
    },
    // NOTA: "Operacional" foi removido do sidebar admin
    // Este painel é destinado apenas a colaboradores de campo via app mobile
    {
      label: "Relatórios",
      href: "/dashboard/relatorios",
      icon: (
        <FileText className="h-5 w-5 flex-shrink-0" />
      ),
    },
  ]

  return (
    <Sidebar>
      <SidebarBody className="justify-between gap-8">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mb-6">
            {open ? <Logo /> : <LogoIcon />}
          </div>
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <SidebarLink
                key={link.href}
                id={`sidebar-${link.href.split('/').pop() || 'dashboard'}`}
                link={link}
                active={
                  link.href === '/dashboard/equipes'
                    ? pathname?.startsWith('/dashboard/equipes')
                    : pathname === link.href
                }
              />
            ))}
          </div>
        </div>
        <div className="pt-4 border-t border-border flex-shrink-0">
          <div className="flex gap-1.5 w-full items-center">
            <div className={cn("flex-shrink-0 flex items-center gap-1", !open && "hidden")}>
              <LanguageSwitcher />
              <button
                type="button"
                onClick={() => {
                  toggleSound()
                  if (!soundEnabled) {
                    // Tocar um som de preview ao ativar
                    setTimeout(() => playSound('click'), 100)
                  }
                }}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  soundEnabled
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground hover:bg-accent"
                )}
                title={soundEnabled ? "Desativar sons" : "Ativar sons"}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </button>
            </div>
            <Link
              id="sidebar-conta"
              href="/dashboard/conta"
              className={cn(
                "flex items-center justify-start gap-3 group/sidebar py-2.5 px-3 rounded-md transition-colors cursor-pointer min-h-[44px] flex-1",
                pathname === "/dashboard/conta"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
                !open && "justify-center"
              )}
            >
              <span className="flex-shrink-0">
                <Settings className="h-5 w-5 flex-shrink-0" />
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
                {t('dashboard.sidebar.account')}
              </motion.span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                "flex items-center justify-start gap-3 group/sidebar py-2.5 px-3 rounded-md transition-colors cursor-pointer min-h-[44px] flex-1",
                "text-destructive hover:text-destructive hover:bg-destructive/10",
                !open && "justify-center"
              )}
            >
              <span className="flex-shrink-0">
                <LogOut className="h-5 w-5 flex-shrink-0" />
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
                {t('dashboard.sidebar.logout')}
              </motion.span>
            </button>
          </div>
        </div>
      </SidebarBody>
    </Sidebar>
  )
}

const Logo = () => {
  return (
    <Link
      href="/dashboard"
      className="font-normal flex items-center gap-3 text-sm text-foreground py-2 relative z-20"
    >
      {/* Operium Icon - Geometric brackets */}
      <svg width="32" height="32" viewBox="0 0 100 100" fill="none" className="flex-shrink-0">
        {/* Top left vertical bar */}
        <rect x="10" y="10" width="15" height="40" fill="currentColor" />
        {/* Top horizontal bar */}
        <rect x="10" y="10" width="40" height="15" fill="currentColor" />
        {/* Bottom horizontal bar */}
        <rect x="50" y="75" width="40" height="15" fill="currentColor" />
        {/* Bottom right vertical bar */}
        <rect x="75" y="50" width="15" height="40" fill="currentColor" />
      </svg>
      <span className="font-semibold text-foreground text-lg tracking-wider">
        OPERIUM
      </span>
    </Link>
  )
}

const LogoIcon = () => {
  return (
    <Link
      href="/dashboard"
      className="font-normal flex items-center justify-center text-sm text-foreground py-2 relative z-20 w-full"
    >
      {/* Operium Icon - Geometric brackets */}
      <svg width="40" height="40" viewBox="0 0 100 100" fill="none" className="flex-shrink-0">
        {/* Top left vertical bar */}
        <rect x="10" y="10" width="15" height="40" fill="currentColor" />
        {/* Top horizontal bar */}
        <rect x="10" y="10" width="40" height="15" fill="currentColor" />
        {/* Bottom horizontal bar */}
        <rect x="50" y="75" width="40" height="15" fill="currentColor" />
        {/* Bottom right vertical bar */}
        <rect x="75" y="50" width="15" height="40" fill="currentColor" />
      </svg>
    </Link>
  )
}
