"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Trash2, Loader2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const CONFIRMATION_TEXT = "DELETAR MINHA CONTA"

export function DeleteAccountModal() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [confirmation, setConfirmation] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isConfirmed = confirmation === CONFIRMATION_TEXT

    const handleDelete = async () => {
        if (!isConfirmed) return

        setLoading(true)
        setError(null)

        try {
            const response = await fetch("/api/account/delete", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmation: CONFIRMATION_TEXT }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Erro ao deletar conta")
            }

            // Redirecionar para página de logout/home
            router.push("/")
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar Conta
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Deletar Conta Permanentemente
                    </DialogTitle>
                    <DialogDescription className="space-y-3 pt-2">
                        <p>
                            Esta ação é <strong>irreversível</strong>. Ao deletar sua conta:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Seu acesso será removido imediatamente</li>
                            <li>Você não poderá mais fazer login com este e-mail</li>
                            <li>Dados históricos serão preservados para auditoria</li>
                            <li>Se criar uma nova conta, começará do zero</li>
                        </ul>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        <p className="text-sm text-red-700 dark:text-red-300">
                            Para confirmar, digite:{" "}
                            <code className="bg-red-100 dark:bg-red-800 px-1 rounded font-mono">
                                {CONFIRMATION_TEXT}
                            </code>
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmation">Confirmação</Label>
                        <Input
                            id="confirmation"
                            value={confirmation}
                            onChange={(e) => setConfirmation(e.target.value)}
                            placeholder="Digite a frase de confirmação..."
                            className="font-mono"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 text-sm p-2 rounded">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setOpen(false)
                            setConfirmation("")
                            setError(null)
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={!isConfirmed || loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Deletando...
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Deletar Conta
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
