"use client"

import { useState, useEffect } from "react"
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
  Mail,
  PlayCircle,
} from "lucide-react"

// Ícones SVG elegantes para redes sociais
const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
)

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()

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
      />
      <DynamicMainContent>{children}</DynamicMainContent>
    </Sidebar>
  )
}

function SidebarContent({ 
  links, 
  pathname, 
  onLogout,
}: { 
  links: Array<{ label: string; href: string; icon: React.ReactNode }>
  pathname: string
  onLogout: () => void
}) {
  const { open, animate, setOpen } = useSidebar()
  
  // Fechar menu mobile ao navegar
  const handleNavigation = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setOpen(false)
    }
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
          <Link
            href="/dashboard/conta"
            onClick={handleNavigation}
            className={cn(
              "flex items-center justify-center md:justify-start gap-2 md:gap-3 group/sidebar py-2 md:py-2.5 px-3 rounded-md transition-colors cursor-pointer min-h-[44px]",
              pathname === "/dashboard/conta"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
              !open && "justify-center",
              open ? "flex-1" : "w-full"
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
            <div className="flex items-center justify-center gap-3">
              <a 
                href="mailto:suporte@alnog.com.br"
                className="p-2 rounded-full bg-zinc-100 text-zinc-500 hover:bg-blue-100 hover:text-blue-600 transition-all"
                title="Suporte por email"
              >
                <Mail className="h-4 w-4" />
              </a>
              <a 
                href="https://www.youtube.com/@almoxfacil" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-zinc-100 text-zinc-500 hover:bg-red-100 hover:text-red-500 transition-all"
                title="YouTube - Tutoriais"
              >
                <YouTubeIcon className="h-4 w-4" />
              </a>
              <a 
                href="https://www.instagram.com/almoxfacil" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-zinc-100 text-zinc-500 hover:bg-pink-100 hover:text-pink-500 transition-all"
                title="Instagram"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
              <a 
                href="https://www.linkedin.com/company/almoxfacil" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-zinc-100 text-zinc-500 hover:bg-blue-100 hover:text-blue-600 transition-all"
                title="LinkedIn"
              >
                <LinkedInIcon className="h-4 w-4" />
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
