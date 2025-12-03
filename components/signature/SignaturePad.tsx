"use client"

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Eraser, Check } from "lucide-react"

export interface SignaturePadRef {
  clear: () => void
  isEmpty: () => boolean
  toDataURL: (type?: string) => string
  toBlob: () => Promise<Blob | null>
  fromDataURL: (dataURL: string) => void
}

interface SignaturePadProps {
  width?: number
  height?: number
  className?: string
  penColor?: string
  backgroundColor?: string
  onBegin?: () => void
  onEnd?: () => void
  onChange?: (isEmpty: boolean) => void
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  (
    {
      width = 500,
      height = 200,
      className,
      penColor = "#1e293b",
      backgroundColor = "#f8fafc",
      onBegin,
      onEnd,
      onChange,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasSignature, setHasSignature] = useState(false)
    const lastPoint = useRef<{ x: number; y: number } | null>(null)

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Configurar canvas
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = penColor
      ctx.lineWidth = 2.5
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      // Linha guia para assinatura
      ctx.setLineDash([5, 5])
      ctx.strokeStyle = "#cbd5e1"
      ctx.beginPath()
      ctx.moveTo(20, height - 40)
      ctx.lineTo(width - 20, height - 40)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.strokeStyle = penColor
    }, [width, height, penColor, backgroundColor])

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return null

      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      if ("touches" in e) {
        const touch = e.touches[0]
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        }
      } else {
        return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY,
        }
      }
    }

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      const coords = getCoordinates(e)
      if (!coords) return

      setIsDrawing(true)
      lastPoint.current = coords
      onBegin?.()
    }

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      if (!isDrawing || !lastPoint.current) return

      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!canvas || !ctx) return

      const coords = getCoordinates(e)
      if (!coords) return

      ctx.strokeStyle = penColor
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
      ctx.lineTo(coords.x, coords.y)
      ctx.stroke()

      lastPoint.current = coords

      if (!hasSignature) {
        setHasSignature(true)
        onChange?.(false)
      }
    }

    const stopDrawing = () => {
      if (isDrawing) {
        setIsDrawing(false)
        lastPoint.current = null
        onEnd?.()
      }
    }

    const clear = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!canvas || !ctx) return

      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Redesenhar linha guia
      ctx.setLineDash([5, 5])
      ctx.strokeStyle = "#cbd5e1"
      ctx.beginPath()
      ctx.moveTo(20, height - 40)
      ctx.lineTo(width - 20, height - 40)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.strokeStyle = penColor

      setHasSignature(false)
      onChange?.(true)
    }

    const isEmpty = () => !hasSignature

    const toDataURL = (type = "image/png") => {
      const canvas = canvasRef.current
      return canvas?.toDataURL(type) || ""
    }

    const toBlob = (): Promise<Blob | null> => {
      return new Promise((resolve) => {
        const canvas = canvasRef.current
        if (!canvas) {
          resolve(null)
          return
        }
        canvas.toBlob((blob) => resolve(blob), "image/png")
      })
    }

    const fromDataURL = (dataURL: string) => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!canvas || !ctx) return

      const image = new Image()
      image.onload = () => {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        setHasSignature(true)
        onChange?.(false)
      }
      image.src = dataURL
    }

    useImperativeHandle(ref, () => ({
      clear,
      isEmpty,
      toDataURL,
      toBlob,
      fromDataURL,
    }))

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="relative border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-zinc-900">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="w-full touch-none cursor-crosshair select-none"
            style={{
              maxWidth: "100%",
              height: "auto",
              aspectRatio: `${width}/${height}`,
              minHeight: "150px"
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasSignature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-zinc-400 dark:text-zinc-500 text-xs sm:text-sm">Assine aqui</p>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center gap-2">
          <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 flex-1">
            {hasSignature ? "✓ Assinatura capturada" : (
              <>
                <span className="hidden sm:inline">Use o mouse ou dedo para assinar</span>
                <span className="sm:hidden">Toque e arraste para assinar</span>
              </>
            )}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clear}
            className="gap-1.5 min-h-[36px] text-xs sm:text-sm dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Eraser className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Limpar</span>
            <span className="sm:hidden">✕</span>
          </Button>
        </div>
      </div>
    )
  }
)

SignaturePad.displayName = "SignaturePad"

export default SignaturePad

