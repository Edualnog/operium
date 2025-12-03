"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import {
    LayoutDashboard,
    Package,
    ArrowLeftRight,
    Users,
    Wrench,
    Settings,
    CreditCard,
    Moon,
    Sun,
    Laptop,
    Search,
    Plus,
    FileText
} from "lucide-react"
import { useTheme } from "next-themes"

export function CommandMenu() {
    const router = useRouter()
    const [open, setOpen] = React.useState(false)
    const { setTheme } = useTheme()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false)
        command()
    }, [])

    return (
        <Command.Dialog
            open={open}
            onOpenChange={setOpen}
            label="Global Command Menu"
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-[20vh]"
            onClick={(e) => {
                if (e.target === e.currentTarget) setOpen(false)
            }}
        >
            <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <Command.Input
                        placeholder="O que você precisa?"
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-50"
                    />
                </div>

                <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
                    <Command.Empty className="py-6 text-center text-sm text-zinc-500">
                        Nenhum resultado encontrado.
                    </Command.Empty>

                    <Command.Group heading="Navegação" className="px-2 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        <Command.Item
                            onSelect={() => runCommand(() => router.push("/dashboard"))}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            <span>Dashboard</span>
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push("/dashboard/estoque"))}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
                        >
                            <Package className="h-4 w-4" />
                            <span>Estoque</span>
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push("/dashboard/movimentacoes"))}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
                        >
                            <ArrowLeftRight className="h-4 w-4" />
                            <span>Movimentações</span>
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push("/dashboard/colaboradores"))}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
                        >
                            <Users className="h-4 w-4" />
                            <span>Colaboradores</span>
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push("/dashboard/ferramentas"))}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
                        >
                            <Wrench className="h-4 w-4" />
                            <span>Ferramentas</span>
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push("/dashboard/conta"))}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
                        >
                            <CreditCard className="h-4 w-4" />
                            <span>Minha Conta</span>
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push("/dashboard/setup"))}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
                        >
                            <Settings className="h-4 w-4" />
                            <span>Configurações</span>
                        </Command.Item>
                    </Command.Group>

                    <Command.Separator className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />

                    <Command.Group heading="Ações Rápidas" className="px-2 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        <Command.Item
                            onSelect={() => runCommand(() => router.push("/dashboard/movimentacoes?new=true"))}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Nova Movimentação</span>
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push("/dashboard/estoque?new=true"))}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Novo Produto</span>
                        </Command.Item>
                    </Command.Group>

                    <Command.Separator className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />

                    <Command.Group heading="Tema" className="px-2 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        <Command.Item
                            onSelect={() => runCommand(() => setTheme("light"))}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
                        >
                            <Sun className="h-4 w-4" />
                            <span>Claro</span>
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => setTheme("dark"))}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
                        >
                            <Moon className="h-4 w-4" />
                            <span>Escuro</span>
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => setTheme("system"))}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
                        >
                            <Laptop className="h-4 w-4" />
                            <span>Sistema</span>
                        </Command.Item>
                    </Command.Group>
                </Command.List>

                <div className="border-t border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-500 flex justify-between">
                    <span>Navegue com ↑↓</span>
                    <span>Enter para selecionar</span>
                </div>
            </div>
        </Command.Dialog>
    )
}
