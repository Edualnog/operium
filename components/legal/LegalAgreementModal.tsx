"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { acceptLegalDocuments, checkLegalStatus, LegalStatus } from "@/lib/actions-legal"
import { LEGAL_CONTENT } from "@/lib/legal-constants"
import ReactMarkdown from "react-markdown"
import { AlertCircle, FileText, Lock, Shield } from "lucide-react"
import { toast } from "sonner"

export function LegalAgreementModal() {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    const [agreements, setAgreements] = useState({
        terms: false,
        privacy: false,
        data: false
    })

    const [activeTab, setActiveTab] = useState("terms")

    useEffect(() => {
        checkStatus()
    }, [])

    async function checkStatus() {
        try {
            const status = await checkLegalStatus()
            if (!status.allAccepted) {
                setIsOpen(true)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    async function handleAccept() {
        setSubmitting(true)
        try {
            await acceptLegalDocuments()
            setIsOpen(false)
            toast.success("Documentos aceitos com sucesso!")
        } catch (e) {
            toast.error("Erro ao salvar aceite. Tente novamente.")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return null // Or a small spinner, but cleaner strictly to show nothing until known

    const allChecked = agreements.terms && agreements.privacy && agreements.data

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col sm:max-h-[800px] gap-0 p-0 [&>button]:hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary" />
                        Atualização de Termos e Privacidade
                    </DialogTitle>
                    <DialogDescription>
                        Para continuar usando o Almox Fácil com segurança e transparência, precisamos que você leia e aceite nossos novos documentos alinhados à LGPD e práticas industriais.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row border-t border-b bg-muted/30">
                    <div className="w-full md:w-64 p-4 border-r bg-white space-y-4">
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Documentos Pendentes</h3>

                        <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full">
                            <TabsList className="flex flex-col h-auto bg-transparent gap-2">
                                <TabsTrigger
                                    value="terms"
                                    className="w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                                >
                                    <FileText className="w-4 h-4" /> Termos de Uso
                                </TabsTrigger>
                                <TabsTrigger
                                    value="privacy"
                                    className="w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                                >
                                    <Lock className="w-4 h-4" /> Privacidade
                                </TabsTrigger>
                                <TabsTrigger
                                    value="data"
                                    className="w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                                >
                                    <AlertCircle className="w-4 h-4" /> Data & Analytcs
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="mt-8 space-y-4">
                            <div className="flex items-start space-x-2">
                                <Checkbox
                                    id="check-terms"
                                    checked={agreements.terms}
                                    onCheckedChange={(c) => setAgreements(prev => ({ ...prev, terms: !!c }))}
                                />
                                <Label htmlFor="check-terms" className="text-sm font-normal leading-tight cursor-pointer">
                                    Li e concordo com os Termos de Uso
                                </Label>
                            </div>

                            <div className="flex items-start space-x-2">
                                <Checkbox
                                    id="check-privacy"
                                    checked={agreements.privacy}
                                    onCheckedChange={(c) => setAgreements(prev => ({ ...prev, privacy: !!c }))}
                                />
                                <Label htmlFor="check-privacy" className="text-sm font-normal leading-tight cursor-pointer">
                                    Li e concordo com a Política de Privacidade
                                </Label>
                            </div>

                            <div className="flex items-start space-x-2">
                                <Checkbox
                                    id="check-data"
                                    checked={agreements.data}
                                    onCheckedChange={(c) => setAgreements(prev => ({ ...prev, data: !!c }))}
                                />
                                <Label htmlFor="check-data" className="text-sm font-normal leading-tight cursor-pointer">
                                    Li e concordo com a Política de Dados
                                </Label>
                            </div>
                        </div>

                    </div>

                    <div className="flex-1 overflow-hidden bg-white relative">
                        <ScrollArea className="h-full w-full p-6">
                            <article className="prose prose-sm prose-gray max-w-none dark:prose-invert">
                                <Tabs value={activeTab}>
                                    <TabsContent value="terms" className="mt-0">
                                        <ReactMarkdown>{LEGAL_CONTENT.TERMS}</ReactMarkdown>
                                    </TabsContent>
                                    <TabsContent value="privacy" className="mt-0">
                                        <ReactMarkdown>{LEGAL_CONTENT.PRIVACY}</ReactMarkdown>
                                    </TabsContent>
                                    <TabsContent value="data" className="mt-0">
                                        <ReactMarkdown>{LEGAL_CONTENT.DATA_POLICY}</ReactMarkdown>
                                    </TabsContent>
                                </Tabs>
                            </article>
                        </ScrollArea>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-white border-t">
                    <Button
                        onClick={handleAccept}
                        disabled={!allChecked || submitting}
                        className="w-full md:w-auto"
                        size="lg"
                    >
                        {submitting ? "Salvando..." : "Confirmar Aceite e Continuar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
