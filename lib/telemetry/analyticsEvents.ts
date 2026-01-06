/**
 * ============================================================================
 * ANALYTICS EVENTS - BEHAVIORAL TRACKING
 * ============================================================================
 * Eventos comportamentais para analytics avançado.
 *
 * Categorias:
 * - Navigation: Page views, navegação
 * - Engagement: Tempo em features, interações
 * - Gamification: Streaks, badges, levels
 * - Conversion: Funil de ações
 * - Error: Erros e exceções
 * ============================================================================
 */

// ============================================================================
// EVENT NAMES
// ============================================================================

export const ANALYTICS_EVENTS = {
  // Navigation
  PAGE_VIEWED: 'PAGE_VIEWED',
  PAGE_LEFT: 'PAGE_LEFT',
  TAB_CHANGED: 'TAB_CHANGED',
  MODAL_OPENED: 'MODAL_OPENED',
  MODAL_CLOSED: 'MODAL_CLOSED',

  // Engagement
  FEATURE_USED: 'FEATURE_USED',
  SEARCH_PERFORMED: 'SEARCH_PERFORMED',
  FILTER_APPLIED: 'FILTER_APPLIED',
  SORT_CHANGED: 'SORT_CHANGED',
  EXPORT_REQUESTED: 'EXPORT_REQUESTED',

  // Gamification
  STREAK_UPDATED: 'STREAK_UPDATED',
  STREAK_BROKEN: 'STREAK_BROKEN',
  BADGE_UNLOCKED: 'BADGE_UNLOCKED',
  LEVEL_UP: 'LEVEL_UP',
  SCORE_CHANGED: 'SCORE_CHANGED',
  MILESTONE_REACHED: 'MILESTONE_REACHED',

  // Registration Progress
  REGISTRATION_STARTED: 'REGISTRATION_STARTED',
  REGISTRATION_COMPLETED: 'REGISTRATION_COMPLETED',
  REGISTRATION_MILESTONE: 'REGISTRATION_MILESTONE',

  // Conversion Funnel
  FUNNEL_STEP_STARTED: 'FUNNEL_STEP_STARTED',
  FUNNEL_STEP_COMPLETED: 'FUNNEL_STEP_COMPLETED',
  FUNNEL_ABANDONED: 'FUNNEL_ABANDONED',

  // User Preferences
  SOUND_TOGGLED: 'SOUND_TOGGLED',
  THEME_CHANGED: 'THEME_CHANGED',
  SETTING_CHANGED: 'SETTING_CHANGED',

  // Errors
  ERROR_OCCURRED: 'ERROR_OCCURRED',
  ERROR_BOUNDARY_TRIGGERED: 'ERROR_BOUNDARY_TRIGGERED',
  API_ERROR: 'API_ERROR',

  // Session
  SESSION_STARTED: 'SESSION_STARTED',
  SESSION_ENDED: 'SESSION_ENDED',
  SESSION_RESUMED: 'SESSION_RESUMED',
} as const;

export type AnalyticsEventName = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

// ============================================================================
// FEATURE NAMES
// ============================================================================

export const FEATURES = {
  // Main modules
  DASHBOARD: 'dashboard',
  FERRAMENTAS: 'ferramentas',
  COLABORADORES: 'colaboradores',
  MOVIMENTACOES: 'movimentacoes',
  EQUIPES: 'equipes',
  RANKING: 'ranking',

  // Actions
  CADASTRO_FERRAMENTA: 'cadastro_ferramenta',
  CADASTRO_COLABORADOR: 'cadastro_colaborador',
  RETIRADA: 'retirada',
  DEVOLUCAO: 'devolucao',
  ENTRADA: 'entrada',

  // Gamification
  GAMIFICATION_TOAST: 'gamification_toast',
  CELEBRATION: 'celebration',
  SOUND_EFFECTS: 'sound_effects',
} as const;

export type FeatureName = typeof FEATURES[keyof typeof FEATURES];

// ============================================================================
// FUNNEL DEFINITIONS
// ============================================================================

export const FUNNELS = {
  // Funnel de cadastro de ferramenta
  CADASTRO_FERRAMENTA: {
    name: 'cadastro_ferramenta',
    steps: ['open_modal', 'fill_name', 'fill_quantity', 'submit', 'success'],
  },

  // Funnel de movimentação
  MOVIMENTACAO: {
    name: 'movimentacao',
    steps: ['select_type', 'select_tool', 'select_collaborator', 'confirm', 'success'],
  },

  // Funnel de onboarding
  ONBOARDING: {
    name: 'onboarding',
    steps: ['welcome', 'company_info', 'first_tool', 'first_collaborator', 'complete'],
  },
} as const;

// ============================================================================
// EVENT PAYLOADS
// ============================================================================

export interface PageViewPayload {
  page_path: string;
  page_title?: string;
  referrer?: string;
  time_on_previous_page_ms?: number;
}

export interface FeatureUsedPayload {
  feature: FeatureName;
  action?: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
}

export interface GamificationPayload {
  event_type: 'streak' | 'badge' | 'level' | 'score' | 'milestone';
  previous_value?: number | string;
  new_value: number | string;
  colaborador_id?: string;
  trigger?: string;
}

export interface FunnelPayload {
  funnel_name: string;
  step_name: string;
  step_index: number;
  total_steps: number;
  time_in_step_ms?: number;
  abandoned_reason?: string;
}

export interface ErrorPayload {
  error_type: 'js_error' | 'api_error' | 'validation_error' | 'boundary';
  error_message: string;
  error_stack?: string;
  component_name?: string;
  api_endpoint?: string;
  status_code?: number;
}

export interface SessionPayload {
  session_id: string;
  session_duration_ms?: number;
  pages_viewed?: number;
  actions_taken?: number;
  is_returning_user?: boolean;
}
