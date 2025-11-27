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
} from "lucide-react"
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar"
import { motion } from "framer-motion"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { open, animate } = useSidebar()

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
        <div className="pt-4 border-t border-border flex-shrink-0">
          <div className="flex gap-1.5 w-full">
            <Link
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
                Conta
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
                Sair
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
