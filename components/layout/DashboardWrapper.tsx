"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import { useTranslation } from "react-i18next"
import {
  LayoutDashboard,
  User,
  Wrench,
  Hammer,
  Package,
  LogOut,
  Settings,
  Mail,
  PlayCircle,
  ClipboardList,
  Truck,
  Users2,
  UserPlus,
  FileText,
} from "lucide-react"
import NotificationBell from "@/components/notifications/NotificationBell"
import Image from "next/image"

// Ícones SVG elegantes para redes sociais
const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
)

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
)
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { cn } from "@/lib/utils"

import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { useOperiumProfile } from "@/lib/hooks/useOperiumProfile"

export default function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [userId, setUserId] = useState<string | null>(null)

  // Operium Role Check
  const { profile } = useOperiumProfile()

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled && user) setUserId(user.id)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // CRITICAL: Detect invite flow from URL hash (Implicit Flow)
  // Supabase invites use #access_token=...&type=invite
  // NOTE: Removed invite detection redirect to /criar-senha (page deleted)
  // All auth flows now handled by /auth/callback

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const { t } = useTranslation('common')

  const links = [
    {
      label: t('dashboard.sidebar.dashboard'),
      href: "/dashboard",
      id: "sidebar-dashboard",
      icon: (
        <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: t('dashboard.sidebar.movements'),
      href: "/dashboard/movimentacoes",
      id: "sidebar-movimentacoes",
      icon: (
        <Package className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: t('dashboard.sidebar.collaborators'),
      href: "/dashboard/colaboradores",
      id: "sidebar-colaboradores",
      icon: (
        <User className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: t('dashboard.sidebar.teams'),
      href: "/dashboard/equipes",
      id: "sidebar-equipes",
      icon: (
        <Users2 className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: t('dashboard.sidebar.reports'),
      href: "/dashboard/relatorios",
      id: "sidebar-relatorios",
      icon: (
        <FileText className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: t('dashboard.sidebar.stock'),
      href: "/dashboard/estoque",
      id: "sidebar-estoque",
      icon: (
        <Wrench className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: t('dashboard.sidebar.repairs'),
      href: "/dashboard/consertos",
      id: "sidebar-consertos",
      icon: (
        <Hammer className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: t('dashboard.sidebar.vehicles'),
      href: "/dashboard/veiculos",
      id: "sidebar-veiculos",
      icon: (
        <Truck className="h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: t('dashboard.sidebar.inventory'),
      href: "/dashboard/inventario",
      id: "sidebar-inventario",
      icon: (
        <ClipboardList className="h-5 w-5 flex-shrink-0" />
      ),
    },
    // NOTA: "Operacional" removido do sidebar admin
    // Este painel é destinado apenas a colaboradores de campo via app mobile
    {
      label: t('dashboard.sidebar.access'),
      href: "/dashboard/acessos",
      id: "sidebar-acessos",
      icon: (
        <UserPlus className="h-5 w-5 flex-shrink-0" />
      ),
    },
  ]

  // Filter links for Operium Collaborators (FIELD / WAREHOUSE)
  // They should ONLY see the "Operacional" dashboard (and Account settings via sidebar footer)
  const isCollaborator = profile?.role === 'FIELD' || profile?.role === 'WAREHOUSE'

  const displayedLinks = isCollaborator
    ? [{
      label: "Operacional",
      href: "/dashboard/operium",
      id: "sidebar-operium",
      icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
    }]
    : links

  return (
    <Sidebar>
      <SidebarContent
        links={displayedLinks}
        pathname={pathname}
        onLogout={handleLogout}
      />
      <DynamicMainContent userId={userId}>{children}</DynamicMainContent>
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
  const { t } = useTranslation('common')
  const { open, animate, setOpen } = useSidebar()

  // Fechar menu mobile ao navegar
  const handleNavigation = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setOpen(false)
    }
  }

  return (
    <SidebarBody className="justify-between gap-6 md:gap-8">
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        {/* Logo - hidden on mobile (shown in header bar) */}
        <div className="mb-6 hidden md:block">
          {open ? <Logo /> : <LogoIcon />}
        </div>
        <div className="flex flex-col gap-1.5 md:gap-1">
          {links.map((link) => (
            <SidebarLink
              key={link.href}
              link={link}
              active={pathname === link.href}
              id={(link as any).id}
            />
          ))}
        </div>
      </div>
      <div className="pt-4 md:pt-4 border-t border-zinc-200 dark:border-zinc-700 flex-shrink-0">
        {/* Mobile: Stack buttons vertically */}
        <div className="flex flex-col md:flex-row gap-2 md:gap-1.5 w-full">
          <Link
            href="/dashboard/conta"
            onClick={handleNavigation}
            className={cn(
              "flex items-center justify-start gap-3 group/sidebar rounded-lg md:rounded-md transition-colors cursor-pointer touch-manipulation",
              "py-3.5 px-4 min-h-[52px] md:py-2.5 md:px-3 md:min-h-[44px]",
              pathname === "/dashboard/conta"
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50 font-medium"
                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900",
              !open && "md:justify-center",
              open ? "md:flex-1" : "w-full"
            )}
            id="sidebar-conta"
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
              className="text-base md:text-sm font-medium group-hover/sidebar:translate-x-1 transition duration-150 whitespace-nowrap overflow-hidden"
            >
              {t('dashboard.sidebar.account')}
            </motion.span>
          </Link>
          {/* Mobile: Always show logout button */}
          <button
            type="button"
            onClick={() => {
              handleNavigation()
              onLogout()
            }}
            className={cn(
              "flex md:hidden items-center justify-start gap-3 group/sidebar rounded-lg transition-colors cursor-pointer touch-manipulation",
              "py-3.5 px-4 min-h-[52px]",
              "text-destructive hover:text-destructive hover:bg-destructive/10 active:bg-destructive/20"
            )}
          >
            <span className="flex-shrink-0">
              <LogOut className="h-5 w-5 flex-shrink-0" />
            </span>
            <span className="text-base font-medium">
              {t('dashboard.sidebar.logout')}
            </span>
          </button>
          {/* Desktop: Animated logout button */}
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
                  "hidden md:flex items-center justify-start gap-3 group/sidebar py-2.5 px-3 rounded-md transition-colors cursor-pointer min-h-[44px] flex-1",
                  "text-destructive hover:text-destructive hover:bg-destructive/10",
                  "overflow-hidden"
                )}
              >
                <span className="flex-shrink-0">
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                </span>
                <span className="text-sm font-medium group-hover/sidebar:translate-x-1 transition duration-150 whitespace-nowrap">
                  {t('dashboard.sidebar.logout')}
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SidebarBody>
  )
}

function DynamicMainContent({ children, userId }: { children: React.ReactNode; userId: string | null }) {
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
      className="transition-all duration-300 bg-[#F7F7F5] min-h-screen flex flex-col dark:bg-zinc-900"
      style={{
        marginLeft: isMobile ? "0" : `clamp(0px, ${width}px, 100%)`,
      }}
    >
      {/* Header com notificações */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-zinc-200 px-3 py-2 sm:px-4 md:px-5 lg:px-6 xl:px-7 2xl:px-8 dark:bg-zinc-950/95 dark:border-zinc-800">
        <div className="max-w-[1920px] mx-auto flex items-center justify-end gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          {userId && <NotificationBell userId={userId} />}
        </div>
      </header>

      {/* Main content with bg-[#F7F7F5] passing through */}
      <div className="flex-1 px-3 py-4 sm:p-4 md:p-5 lg:p-6 xl:p-7 2xl:p-8 max-w-[1920px] mx-auto w-full">
        {children}
      </div>

      {/* Footer - more compact on mobile */}
      <footer className="border-t border-zinc-200 bg-white py-3 md:py-4 mt-auto dark:bg-zinc-800 dark:border-zinc-700">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-4 md:px-5 lg:px-6 xl:px-7 2xl:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4 text-sm text-zinc-600 dark:text-zinc-400">
            {/* Copyright - smaller on mobile */}
            <p className="text-center md:text-left text-xs md:text-sm order-2 md:order-1">
              © {new Date().getFullYear()} Operium
            </p>

            {/* Social links - larger touch targets on mobile */}
            <div className="flex items-center justify-center gap-2 md:gap-3 order-1 md:order-2">
              <a
                href="mailto:suporte@alnog.com.br"
                className="p-2.5 md:p-2 rounded-full bg-zinc-100 text-zinc-500 hover:bg-blue-100 hover:text-blue-600 active:bg-blue-200 transition-all touch-manipulation dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                title="Suporte por email"
              >
                <Mail className="h-4 w-4" />
              </a>
              <a
                href="https://www.youtube.com/@operiumerp"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 md:p-2 rounded-full bg-zinc-100 text-zinc-500 hover:bg-red-100 hover:text-red-500 active:bg-red-200 transition-all touch-manipulation dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                title="YouTube - Tutoriais"
              >
                <YouTubeIcon className="h-4 w-4" />
              </a>
              <a
                href="https://www.instagram.com/operium.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 md:p-2 rounded-full bg-zinc-100 text-zinc-500 hover:bg-pink-100 hover:text-pink-500 active:bg-pink-200 transition-all touch-manipulation dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-pink-900/30 dark:hover:text-pink-400"
                title="Instagram"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
              <a
                href="https://www.linkedin.com/company/operiumerp"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 md:p-2 rounded-full bg-zinc-100 text-zinc-500 hover:bg-blue-100 hover:text-blue-600 active:bg-blue-200 transition-all touch-manipulation dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
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
