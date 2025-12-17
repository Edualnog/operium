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
    const [isInitializing, setIsInitializing] = useState(true)
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
        // Use a larger timeout on mobile to ensure DOM is ready
        const timer = setTimeout(() => {
            try {
                // Check if element exists
                const readerElement = document.getElementById("qr-reader")
                if (!readerElement) {
                    console.error("Reader element not found")
                    setError("Erro ao inicializar o scanner.")
                    setIsInitializing(false)
                    return
                }

                const scanner = new Html5QrcodeScanner(
                    "qr-reader",
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                        formatsToSupport: [
                            Html5QrcodeSupportedFormats.QR_CODE,
                            Html5QrcodeSupportedFormats.CODE_128,
                            Html5QrcodeSupportedFormats.CODE_39,
                            Html5QrcodeSupportedFormats.EAN_13,
                            Html5QrcodeSupportedFormats.EAN_8
                        ],
                        experimentalFeatures: {
                            useBarCodeDetectorIfSupported: true
                        }
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
                setIsInitializing(false)

            } catch (err: any) {
                console.error("Error initializing scanner:", err)
                setError("Erro ao iniciar câmera. Verifique permissões.")
                setIsInitializing(false)
            }
        }, 300) // Increased delay for mobile

        return () => {
            clearTimeout(timer)
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    console.error("Failed to clear html5-qrcode scanner during cleanup", error)
                })
                scannerRef.current = null
            }
        }
    }, [handleClose])

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
            {/* Close button */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 text-white hover:bg-white/20 h-12 w-12"
                onClick={handleClose}
            >
                <X className="h-7 w-7" />
            </Button>

            {/* Title */}
            {title && (
                <h3 className="text-lg sm:text-xl font-semibold mb-4 text-center text-white px-4">
                    {title}
                </h3>
            )}

            {/* Scanner container */}
            <div className="w-full max-w-md relative">
                {isInitializing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                    </div>
                )}
                <div
                    id="qr-reader"
                    className="w-full overflow-hidden rounded-lg bg-black"
                ></div>
            </div>

            {/* Description */}
            <p className="mt-4 text-center text-sm text-gray-300 px-6 max-w-md">
                {description || "Aponte a câmera para o código QR ou de barras."}
            </p>

            {/* Error */}
            {error && (
                <div className="mt-4 text-red-400 font-medium bg-red-950/50 p-3 rounded-lg mx-4 text-center">
                    {error}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-white hover:bg-white/10"
                        onClick={() => window.location.reload()}
                    >
                        Tentar novamente
                    </Button>
                </div>
            )}

            <style jsx global>{`
                #qr-reader {
                    border: none !important;
                }
                #qr-reader__scan_region {
                    background: rgba(0,0,0,0.5);
                }
                #qr-reader__dashboard {
                    padding: 12px !important;
                }
                #qr-reader__dashboard_section_csr span {
                    display: none !important;
                }
                #qr-reader__dashboard_section_swaplink {
                    text-decoration: none !important;
                    color: white !important;
                    background: rgba(255,255,255,0.1) !important;
                    border: 1px solid rgba(255,255,255,0.3) !important;
                    padding: 8px 16px !important;
                    border-radius: 8px !important;
                    font-size: 14px !important;
                    display: inline-block !important;
                    margin-top: 8px !important;
                }
                #qr-reader video {
                    border-radius: 8px !important;
                }
                #qr-reader__status_span {
                    color: white !important;
                }
                /* Hide file input section on mobile for cleaner UI */
                @media (max-width: 640px) {
                    #qr-reader__dashboard_section_fsr {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    )
}
