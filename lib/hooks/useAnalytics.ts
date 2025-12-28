"use client"

import { useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import {
  ANALYTICS_EVENTS,
  FEATURES,
  type AnalyticsEventName,
  type FeatureName,
  type GamificationPayload,
  type FunnelPayload,
  type ErrorPayload,
} from '@/lib/telemetry/analyticsEvents'

// ============================================================================
// TYPES
// ============================================================================

interface AnalyticsEvent {
  event_name: AnalyticsEventName;
  props: Record<string, unknown>;
  timestamp: string;
}

interface SessionData {
  session_id: string;
  started_at: number;
  pages_viewed: number;
  actions_taken: number;
  last_activity: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SESSION_KEY = 'operium_analytics_session';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 5000; // 5 seconds

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getOrCreateSession(): SessionData {
  if (typeof window === 'undefined') {
    return {
      session_id: 'ssr',
      started_at: Date.now(),
      pages_viewed: 0,
      actions_taken: 0,
      last_activity: Date.now(),
    };
  }

  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const session: SessionData = JSON.parse(stored);

      // Check if session expired
      if (Date.now() - session.last_activity > SESSION_TIMEOUT_MS) {
        // Create new session
        const newSession: SessionData = {
          session_id: generateSessionId(),
          started_at: Date.now(),
          pages_viewed: 0,
          actions_taken: 0,
          last_activity: Date.now(),
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
        return newSession;
      }

      // Update last activity
      session.last_activity = Date.now();
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    }
  } catch {
    // Ignore storage errors
  }

  // Create new session
  const newSession: SessionData = {
    session_id: generateSessionId(),
    started_at: Date.now(),
    pages_viewed: 0,
    actions_taken: 0,
    last_activity: Date.now(),
  };

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
  } catch {
    // Ignore storage errors
  }

  return newSession;
}

function updateSession(updates: Partial<SessionData>): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const session: SessionData = JSON.parse(stored);
      Object.assign(session, updates, { last_activity: Date.now() });
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// EVENT QUEUE
// ============================================================================

let eventQueue: AnalyticsEvent[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

async function flushEvents(): Promise<void> {
  if (eventQueue.length === 0) return;

  const eventsToSend = eventQueue.splice(0, BATCH_SIZE);

  try {
    // Send to backend API
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: eventsToSend }),
      keepalive: true, // Allow request to complete even if page unloads
    });
  } catch {
    // Put events back in queue on failure
    eventQueue.unshift(...eventsToSend);
  }
}

function scheduleFlush(): void {
  if (flushTimeout) return;

  flushTimeout = setTimeout(() => {
    flushTimeout = null;
    flushEvents();
  }, FLUSH_INTERVAL_MS);
}

function queueEvent(event: AnalyticsEvent): void {
  eventQueue.push(event);

  if (eventQueue.length >= BATCH_SIZE) {
    flushEvents();
  } else {
    scheduleFlush();
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useAnalytics() {
  const pathname = usePathname();
  const pageLoadTime = useRef<number>(Date.now());
  const lastPagePath = useRef<string | null>(null);

  // Track page view on route change
  useEffect(() => {
    const session = getOrCreateSession();
    const timeOnPreviousPage = lastPagePath.current
      ? Date.now() - pageLoadTime.current
      : undefined;

    // Track page left (if there was a previous page)
    if (lastPagePath.current && timeOnPreviousPage) {
      queueEvent({
        event_name: ANALYTICS_EVENTS.PAGE_LEFT,
        props: {
          page_path: lastPagePath.current,
          time_on_page_ms: timeOnPreviousPage,
          session_id: session.session_id,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Track page view
    queueEvent({
      event_name: ANALYTICS_EVENTS.PAGE_VIEWED,
      props: {
        page_path: pathname,
        page_title: typeof document !== 'undefined' ? document.title : undefined,
        referrer: lastPagePath.current || undefined,
        time_on_previous_page_ms: timeOnPreviousPage,
        session_id: session.session_id,
      },
      timestamp: new Date().toISOString(),
    });

    // Update session
    updateSession({ pages_viewed: session.pages_viewed + 1 });

    // Update refs
    lastPagePath.current = pathname;
    pageLoadTime.current = Date.now();
  }, [pathname]);

  // Flush events on page unload
  useEffect(() => {
    const handleUnload = () => {
      const session = getOrCreateSession();
      const timeOnPage = Date.now() - pageLoadTime.current;

      // Track session end
      queueEvent({
        event_name: ANALYTICS_EVENTS.SESSION_ENDED,
        props: {
          session_id: session.session_id,
          session_duration_ms: Date.now() - session.started_at,
          pages_viewed: session.pages_viewed,
          actions_taken: session.actions_taken,
        },
        timestamp: new Date().toISOString(),
      });

      // Force flush
      flushEvents();
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // ============================================================================
  // TRACKING METHODS
  // ============================================================================

  const trackFeature = useCallback((
    feature: FeatureName,
    action?: string,
    metadata?: Record<string, unknown>
  ) => {
    const session = getOrCreateSession();
    updateSession({ actions_taken: session.actions_taken + 1 });

    queueEvent({
      event_name: ANALYTICS_EVENTS.FEATURE_USED,
      props: {
        feature,
        action,
        metadata,
        session_id: session.session_id,
      },
      timestamp: new Date().toISOString(),
    });
  }, []);

  const trackGamification = useCallback((payload: GamificationPayload) => {
    const session = getOrCreateSession();

    const eventName = {
      streak: ANALYTICS_EVENTS.STREAK_UPDATED,
      badge: ANALYTICS_EVENTS.BADGE_UNLOCKED,
      level: ANALYTICS_EVENTS.LEVEL_UP,
      score: ANALYTICS_EVENTS.SCORE_CHANGED,
      milestone: ANALYTICS_EVENTS.MILESTONE_REACHED,
    }[payload.event_type];

    queueEvent({
      event_name: eventName,
      props: {
        ...payload,
        session_id: session.session_id,
      },
      timestamp: new Date().toISOString(),
    });
  }, []);

  const trackFunnel = useCallback((payload: FunnelPayload) => {
    const session = getOrCreateSession();

    const eventName = payload.abandoned_reason
      ? ANALYTICS_EVENTS.FUNNEL_ABANDONED
      : payload.step_index === payload.total_steps - 1
        ? ANALYTICS_EVENTS.FUNNEL_STEP_COMPLETED
        : ANALYTICS_EVENTS.FUNNEL_STEP_STARTED;

    queueEvent({
      event_name: eventName,
      props: {
        ...payload,
        session_id: session.session_id,
      },
      timestamp: new Date().toISOString(),
    });
  }, []);

  const trackError = useCallback((payload: ErrorPayload) => {
    const session = getOrCreateSession();

    queueEvent({
      event_name: ANALYTICS_EVENTS.ERROR_OCCURRED,
      props: {
        ...payload,
        page_path: pathname,
        session_id: session.session_id,
      },
      timestamp: new Date().toISOString(),
    });
  }, [pathname]);

  const trackSearch = useCallback((query: string, resultCount: number, filters?: Record<string, unknown>) => {
    const session = getOrCreateSession();

    queueEvent({
      event_name: ANALYTICS_EVENTS.SEARCH_PERFORMED,
      props: {
        query_length: query.length, // Don't store actual query for privacy
        result_count: resultCount,
        has_filters: !!filters,
        session_id: session.session_id,
      },
      timestamp: new Date().toISOString(),
    });
  }, []);

  const trackModal = useCallback((modalName: string, action: 'opened' | 'closed') => {
    const session = getOrCreateSession();

    queueEvent({
      event_name: action === 'opened' ? ANALYTICS_EVENTS.MODAL_OPENED : ANALYTICS_EVENTS.MODAL_CLOSED,
      props: {
        modal_name: modalName,
        session_id: session.session_id,
      },
      timestamp: new Date().toISOString(),
    });
  }, []);

  const trackSettingChange = useCallback((setting: string, value: unknown) => {
    const session = getOrCreateSession();

    queueEvent({
      event_name: ANALYTICS_EVENTS.SETTING_CHANGED,
      props: {
        setting_name: setting,
        new_value: value,
        session_id: session.session_id,
      },
      timestamp: new Date().toISOString(),
    });
  }, []);

  const trackRegistrationMilestone = useCallback((
    type: 'ferramenta' | 'colaborador',
    count: number,
    isMilestone: boolean
  ) => {
    const session = getOrCreateSession();

    queueEvent({
      event_name: isMilestone
        ? ANALYTICS_EVENTS.REGISTRATION_MILESTONE
        : ANALYTICS_EVENTS.REGISTRATION_COMPLETED,
      props: {
        registration_type: type,
        total_count: count,
        is_milestone: isMilestone,
        session_id: session.session_id,
      },
      timestamp: new Date().toISOString(),
    });
  }, []);

  return {
    trackFeature,
    trackGamification,
    trackFunnel,
    trackError,
    trackSearch,
    trackModal,
    trackSettingChange,
    trackRegistrationMilestone,
    // Re-export constants for convenience
    FEATURES,
    ANALYTICS_EVENTS,
  };
}
