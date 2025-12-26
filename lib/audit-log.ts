/**
 * ============================================================================
 * AUDIT LOGGING - Registro de ações sensíveis
 * ============================================================================
 * 
 * Sistema de logging para compliance e segurança.
 * Registra ações críticas como:
 * - Criação/deleção de usuários
 * - Alterações de permissões
 * - Operações administrativas
 */

import { createServerComponentClient } from '@/lib/supabase-server'

export type AuditAction =
    | 'USER_CREATED'
    | 'USER_DELETED'
    | 'USER_ROLE_CHANGED'
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'PASSWORD_CHANGED'
    | 'PERMISSION_GRANTED'
    | 'PERMISSION_REVOKED'
    | 'BULK_OPERATION'
    | 'DATA_EXPORT'
    | 'SETTINGS_CHANGED'

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

interface AuditLogEntry {
    action: AuditAction
    severity: AuditSeverity
    actor_id: string  // ID do usuário que executou a ação
    target_id?: string  // ID do recurso afetado (usuário, item, etc)
    target_type?: string  // Tipo do recurso (user, tool, team, etc)
    org_id?: string  // ID da organização
    metadata?: Record<string, any>  // Dados adicionais
    ip_address?: string
    user_agent?: string
}

/**
 * Registra uma ação no log de auditoria
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
    try {
        const supabase = await createServerComponentClient()

        const { error } = await supabase
            .from('audit_logs')
            .insert({
                action: entry.action,
                severity: entry.severity,
                actor_id: entry.actor_id,
                target_id: entry.target_id,
                target_type: entry.target_type,
                org_id: entry.org_id,
                metadata: entry.metadata || {},
                ip_address: entry.ip_address,
                user_agent: entry.user_agent,
                created_at: new Date().toISOString(),
            })

        if (error) {
            // Não falhar a operação principal por causa do log
            console.error('[AUDIT] Failed to log:', error)
        }
    } catch (err) {
        console.error('[AUDIT] Exception:', err)
    }
}

/**
 * Helper para extrair informações do request
 */
export function getAuditContext(request: Request) {
    return {
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
    }
}

/**
 * Convenience functions para ações comuns
 */
export const auditLog = {
    userCreated: (actorId: string, targetId: string, orgId: string, request?: Request) =>
        logAudit({
            action: 'USER_CREATED',
            severity: 'INFO',
            actor_id: actorId,
            target_id: targetId,
            target_type: 'user',
            org_id: orgId,
            ...(request && getAuditContext(request)),
        }),

    userDeleted: (actorId: string, targetId: string, orgId: string, request?: Request) =>
        logAudit({
            action: 'USER_DELETED',
            severity: 'WARNING',
            actor_id: actorId,
            target_id: targetId,
            target_type: 'user',
            org_id: orgId,
            ...(request && getAuditContext(request)),
        }),

    loginFailed: (email: string, reason: string, request?: Request) =>
        logAudit({
            action: 'LOGIN_FAILED',
            severity: 'WARNING',
            actor_id: 'anonymous',
            target_type: 'auth',
            metadata: { email_hash: hashEmail(email), reason },
            ...(request && getAuditContext(request)),
        }),

    permissionChanged: (actorId: string, targetId: string, orgId: string, oldRole: string, newRole: string, request?: Request) =>
        logAudit({
            action: 'USER_ROLE_CHANGED',
            severity: 'CRITICAL',
            actor_id: actorId,
            target_id: targetId,
            target_type: 'user',
            org_id: orgId,
            metadata: { old_role: oldRole, new_role: newRole },
            ...(request && getAuditContext(request)),
        }),
}

/**
 * Hash simples para logs (não expor emails em logs)
 */
function hashEmail(email: string): string {
    const [local, domain] = email.split('@')
    if (!local || !domain) return '***'
    return `${local.substring(0, 2)}***@${domain}`
}
