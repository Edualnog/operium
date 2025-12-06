"use client"

import { usePathname, useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import {
  LayoutDashboard,
  Users,
  Wrench,
  Hammer,
  Package,
  LogOut,
  Settings,
  ClipboardList,
} from "lucide-react"
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar"
import { motion } from "framer-motion"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

export default function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { open, animate } = useSidebar()
  const { t } = useTranslation('common')

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
        <Users className="h-5 w-5 flex-shrink-0" />
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
      label: t('dashboard.sidebar.inventory'),
      href: "/dashboard/inventario",
      icon: (
        <ClipboardList className="h-5 w-5 flex-shrink-0" />
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
                active={pathname === link.href}
              />
            ))}
          </div>
        </div>
        <div className="pt-4 border-t border-border flex-shrink-0">
          <div className="flex gap-1.5 w-full items-center">
            <div className={cn("flex-shrink-0", !open && "hidden")}>
              <LanguageSwitcher />
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
      className="font-normal flex space-x-3 items-center text-sm text-foreground py-2 relative z-20"
    >
      <div className="h-8 w-8 bg-[#4B6BFB] rounded-lg flex-shrink-0 p-1">
        <svg className="w-full h-full" viewBox="0 0 500 500" fill="none">
          <path d="M250 100 L380 175 L250 250 L120 175 Z" stroke="white" strokeWidth="32" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M120 235 L250 310 L380 235" stroke="white" strokeWidth="32" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M120 295 L250 370 L380 295" stroke="white" strokeWidth="32" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
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
      <div className="h-8 w-8 bg-[#4B6BFB] rounded-lg flex-shrink-0 p-1">
        <svg className="w-full h-full" viewBox="0 0 500 500" fill="none">
          <path d="M250 100 L380 175 L250 250 L120 175 Z" stroke="white" strokeWidth="32" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M120 235 L250 310 L380 235" stroke="white" strokeWidth="32" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M120 295 L250 370 L380 295" stroke="white" strokeWidth="32" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
    </Link>
  )
}
