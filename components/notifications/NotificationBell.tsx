"use client"

import { useState, useRef, useEffect } from "react"
import { Bell, X, Check, CheckCheck, Package, Shield, Clock, AlertTriangle, RefreshCw } from "lucide-react"
import { useNotifications, Notification } from "@/lib/hooks/useNotifications"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface NotificationBellProps {
  userId: string
}

const tipoIcons = {
  estoque_critico: Package,
  epi_vencendo: Shield,
  devolucao_pendente: Clock,
  sistema: Bell,
}

const tipoColors = {
  estoque_critico: "text-zinc-600 bg-zinc-100",
  epi_vencendo: "text-zinc-600 bg-zinc-100",
  devolucao_pendente: "text-zinc-600 bg-zinc-100",
  sistema: "text-zinc-500 bg-zinc-50",
}

const prioridadeColors = {
  urgente: "border-l-zinc-900",
  alta: "border-l-zinc-600",
  normal: "border-l-zinc-400",
  baixa: "border-l-zinc-200",
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    refreshNotifications,
  } = useNotifications(userId)

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Fechar com ESC
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.lida) {
      markAsRead(notification.id)
    }
  }

  return (
    <div className="relative">
      {/* Botão do sino */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2.5 sm:p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center",
          "hover:bg-zinc-100 active:bg-zinc-200",
          isOpen && "bg-zinc-100"
        )}
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ""}`}
      >
        <Bell className="h-5 w-5 text-zinc-600" />

        {/* Badge de contagem */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Painel de notificações */}
      {isOpen && (
        <div
          ref={panelRef}
          className={cn(
            "absolute right-0 top-full mt-2 z-50",
            "w-[340px] sm:w-[380px] max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)]",
            "bg-white rounded-xl shadow-2xl border border-zinc-200",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
            "duration-200",
            // Mobile: posiciona melhor
            "-right-2 sm:right-0"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-700" />
              <h3 className="font-semibold text-zinc-900 text-sm sm:text-base">Notificações</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshNotifications}
                disabled={loading}
                className="h-8 w-8 p-0"
                title="Atualizar"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-8 px-1.5 sm:px-2 text-[10px] sm:text-xs"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Ler todas</span>
                </Button>
              )}
            </div>
          </div>

          {/* Lista de notificações */}
          <div className="max-h-[60vh] sm:max-h-[400px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
                  <Check className="h-6 w-6 text-zinc-500" />
                </div>
                <p className="text-sm font-medium text-zinc-900">Tudo em dia!</p>
                <p className="text-xs text-zinc-500 text-center mt-1">
                  Nenhum alerta no momento. Continue assim! 👍
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {notifications.map((notification) => {
                  const Icon = tipoIcons[notification.tipo] || Bell
                  const colorClass = tipoColors[notification.tipo] || tipoColors.sistema
                  const prioridadeClass = prioridadeColors[notification.prioridade]

                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "relative px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-colors",
                        "hover:bg-zinc-50 active:bg-zinc-100",
                        "border-l-4",
                        prioridadeClass,
                        !notification.lida && "bg-zinc-50/80"
                      )}
                    >
                      <div className="flex gap-2 sm:gap-3">
                        {/* Ícone */}
                        <div className={cn("flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center", colorClass)}>
                          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </div>

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1 sm:gap-2">
                            <p className={cn(
                              "text-xs sm:text-sm font-medium text-zinc-900 line-clamp-1",
                              !notification.lida && "font-semibold"
                            )}>
                              {notification.titulo}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                dismissNotification(notification.id)
                              }}
                              className="flex-shrink-0 p-1.5 rounded hover:bg-zinc-200 active:bg-zinc-300 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title="Dispensar"
                            >
                              <X className="h-3.5 w-3.5 text-zinc-400" />
                            </button>
                          </div>
                          <p className="text-[10px] sm:text-xs text-zinc-600 mt-0.5 line-clamp-2">
                            {notification.mensagem}
                          </p>
                          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mt-1.5">
                            <span className="text-[9px] sm:text-[10px] text-zinc-400">
                              {formatDistanceToNow(new Date(notification.data_criacao), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                            {notification.prioridade === "urgente" && (
                              <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-4 bg-zinc-900 text-white">
                                <AlertTriangle className="h-2 w-2 sm:h-2.5 sm:w-2.5 mr-0.5" />
                                <span className="hidden sm:inline">Urgente</span>
                                <span className="sm:hidden">!</span>
                              </Badge>
                            )}
                            {notification.prioridade === "alta" && (
                              <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-4 bg-zinc-200 text-zinc-700">
                                <span className="hidden sm:inline">Alta prioridade</span>
                                <span className="sm:hidden">Alta</span>
                              </Badge>
                            )}
                            {!notification.lida && (
                              <span className="w-2 h-2 rounded-full bg-zinc-900" title="Não lida" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-zinc-100 bg-zinc-50/50">
              <p className="text-[10px] text-zinc-500 text-center">
                Alertas atualizados automaticamente a cada 5 minutos
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

