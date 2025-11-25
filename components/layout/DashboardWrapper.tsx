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
} from "lucide-react"
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar"
import { motion } from "framer-motion"
import Link from "next/link"
import { useEffect } from "react"

export default function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [open, setOpen] = useState(false)

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
      label: "Colaboradores",
      href: "/dashboard/colaboradores",
      icon: (
        <Users className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Ferramentas",
      href: "/dashboard/ferramentas",
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
    {
      label: "Movimentações",
      href: "/dashboard/movimentacoes",
      icon: (
        <Package className="h-5 w-5 flex-shrink-0" />
      ),
    },
  ]

  return (
    <Sidebar open={open} setOpen={setOpen}>
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
        <div className="pt-4 border-t border-border">
          <SidebarLink
            link={{
              label: "Sair",
              href: "#",
              icon: (
                <LogOut className="h-5 w-5 flex-shrink-0" />
              ),
            }}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.preventDefault()
              handleLogout()
            }}
          />
        </div>
      </SidebarBody>
      <DynamicMainContent>{children}</DynamicMainContent>
    </Sidebar>
  )
}

function DynamicMainContent({ children }: { children: React.ReactNode }) {
  const { open, animate } = useSidebar()
  const [width, setWidth] = useState(280)

  useEffect(() => {
    if (animate) {
      setWidth(open ? 280 : 80)
    } else {
      setWidth(280)
    }
  }, [open, animate])

  return (
    <main
      className="transition-all duration-300 bg-white min-h-screen"
      style={{
        marginLeft: `clamp(0px, ${width}px, 100%)`,
      }}
    >
      <div className="p-4 sm:p-5 lg:p-6 xl:p-7 2xl:p-8 max-w-[1920px] mx-auto bg-white">
        {children}
      </div>
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
