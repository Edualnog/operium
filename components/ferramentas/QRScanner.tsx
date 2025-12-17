"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface QRScannerProps {
    onScan: (decodedText: string) => void
    onClose: () => void
    title?: string
    description?: string
}

export function QRScanner({ onScan, onClose, title, description }: QRScannerProps) {
    const [error, setError] = useState<string | null>(null)
    const scannerRef = useRef<Html5QrcodeScanner | null>(null)
    const onScanRef = useRef(onScan)
    const isClosingRef = useRef(false)

    // Keep the callback ref updated without triggering re-initialization
    useEffect(() => {
        onScanRef.current = onScan
    }, [onScan])

    const handleClose = useCallback(() => {
        if (isClosingRef.current) return
        isClosingRef.current = true

        // Clear the scanner first
        if (scannerRef.current) {
            scannerRef.current.clear()
                .then(() => {
                    scannerRef.current = null
                    onClose()
                })
                .catch((err) => {
                    console.error("Failed to clear scanner:", err)
                    scannerRef.current = null
                    onClose()
                })
        } else {
            onClose()
        }
    }, [onClose])

    useEffect(() => {
        // Initialize scanner
        // Use a small timeout to ensure DOM is ready inside the Dialog
        const timer = setTimeout(() => {
            try {
                // Check if element exists
                const readerElement = document.getElementById("reader")
                if (!readerElement) {
                    console.error("Reader element not found")
                    return
                }

                const scanner = new Html5QrcodeScanner(
                    "reader",
                    {
                        fps: 5,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
                    },
                /* verbose= */ false
                )

                scanner.render(
                    (decodedText) => {
                        // Success callback - use the ref to get latest callback
                        onScanRef.current(decodedText)
                        // Clear scanner and close
                        handleClose()
                    },
                    (errorMessage) => {
                        // Parse error, usually harmless "no QR code found"
                        // console.log(errorMessage)
                    }
                )

                scannerRef.current = scanner

            } catch (err: any) {
                console.error("Error initializing scanner:", err)
                setError("Erro ao iniciar câmera. Verifique permissões.")
            }
        }, 100)

        return () => {
            clearTimeout(timer)
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    console.error("Failed to clear html5-qrcode scanner during cleanup", error)
                })
                scannerRef.current = null
            }
        }
    }, [handleClose]) // Empty dependency array to only run once

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-black text-white rounded-lg relative min-h-[400px]">
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
                onClick={handleClose}
            >
                <X className="h-6 w-6" />
            </Button>

            {title && <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>}

            <div id="reader" className="w-full max-w-sm overflow-hidden rounded-lg bg-black text-white [&>div]:!border-0 !sm:w-[300px]"></div>

            <p className="mt-4 text-center text-sm text-gray-300">
                {description || "Aponte a câmera para o código QR da ferramenta."}
            </p>

            {error && (
                <div className="mt-4 text-red-500 font-medium bg-red-950/50 p-2 rounded">
                    {error}
                </div>
            )}

            <style jsx global>{`
        #reader__scan_region {
            background: rgba(0,0,0,0.5);
        }
        #reader__dashboard_section_csr span {
            display: none !important;
        }
        /* Hide the select camera dropdown or style it */
        #reader__dashboard_section_swaplink {
            text-decoration: none !important;
            color: white !important;
            border: 1px solid white;
            padding: 4px 8px;
            border-radius: 4px;
        }
      `}</style>
        </div>
    )
}
