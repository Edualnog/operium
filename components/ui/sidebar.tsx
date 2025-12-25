"use client";

import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar className={props.className as string}>
        {props.children as React.ReactNode}
      </MobileSidebar>
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.div
      className={cn(
        "h-screen px-3 py-6 hidden md:flex md:flex-col bg-white border-r border-zinc-200 w-[280px] flex-shrink-0 fixed left-0 top-0 overflow-hidden z-50 dark:bg-zinc-950 dark:border-r-0",
        className
      )}
      animate={{
        width: animate ? (open ? "280px" : "70px") : "280px",
      }}
      transition={{
        duration: 0.2,
        ease: "easeInOut",
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();

  return (
    <>
      {/* Mobile Header Bar */}
      <div
        className={cn(
          "h-14 px-4 flex flex-row md:hidden items-center justify-between bg-white/80 backdrop-blur-md border-b border-zinc-200 w-full sticky top-0 z-40 dark:bg-zinc-950/80 dark:border-zinc-800"
        )}
        {...props}
      >
        {/* Logo mobile */}
        <Link href="/dashboard" className="flex items-center gap-2">
          {/* Operium Icon - Geometric brackets */}
          <svg width="32" height="32" viewBox="0 0 100 100" fill="none" className="flex-shrink-0 text-foreground">
            <rect x="10" y="10" width="15" height="40" fill="currentColor" />
            <rect x="10" y="10" width="40" height="15" fill="currentColor" />
            <rect x="50" y="75" width="40" height="15" fill="currentColor" />
            <rect x="75" y="50" width="15" height="40" fill="currentColor" />
          </svg>
          <span className="font-semibold text-foreground tracking-wide">Operium</span>
        </Link>

        {/* Menu button */}
        <button
          className="p-2.5 rounded-lg hover:bg-zinc-100 active:bg-zinc-200 transition-colors touch-manipulation"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          <Menu className="h-6 w-6 text-foreground" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[90] md:hidden backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Sidebar Content */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 200
              }}
              className={cn(
                "fixed h-full w-[280px] left-0 top-0 bg-white p-5 z-[100] flex flex-col shadow-2xl safe-area-inset md:hidden dark:bg-zinc-950",
                className
              )}
            >
              <div className="flex items-center justify-between mb-6">
                <span className="font-semibold text-lg">Menu</span>
                {/* Close button */}
                <button
                  className="p-2 rounded-lg hover:bg-zinc-100 active:bg-zinc-200 transition-colors touch-manipulation"
                  onClick={() => setOpen(!open)}
                  aria-label="Fechar menu"
                >
                  <X className="h-6 w-6 text-foreground" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  active,
  onClick,
  id,
  ...props
}: {
  link: Links;
  className?: string;
  active?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  id?: string;
  props?: LinkProps;
}) => {
  const { open, animate, setOpen } = useSidebar();

  // Fechar menu mobile ao clicar em um link
  const handleMobileClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setOpen(false)
    }
  }

  if (link.href === "#" && onClick) {
    return (
      <a
        href="#"
        id={id}
        onClick={(e) => {
          e.preventDefault()
          onClick(e)
          handleMobileClick()
        }}
        className={cn(
          // Base styles
          "flex items-center justify-start gap-3 group/sidebar rounded-lg transition-colors cursor-pointer touch-manipulation",
          // Mobile: larger touch targets
          "py-3.5 px-4 min-h-[52px] md:py-2.5 md:px-3 md:min-h-[44px] md:rounded-md",
          // Active/inactive states
          active
            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50 font-medium"
            : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900",
          !open && "md:justify-center",
          className
        )}
        {...props}
      >
        <span className="flex-shrink-0">{link.icon}</span>
        <motion.span
          animate={{
            display: animate ? (open ? "inline-block" : "none") : "inline-block",
            opacity: animate ? (open ? 1 : 0) : 1,
            width: animate ? (open ? "auto" : 0) : "auto",
          }}
          transition={{ duration: 0.2 }}
          className="text-base md:text-sm font-medium group-hover/sidebar:translate-x-1 transition duration-150 whitespace-nowrap overflow-hidden"
        >
          {link.label}
        </motion.span>
      </a>
    )
  }

  return (
    <Link
      href={link.href}
      id={id}
      onClick={handleMobileClick}
      className={cn(
        // Base styles
        "flex items-center justify-start gap-3 group/sidebar rounded-lg transition-colors touch-manipulation",
        // Mobile: larger touch targets
        "py-3.5 px-4 min-h-[52px] md:py-2.5 md:px-3 md:min-h-[44px] md:rounded-md",
        // Active/inactive states
        active
          ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50 font-medium"
          : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900",
        !open && "md:justify-center",
        className
      )}
      {...props}
    >
      <span className="flex-shrink-0">{link.icon}</span>
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
          width: animate ? (open ? "auto" : 0) : "auto",
        }}
        transition={{ duration: 0.2 }}
        className="text-base md:text-sm font-medium group-hover/sidebar:translate-x-1 transition duration-150 whitespace-nowrap overflow-hidden"
      >
        {link.label}
      </motion.span>
    </Link>
  );
};

